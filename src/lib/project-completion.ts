import { LedgerKind, ProjectStatus, TaskStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { projectTaskProgress } from "@/lib/utils";

type TaskRow = { id: string; status: string; parentId: string | null };

/** Pure: which parent task ids should be ACCEPTED vs OPEN given leaf state. */
export function planParentStatusUpdates(
  tasks: TaskRow[]
): { accept: string[]; reopen: string[] } {
  if (tasks.length === 0) return { accept: [], reopen: [] };

  const byParent = new Map<string | null, TaskRow[]>();
  for (const t of tasks) {
    const k = t.parentId;
    if (!byParent.has(k)) byParent.set(k, []);
    byParent.get(k)!.push(t);
  }
  const parentIds = new Set(
    tasks.map((t) => t.parentId).filter((id): id is string => !!id)
  );

  const statusMap = new Map(tasks.map((t) => [t.id, t.status]));

  function allDescendantLeavesAccepted(taskId: string): boolean {
    const kids = byParent.get(taskId) || [];
    if (kids.length === 0) {
      return statusMap.get(taskId) === TaskStatus.ACCEPTED;
    }
    return kids.every((k) => allDescendantLeavesAccepted(k.id));
  }

  const accept: string[] = [];
  const reopen: string[] = [];
  // Multiple passes so grandparents resolve after children parents
  let changed = true;
  while (changed) {
    changed = false;
    for (const id of parentIds) {
      const complete = allDescendantLeavesAccepted(id);
      const cur = statusMap.get(id);
      if (complete && cur !== TaskStatus.ACCEPTED) {
        accept.push(id);
        statusMap.set(id, TaskStatus.ACCEPTED);
        changed = true;
      } else if (!complete && cur === TaskStatus.ACCEPTED) {
        reopen.push(id);
        statusMap.set(id, TaskStatus.OPEN);
        changed = true;
      }
    }
  }
  return { accept: [...new Set(accept)], reopen: [...new Set(reopen)] };
}

/**
 * Parent/root tasks are containers (not claimable). When every descendant
 * leaf is ACCEPTED, auto-mark the parent ACCEPTED so the tree does not show
 * a finished project with an "UNCLAIMED" master goal. Reverse if a leaf reopens.
 */
export async function syncParentTaskStatuses(
  projectId: string
): Promise<{ parentsAccepted: number; parentsReopened: number }> {
  const tasks = await prisma.task.findMany({
    where: { projectId },
    select: { id: true, status: true, parentId: true },
  });
  if (tasks.length === 0) return { parentsAccepted: 0, parentsReopened: 0 };

  const plan = planParentStatusUpdates(tasks);
  for (const id of plan.accept) {
    await prisma.task.update({
      where: { id },
      data: { status: TaskStatus.ACCEPTED },
    });
  }
  for (const id of plan.reopen) {
    await prisma.task.update({
      where: { id },
      data: { status: TaskStatus.OPEN },
    });
  }

  return {
    parentsAccepted: plan.accept.length,
    parentsReopened: plan.reopen.length,
  };
}

/**
 * When all claimable leaves are ACCEPTED, mark project COMPLETED.
 * Also sync parent/root task statuses to match leaf completion.
 * If a task reopens and project was COMPLETED, restore ACTIVE (or FUNDED if pots have balance).
 */
export async function syncProjectCompletionStatus(
  projectId: string,
  opts?: { actorHandle?: string | null }
): Promise<{ status: ProjectStatus; changed: boolean }> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      tasks: { select: { id: true, status: true, parentId: true } },
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

  // Keep master/epic rows honest vs leaf completion (fixes UNCLAIMED root on shipped projects)
  let parentChanged = false;
  try {
    const pr = await syncParentTaskStatuses(projectId);
    parentChanged = pr.parentsAccepted > 0 || pr.parentsReopened > 0;
  } catch (e) {
    console.warn("[syncProjectCompletionStatus] parent sync", e);
  }

  // Re-read tasks after parent sync for progress
  const tasks =
    parentChanged
      ? await prisma.task.findMany({
          where: { projectId },
          select: { status: true, parentId: true },
        })
      : project.tasks;

  const progress = projectTaskProgress(tasks);
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

  return { status: project.status, changed: parentChanged };
}
