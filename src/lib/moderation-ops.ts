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
  revalidatePath(`/projects/${slug}/cockpit`);
  revalidatePath("/cockpit");
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
      reviews: { select: { id: true, reviewerId: true, score: true } },
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

  // Hard dual-key gate for large leaves when project requires it
  if (accepted) {
    const proj = contribution.task.project as {
      requireDualKey?: boolean;
      dualKeyTokenThreshold?: number;
    };
    const requireDual = !!proj.requireDualKey;
    const threshold = proj.dualKeyTokenThreshold ?? 50_000;
    const large =
      (contribution.task.estimatedTokens || 0) >= threshold || threshold <= 0;
    if (requireDual && large) {
      // Peer reviews from someone other than author (creator accept review later doesn't count)
      const peerCount = contribution.reviews.filter(
        (r) => r.reviewerId !== contribution.userId
      ).length;
      const force =
        opts?.founderOverride &&
        isFounder &&
        String(notes || "").toLowerCase().includes("force dual");
      if (peerCount < 1 && !force) {
        return {
          error: `Dual-key required: need ≥1 peer review before accept on leaves ≥${threshold} tokens (has ${peerCount}). Founder may pass notes containing "force dual".`,
        };
      }
    }
  }

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

  if (accepted) {
    // Thin leaf-ready webhook when deps unlock new OPEN leaves
    try {
      await emitLeafReadyIfAny(contribution.task.projectId, contribution.task.project.slug);
    } catch (e) {
      console.error("[moderation] leaf-ready webhook", e);
    }
  }

  revalidateModSurfaces(contribution.task.project.slug, contribution.id);
  return { ok: true, accepted };
}

/** Unblock ready-set + workers after accepts (peer or creator). */
export async function emitLeafReadyIfAny(projectId: string, projectSlug: string) {
  const { readyOpenLeaves } = await import("@/lib/task-dag");
  const { fireAgentRuntimeWebhook } = await import("@/lib/agent-workers");
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: {
      slug: true,
      title: true,
      proposer: { select: { workerWebhookUrl: true } },
      tasks: {
        select: {
          id: true,
          title: true,
          status: true,
          parentId: true,
          sortOrder: true,
          dependsOnJson: true,
          estimatedTokens: true,
          goodFirst: true,
          tags: true,
          claims: { where: { active: true }, select: { id: true } },
        },
      },
    },
  });
  if (!project) return;
  const ready = readyOpenLeaves(project.tasks).filter((r) => {
    const t = project.tasks.find((x) => x.id === r.id);
    return t && t.claims.length === 0;
  });
  if (ready.length === 0) return;

  const top = ready.slice(0, 5).map((r) => {
    const t = project.tasks.find((x) => x.id === r.id)!;
    return { id: t.id, title: t.title, goodFirst: t.goodFirst };
  });

  await fireAgentRuntimeWebhook({
    type: "leaf.ready",
    title: `Ready leaves: ${project.title}`,
    body: `${ready.length} claimable leaf(ves). Top: ${top.map((t) => t.title).join("; ")}`,
    href: `/projects/${projectSlug}`,
    projectSlug: project.slug,
    taskId: top[0]?.id,
    userWebhookUrl: project.proposer.workerWebhookUrl,
    extra: {
      readyCount: ready.length,
      leaves: top,
      workerHint: {
        claim: "POST /api/v1/agent/worker { action: cycle, projectSlug }",
      },
    },
  });
}

export async function bulkAcceptPendingForUser(
  user: Actor,
  projectId: string,
  opts?: { via?: "ui" | "api"; founderOverride?: boolean }
): Promise<
  | { ok: true; accepted: number; skipped: number; skippedReasons: string[] }
  | { error: string }
> {
  const rl = await rateLimitAsync(`bulk-accept:${user.id}`, {
    limit: 20,
    windowMs: 60 * 60 * 1000,
  });
  if (!rl.ok) return { error: `Rate limit: try again in ${rl.retryAfterSec}s` };

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: {
      id: true,
      slug: true,
      title: true,
      proposerId: true,
      requireDualKey: true,
      dualKeyTokenThreshold: true,
    },
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
      task: { select: { id: true, title: true, estimatedTokens: true } },
      user: { select: { id: true, handle: true } },
      reviews: { select: { reviewerId: true } },
    },
    take: 50,
  });
  if (pending.length === 0) return { error: "No pending submissions" };

  const role = isCreator ? "creator" : "founder";
  let accepted = 0;
  let skipped = 0;
  const skippedReasons: string[] = [];
  const acceptedIds: string[] = [];

  // Route each item through the same dual-key gate as single accept
  for (const contribution of pending) {
    const res = await moderateContributionForUser(
      user,
      contribution.id,
      "accept",
      `${role} bulk accept`,
      opts
    );
    if ("error" in res) {
      skipped += 1;
      skippedReasons.push(
        `${contribution.task.title}: ${res.error}`.slice(0, 200)
      );
      continue;
    }
    if (res.accepted) {
      accepted += 1;
      acceptedIds.push(contribution.id);
    } else {
      skipped += 1;
    }
  }

  if (accepted === 0 && skipped > 0) {
    return {
      error: `Bulk accept: 0 accepted, ${skipped} skipped (dual-key or other gates). ${skippedReasons[0] || ""}`,
    };
  }

  await prisma.ledgerEntry.create({
    data: {
      projectId,
      kind: LedgerKind.LABOR,
      amountCents: 0,
      summary: `@${user.handle || user.name} ${role} bulk-accepted ${accepted} pending (${skipped} skipped dual-key/gates) on "${project.title}"`,
      actorHandle: user.handle,
      meta: JSON.stringify({
        bulkAccept: true,
        count: accepted,
        skipped,
        skippedReasons: skippedReasons.slice(0, 20),
        via: opts?.via || "ui",
        contributionIds: acceptedIds,
        founderMod: !isCreator && isFounder,
      }),
    },
  });

  await syncProjectCompletionStatus(projectId, { actorHandle: user.handle });

  revalidatePath(`/projects/${project.slug}`);
  revalidatePath(`/projects/${project.slug}/cockpit`);
  revalidatePath("/cockpit");
  revalidatePath("/dashboard");
  revalidatePath("/leaderboard");
  revalidatePath("/");
  revalidatePath("/projects");
  return { ok: true, accepted, skipped, skippedReasons: skippedReasons.slice(0, 10) };
}
