/**
 * Peer review shared by UI server-actions and Agent API (second-builder path).
 * Not founder moderation - any authenticated builder may review others' work.
 */
import { revalidatePath } from "next/cache";
import { LedgerKind, TaskStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { rateLimitAsync } from "@/lib/rate-limit";
import { notifyProjectWatchers, notifyUser } from "@/lib/notify";
import { persistLedgerSummary, rejectSecretPaste } from "@/lib/secret-scan";

type Actor = {
  id: string;
  handle: string | null;
  name: string | null;
};

export async function peerReviewContributionForUser(
  user: Actor,
  contributionId: string,
  score: number,
  notes?: string,
  opts?: { via?: "ui" | "api" }
): Promise<
  | { ok: true; accepted: boolean; avg: number }
  | { error: string }
> {
  const rl = await rateLimitAsync(`review:${user.id}`, {
    limit: 60,
    windowMs: 60 * 60 * 1000,
  });
  if (!rl.ok) return { error: `Rate limit: try again in ${rl.retryAfterSec}s` };
  if (score < 1 || score > 5) return { error: "Score must be 1-5" };

  const contribution = await prisma.contribution.findUnique({
    where: { id: contributionId },
    include: { task: { include: { project: true } }, user: true },
  });
  if (!contribution) return { error: "Not found" };
  if (contribution.status !== "PENDING") {
    return { error: "Only pending submissions can be peer-reviewed" };
  }
  if (contribution.userId === user.id) {
    return { error: "Cannot review your own submission" };
  }

  // One review per reviewer per contribution (idempotent)
  const existing = await prisma.contributionReview.findFirst({
    where: { contributionId, reviewerId: user.id },
  });
  if (existing) {
    return { error: "You already reviewed this submission" };
  }

  const leak = rejectSecretPaste(notes || "");
  if (leak) return leak;

  await prisma.contributionReview.create({
    data: {
      contributionId,
      reviewerId: user.id,
      score,
      notes: (notes || "").slice(0, 2000) || null,
    },
  });

  await prisma.user.update({
    where: { id: user.id },
    data: { reputation: { increment: 2 } },
  });

  if (contribution.userId !== user.id) {
    await notifyUser({
      userId: contribution.userId,
      type: "REVIEW",
      title: `Review on "${contribution.task.title}"`,
      body: `@${user.handle || "reviewer"} scored ${score}/5`,
      href: `/c/${contribution.id}`,
    });
  }

  const reviews = await prisma.contributionReview.findMany({
    where: { contributionId },
  });
  const avg = Math.round(
    reviews.reduce((s, r) => s + r.score, 0) / reviews.length
  );

  const accepted = avg >= 3;
  await prisma.contribution.update({
    where: { id: contributionId },
    data: {
      score: avg,
      status: accepted ? "ACCEPTED" : "REJECTED",
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

  try {
    const { syncProjectCompletionStatus } = await import(
      "@/lib/project-completion"
    );
    await syncProjectCompletionStatus(contribution.task.projectId, {
      actorHandle: user.handle,
    });
  } catch (e) {
    console.warn("[peerReview] completion sync", e);
  }

  await prisma.ledgerEntry.create({
    data: {
      projectId: contribution.task.projectId,
      kind: LedgerKind.LABOR,
      amountCents: 0,
      summary: persistLedgerSummary(
        `@${user.handle || user.name} reviewed contribution (${avg}/5) -> ${accepted ? "accepted" : "rejected"}`
      ),
      actorHandle: user.handle,
      meta: JSON.stringify({
        contributionId,
        peerReview: true,
        avg,
        accepted,
        via: opts?.via || "ui",
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
      body: `Peer average ${avg}/5 - ${accepted ? "+5 rep" : "task reopened"}`,
      href: `/c/${contribution.id}`,
    });
  }
  if (
    contribution.task.project.proposerId !== user.id &&
    contribution.task.project.proposerId !== contribution.userId
  ) {
    await notifyUser({
      userId: contribution.task.project.proposerId,
      type: "REVIEW_RESULT",
      title: `Review result on ${contribution.task.project.title}`,
      body: `"${contribution.task.title}" scored ${avg}/5 (${accepted ? "accepted" : "rejected"})`,
      href: `/c/${contribution.id}`,
    });
  }
  await notifyProjectWatchers({
    projectId: contribution.task.projectId,
    excludeUserIds: [
      user.id,
      contribution.userId,
      contribution.task.project.proposerId,
    ],
    type: "WATCH_REVIEW",
    title: `Watched: ${contribution.task.project.title}`,
    body: `"${contribution.task.title}" ${accepted ? "accepted" : "rejected"} (${avg}/5)`,
    href: `/c/${contribution.id}`,
  });

  if (accepted) {
    try {
      const { emitLeafReadyIfAny } = await import("@/lib/moderation-ops");
      await emitLeafReadyIfAny(
        contribution.task.projectId,
        contribution.task.project.slug
      );
    } catch (e) {
      console.warn("[peerReview] leaf-ready", e);
    }
  }

  try {
    revalidatePath(`/projects/${contribution.task.project.slug}`);
    revalidatePath("/dashboard");
    revalidatePath("/leaderboard");
    revalidatePath("/tasks");
    revalidatePath("/forge");
    revalidatePath("/");
    revalidatePath(`/c/${contribution.id}`);
  } catch {
    /* non-request context (scripts) may lack next cache */
  }

  return { ok: true, accepted, avg };
}
