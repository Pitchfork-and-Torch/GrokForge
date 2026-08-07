import { LedgerKind, ProjectStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { projectTaskProgress } from "@/lib/utils";

/**
 * When all claimable leaves are ACCEPTED, mark project COMPLETED.
 * If a task reopens and project was COMPLETED, restore ACTIVE (or FUNDED if pots have balance).
 */
export async function syncProjectCompletionStatus(
  projectId: string,
  opts?: { actorHandle?: string | null }
): Promise<{ status: ProjectStatus; changed: boolean }> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      tasks: { select: { status: true, parentId: true } },
      fundPots: { select: { balanceCents: true } },
    },
  });
  if (!project) {
    return { status: ProjectStatus.ACTIVE, changed: false };
  }
  // Do not touch archived/draft
  if (project.status === ProjectStatus.ARCHIVED || project.status === ProjectStatus.DRAFT) {
    return { status: project.status, changed: false };
  }

  const progress = projectTaskProgress(project.tasks);
  const hasSupport = project.fundPots.some((p) => p.balanceCents > 0);
  const resumeStatus = hasSupport ? ProjectStatus.FUNDED : ProjectStatus.ACTIVE;

  if (progress.fullyComplete && project.status !== ProjectStatus.COMPLETED) {
    await prisma.project.update({
      where: { id: projectId },
      data: { status: ProjectStatus.COMPLETED },
    });
    await prisma.ledgerEntry.create({
      data: {
        projectId,
        kind: LedgerKind.MILESTONE,
        amountCents: 0,
        summary: `Project marked complete - all ${progress.total} claimable tasks accepted`,
        actorHandle: opts?.actorHandle || null,
        meta: JSON.stringify({
          autoComplete: true,
          completed: progress.completed,
          total: progress.total,
        }),
      },
    });
    return { status: ProjectStatus.COMPLETED, changed: true };
  }

  if (!progress.fullyComplete && project.status === ProjectStatus.COMPLETED) {
    await prisma.project.update({
      where: { id: projectId },
      data: { status: resumeStatus },
    });
    await prisma.ledgerEntry.create({
      data: {
        projectId,
        kind: LedgerKind.ADJUSTMENT,
        amountCents: 0,
        summary: `Project reopened (${resumeStatus}) - claimable work no longer fully accepted`,
        actorHandle: opts?.actorHandle || null,
        meta: JSON.stringify({
          autoReopen: true,
          completed: progress.completed,
          total: progress.total,
        }),
      },
    });
    return { status: resumeStatus, changed: true };
  }

  return { status: project.status, changed: false };
}
