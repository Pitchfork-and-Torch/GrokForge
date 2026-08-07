/**
 * Shared contribution moderation for UI server-actions and founder Agent API.
 */
import { revalidatePath } from "next/cache";
import { LedgerKind, TaskStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { rateLimitAsync } from "@/lib/rate-limit";
import { notifyUser } from "@/lib/notify";
import { isFounderHandle } from "@/lib/identity";
import { syncProjectCompletionStatus } from "@/lib/project-completion";

type Actor = {
  id: string;
  handle: string | null;
  name: string | null;
};

function revalidateModSurfaces(slug: string, contributionId: string) {
  revalidatePath(`/projects/${slug}`);
  revalidatePath("/dashboard");
  revalidatePath("/leaderboard");
  revalidatePath("/");
  revalidatePath("/projects");
  revalidatePath(`/c/${contributionId}`);
}

/**
 * Creator of the project OR founder may accept/reject pending submissions.
 * Founder path is for elevated Agent API / platform ops.
 */
export async function moderateContributionForUser(
  user: Actor,
  contributionId: string,
  decision: "accept" | "reject",
  notes?: string,
  opts?: { via?: "ui" | "api"; founderOverride?: boolean }
): Promise<{ ok: true; accepted: boolean } | { error: string }> {
  const rl = await rateLimitAsync(`moderation:${user.id}`, {
    limit: 80,
    windowMs: 60 * 60 * 1000,
  });
  if (!rl.ok) return { error: `Rate limit: try again in ${rl.retryAfterSec}s` };

  const contribution = await prisma.contribution.findUnique({
    where: { id: contributionId },
    include: {
      task: { include: { project: true } },
      user: { select: { id: true, handle: true } },
    },
  });
  if (!contribution) return { error: "Not found" };
  if (contribution.status !== "PENDING") {
    return { error: "Only pending submissions can be moderated" };
  }

  const isCreator = contribution.task.project.proposerId === user.id;
  const isFounder = isFounderHandle(user.handle);
  if (!isCreator && !(opts?.founderOverride && isFounder)) {
    return { error: "Only the project creator or founder can moderate here" };
  }

  const accepted = decision === "accept";
  const score = accepted ? 5 : 2;
  const role = isCreator ? "creator" : "founder";

  await prisma.contribution.update({
    where: { id: contributionId },
    data: {
      status: accepted ? "ACCEPTED" : "REJECTED",
      score,
    },
  });

  await prisma.task.update({
    where: { id: contribution.taskId },
    data: { status: accepted ? TaskStatus.ACCEPTED : TaskStatus.OPEN },
  });

  if (accepted) {
    await prisma.user.update({
      where: { id: contribution.userId },
      data: { reputation: { increment: 5 } },
    });
  }

  if (contribution.userId !== user.id) {
    try {
      await prisma.contributionReview.create({
        data: {
          contributionId,
          reviewerId: user.id,
          score,
          notes:
            (notes || "").slice(0, 2000) ||
            `${role} ${accepted ? "accept" : "reject"}`,
        },
      });
    } catch {
      /* unique or race - non-fatal */
    }
  }

  await prisma.ledgerEntry.create({
    data: {
      projectId: contribution.task.projectId,
      kind: LedgerKind.LABOR,
      amountCents: 0,
      summary: `@${user.handle || user.name} ${role}-${accepted ? "accepted" : "rejected"} "${contribution.task.title}" by @${contribution.user.handle || "builder"}`,
      actorHandle: user.handle,
      meta: JSON.stringify({
        contributionId,
        decision,
        via: opts?.via || "ui",
        founderMod: !isCreator && isFounder,
        creatorMod: isCreator,
      }),
    },
  });

  if (contribution.userId !== user.id) {
    await notifyUser({
      userId: contribution.userId,
      type: accepted ? "ACCEPTED" : "REJECTED",
      title: accepted
        ? `Accepted: ${contribution.task.title}`
        : `Needs more work: ${contribution.task.title}`,
      body: accepted
        ? `${role === "founder" ? "Founder" : "Project creator"} accepted your submission (+5 rep)`
        : `${role === "founder" ? "Founder" : "Project creator"} asked for another pass - task reopened`,
      href: `/c/${contribution.id}`,
    });
  }

  await syncProjectCompletionStatus(contribution.task.projectId, {
    actorHandle: user.handle,
  });

  revalidateModSurfaces(contribution.task.project.slug, contribution.id);
  return { ok: true, accepted };
}

export async function bulkAcceptPendingForUser(
  user: Actor,
  projectId: string,
  opts?: { via?: "ui" | "api"; founderOverride?: boolean }
): Promise<{ ok: true; accepted: number } | { error: string }> {
  const rl = await rateLimitAsync(`bulk-accept:${user.id}`, {
    limit: 20,
    windowMs: 60 * 60 * 1000,
  });
  if (!rl.ok) return { error: `Rate limit: try again in ${rl.retryAfterSec}s` };

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true, slug: true, title: true, proposerId: true },
  });
  if (!project) return { error: "Project not found" };

  const isCreator = project.proposerId === user.id;
  const isFounder = isFounderHandle(user.handle);
  if (!isCreator && !(opts?.founderOverride && isFounder)) {
    return { error: "Only the project creator or founder can bulk-accept" };
  }

  const pending = await prisma.contribution.findMany({
    where: {
      status: "PENDING",
      task: { projectId },
    },
    include: {
      task: { select: { id: true, title: true } },
      user: { select: { id: true, handle: true } },
    },
    take: 50,
  });
  if (pending.length === 0) return { error: "No pending submissions" };

  const role = isCreator ? "creator" : "founder";
  let accepted = 0;
  for (const contribution of pending) {
    await prisma.contribution.update({
      where: { id: contribution.id },
      data: { status: "ACCEPTED", score: 5 },
    });
    await prisma.task.update({
      where: { id: contribution.taskId },
      data: { status: TaskStatus.ACCEPTED },
    });
    await prisma.user.update({
      where: { id: contribution.userId },
      data: { reputation: { increment: 5 } },
    });
    if (contribution.userId !== user.id) {
      try {
        await prisma.contributionReview.create({
          data: {
            contributionId: contribution.id,
            reviewerId: user.id,
            score: 5,
            notes: `${role} bulk accept`,
          },
        });
      } catch {
        /* non-fatal */
      }
      await notifyUser({
        userId: contribution.userId,
        type: "ACCEPTED",
        title: `Accepted: ${contribution.task.title}`,
        body: `${role === "founder" ? "Founder" : "Project creator"} accepted your submission (+5 rep)`,
        href: `/c/${contribution.id}`,
      });
    }
    accepted += 1;
  }

  await prisma.ledgerEntry.create({
    data: {
      projectId,
      kind: LedgerKind.LABOR,
      amountCents: 0,
      summary: `@${user.handle || user.name} ${role} bulk-accepted ${accepted} pending submission(s) on "${project.title}"`,
      actorHandle: user.handle,
      meta: JSON.stringify({
        bulkAccept: true,
        count: accepted,
        via: opts?.via || "ui",
        contributionIds: pending.map((p) => p.id),
        founderMod: !isCreator && isFounder,
      }),
    },
  });

  await syncProjectCompletionStatus(projectId, { actorHandle: user.handle });

  revalidatePath(`/projects/${project.slug}`);
  revalidatePath("/dashboard");
  revalidatePath("/leaderboard");
  revalidatePath("/");
  revalidatePath("/projects");
  return { ok: true, accepted };
}
