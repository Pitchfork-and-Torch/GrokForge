/**
 * Shared claim / release / submit logic for browser server-actions and Agent API.
 */
import { revalidatePath } from "next/cache";
import { LedgerKind, TaskStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { rateLimitAsync } from "@/lib/rate-limit";
import { notifyProjectWatchers, notifyUser } from "@/lib/notify";

type Actor = {
  id: string;
  handle: string | null;
  name: string | null;
};

function actorLabel(user: Actor) {
  return user.handle || user.name || "builder";
}

function revalidateTaskSurfaces(slug: string, contributionId?: string) {
  revalidatePath(`/projects/${slug}`);
  revalidatePath("/dashboard");
  revalidatePath("/tasks");
  if (contributionId) revalidatePath(`/c/${contributionId}`);
}

export async function claimTaskForUser(
  user: Actor,
  taskId: string
): Promise<{ ok: true; claimId: string; expiresAt: Date } | { error: string }> {
  const rl = await rateLimitAsync(`claim:${user.id}`, {
    limit: 40,
    windowMs: 60 * 60 * 1000,
  });
  if (!rl.ok) return { error: `Rate limit: try again in ${rl.retryAfterSec}s` };

  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: { project: true },
  });
  if (!task) return { error: "Task not found" };
  if (task.status !== TaskStatus.OPEN) return { error: "Task is not open" };

  const activeClaims = await prisma.taskClaim.count({
    where: { userId: user.id, active: true, task: { projectId: task.projectId } },
  });
  if (activeClaims >= 3) {
    return {
      error: "Capacity guard: max 3 active claims per project (rate-limit friendly).",
    };
  }

  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);

  const claim = await prisma.taskClaim.create({
    data: {
      taskId: task.id,
      userId: user.id,
      expiresAt,
      active: true,
    },
  });

  await prisma.$transaction([
    prisma.task.update({
      where: { id: task.id },
      data: { status: TaskStatus.CLAIMED },
    }),
    prisma.ledgerEntry.create({
      data: {
        projectId: task.projectId,
        kind: LedgerKind.LABOR,
        amountCents: 0,
        summary: `@${actorLabel(user)} claimed "${task.title}"`,
        actorHandle: user.handle,
        meta: JSON.stringify({ via: "api-or-ui", claimId: claim.id }),
      },
    }),
  ]);

  if (task.project.proposerId !== user.id) {
    await notifyUser({
      userId: task.project.proposerId,
      type: "CLAIM",
      title: `Task claimed on ${task.project.title}`,
      body: `@${actorLabel(user)} claimed "${task.title}"`,
      href: `/projects/${task.project.slug}#task-${task.id}`,
    });
  }
  await notifyProjectWatchers({
    projectId: task.projectId,
    excludeUserIds: [user.id, task.project.proposerId],
    type: "WATCH_CLAIM",
    title: `Watched: ${task.project.title}`,
    body: `@${actorLabel(user)} claimed "${task.title}"`,
    href: `/projects/${task.project.slug}#task-${task.id}`,
  });

  revalidateTaskSurfaces(task.project.slug);
  return { ok: true, claimId: claim.id, expiresAt };
}

export async function releaseClaimForUser(
  user: Actor,
  taskId: string
): Promise<{ ok: true } | { error: string }> {
  const rl = await rateLimitAsync(`cancel-claim:${user.id}`, {
    limit: 40,
    windowMs: 60 * 60 * 1000,
  });
  if (!rl.ok) return { error: `Rate limit: try again in ${rl.retryAfterSec}s` };

  const claim = await prisma.taskClaim.findFirst({
    where: { taskId, userId: user.id, active: true },
    include: { task: { include: { project: true } } },
  });
  if (!claim) return { error: "No active claim found for this task" };

  const otherActive = await prisma.taskClaim.count({
    where: {
      taskId,
      active: true,
      id: { not: claim.id },
    },
  });

  await prisma.$transaction([
    prisma.taskClaim.update({
      where: { id: claim.id },
      data: { active: false },
    }),
    prisma.task.update({
      where: { id: taskId },
      data: {
        status: otherActive > 0 ? TaskStatus.CLAIMED : TaskStatus.OPEN,
      },
    }),
    prisma.ledgerEntry.create({
      data: {
        projectId: claim.task.projectId,
        kind: LedgerKind.LABOR,
        amountCents: 0,
        summary: `@${actorLabel(user)} released claim on "${claim.task.title}"`,
        actorHandle: user.handle,
      },
    }),
  ]);

  if (claim.task.project.proposerId !== user.id) {
    await notifyUser({
      userId: claim.task.project.proposerId,
      type: "RELEASE",
      title: `Claim released on ${claim.task.project.title}`,
      body: `@${actorLabel(user)} released "${claim.task.title}"`,
      href: `/projects/${claim.task.project.slug}#task-${claim.task.id}`,
    });
  }
  await notifyProjectWatchers({
    projectId: claim.task.projectId,
    excludeUserIds: [user.id, claim.task.project.proposerId],
    type: "WATCH_RELEASE",
    title: `Watched: ${claim.task.project.title}`,
    body: `@${actorLabel(user)} released claim on "${claim.task.title}"`,
    href: `/projects/${claim.task.project.slug}#task-${claim.task.id}`,
  });

  revalidateTaskSurfaces(claim.task.project.slug);
  return { ok: true };
}

