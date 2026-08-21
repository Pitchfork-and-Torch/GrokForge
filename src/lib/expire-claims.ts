import { LedgerKind, TaskStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { notifyUser } from "@/lib/notify";

export type ExpireClaimsResult = {
  expired: number;
  reopenedTasks: number;
  claimIds: string[];
};

/**
 * Soft-expire active claims past expiresAt.
 * Deactivates claim, re-opens task if no other active claims remain.
 * Safe to call on page loads and cron (idempotent).
 */
export async function expireStaleClaims(opts?: {
  limit?: number;
  notify?: boolean;
}): Promise<ExpireClaimsResult> {
  const limit = opts?.limit ?? 40;
  const notify = opts?.notify !== false;
  const now = new Date();

  const stale = await prisma.taskClaim.findMany({
    where: {
      active: true,
      expiresAt: { lte: now },
    },
    include: {
      task: {
        include: {
          project: { select: { id: true, slug: true, title: true, proposerId: true } },
        },
      },
      user: { select: { id: true, handle: true, name: true } },
    },
    take: limit,
    orderBy: { expiresAt: "asc" },
  });

  if (stale.length === 0) {
    return { expired: 0, reopenedTasks: 0, claimIds: [] };
  }

  let reopenedTasks = 0;
  const claimIds: string[] = [];

  for (const claim of stale) {
    claimIds.push(claim.id);
    const otherActive = await prisma.taskClaim.count({
      where: {
        taskId: claim.taskId,
        active: true,
        id: { not: claim.id },
      },
    });

    const reopen = otherActive === 0;
    if (reopen) reopenedTasks += 1;

    await prisma.$transaction([
      prisma.taskClaim.update({
        where: { id: claim.id },
        data: { active: false },
      }),
      prisma.task.update({
        where: { id: claim.taskId },
        data: {
          status: reopen ? TaskStatus.OPEN : TaskStatus.CLAIMED,
        },
      }),
      prisma.ledgerEntry.create({
        data: {
          projectId: claim.task.projectId,
          kind: LedgerKind.LABOR,
          amountCents: 0,
          summary: `Claim expired on "${claim.task.title}" (was @${claim.user.handle || claim.user.name || "builder"})`,
          actorHandle: claim.user.handle,
          meta: JSON.stringify({ claimId: claim.id, reason: "expiresAt" }),
        },
      }),
    ]);

    if (notify) {
      await notifyUser({
        userId: claim.userId,
        type: "CLAIM_EXPIRED",
        title: `Claim expired: ${claim.task.title}`,
        body: `Your claim window closed on ${claim.task.project.title}. Task is open again if no other claimers.`,
        href: `/projects/${claim.task.project.slug}#task-${claim.taskId}`,
      });
      if (claim.task.project.proposerId !== claim.userId) {
        await notifyUser({
          userId: claim.task.project.proposerId,
          type: "CLAIM_EXPIRED",
          title: `Claim window ended on ${claim.task.project.title}`,
          body: `@${claim.user.handle || "builder"}'s claim on "${claim.task.title}" expired`,
          href: `/projects/${claim.task.project.slug}#task-${claim.taskId}`,
        });
      }
    }
  }

  return { expired: stale.length, reopenedTasks, claimIds };
}