export async function submitContributionForUser(
  user: Actor,
  input: {
    taskId: string;
    body: string;
    sources?: string;
    contentType?: string;
  }
): Promise<
  | { ok: true; contributionId: string; receiptPath: string }
  | { error: string }
> {
  const rl = await rateLimitAsync(`submit:${user.id}`, {
    limit: 40,
    windowMs: 60 * 60 * 1000,
  });
  if (!rl.ok) return { error: `Rate limit: try again in ${rl.retryAfterSec}s` };

  const taskId = input.taskId;
  const body = input.body;
  const sources = input.sources || "";
  const contentType = input.contentType || "markdown";

  if (!taskId || body.trim().length < 20) {
    return { error: "Submission needs a task and at least 20 characters of body." };
  }
  if (body.length > 200_000) {
    return { error: "Submission body is too large (max ~200k characters)." };
  }

  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: {
      project: true,
      claims: {
        where: { userId: user.id, active: true },
        orderBy: { claimedAt: "desc" },
        take: 1,
      },
    },
  });
  if (!task) return { error: "Task not found" };
  if (!["CLAIMED", "OPEN", "SUBMITTED"].includes(task.status)) {
    return {
      error: `Task status is ${task.status} and is not accepting new submissions.`,
    };
  }

  let claimId: string | null = task.claims[0]?.id ?? null;
  if (!claimId && task.status === TaskStatus.OPEN) {
    const claim = await prisma.taskClaim.create({
      data: {
        taskId: task.id,
        userId: user.id,
        active: true,
        expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
      },
    });
    claimId = claim.id;
  }
  if (!claimId && task.status !== TaskStatus.OPEN) {
    const anyActive = await prisma.taskClaim.findFirst({
      where: { taskId: task.id, userId: user.id },
      orderBy: { claimedAt: "desc" },
    });
    claimId = anyActive?.id ?? null;
  }

  const contribution = await prisma.contribution.create({
    data: {
      taskId: task.id,
      claimId: claimId || null,
      userId: user.id,
      body,
      sources: sources || null,
      contentType,
      status: "PENDING",
    },
  });

  if (claimId) {
    await prisma.taskClaim.updateMany({
      where: { id: claimId, active: true },
      data: { active: false },
    });
  }

  await prisma.task.update({
    where: { id: task.id },
    data: { status: TaskStatus.SUBMITTED },
  });

  await prisma.artifact.create({
    data: {
      projectId: task.projectId,
      contributionId: contribution.id,
      title: `Submission: ${task.title}`,
      url: `/c/${contribution.id}`,
      license: task.project.license,
    },
  });

  await prisma.ledgerEntry.create({
    data: {
      projectId: task.projectId,
      kind: LedgerKind.LABOR,
      amountCents: 0,
      summary: `@${actorLabel(user)} submitted work on "${task.title}"`,
      actorHandle: user.handle,
      meta: JSON.stringify({ contributionId: contribution.id }),
    },
  });

  await prisma.user.update({
    where: { id: user.id },
    data: { reputation: { increment: 1 } },
  });

  try {
    if (task.project.proposerId !== user.id) {
      await notifyUser({
        userId: task.project.proposerId,
        type: "SUBMISSION",
        title: `New submission on ${task.project.title}`,
        body: `@${actorLabel(user)} submitted work on "${task.title}"`,
        href: `/c/${contribution.id}`,
      });
    }
    await notifyProjectWatchers({
      projectId: task.projectId,
      excludeUserIds: [user.id, task.project.proposerId],
      type: "WATCH_SUBMISSION",
      title: `Watched: ${task.project.title}`,
      body: `@${actorLabel(user)} submitted work on "${task.title}"`,
      href: `/c/${contribution.id}`,
    });
  } catch (notifyErr) {
    console.error("[submit] notify non-fatal", notifyErr);
  }

  revalidateTaskSurfaces(task.project.slug, contribution.id);
  return {
    ok: true,
    contributionId: contribution.id,
    receiptPath: `/c/${contribution.id}`,
  };
}
