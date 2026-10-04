/**
 * Ready-set DAG for hierarchical leaves (dependsOnJson + parent tree hints).
 */
import type { TaskStatus } from "@prisma/client";

export type DagTask = {
  id: string;
  title: string;
  status: TaskStatus | string;
  parentId: string | null;
  sortOrder: number;
  estimatedTokens?: number;
  goodFirst?: boolean;
  tags?: string | null;
  dependsOnJson?: string | null;
};

export type ReadyInfo = {
  id: string;
  title: string;
  ready: boolean;
  blockedBy: { id: string; title: string; status: string }[];
  estimatedTokens: number;
  goodFirst: boolean;
  tags: string[];
};

function parseDeps(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw) as unknown;
    if (!Array.isArray(v)) return [];
    return v.filter((x): x is string => typeof x === "string" && x.length > 0);
  } catch {
    return [];
  }
}

export function parseTaskTags(tags: string | null | undefined): string[] {
  if (!tags) return [];
  return tags
    .split(/[,;]+/)
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 20);
}

/**
 * Leaf = has parent (master root is not claimable work in the usual board sense).
 */
export function isLeaf(task: DagTask): boolean {
  return task.parentId != null;
}

export function computeReadySet(tasks: DagTask[]): ReadyInfo[] {
  const byId = new Map(tasks.map((t) => [t.id, t]));
  const leaves = tasks.filter(isLeaf);

  return leaves
    .map((t) => {
      const depIds = parseDeps(t.dependsOnJson);
      const blockedBy: ReadyInfo["blockedBy"] = [];
      for (const d of depIds) {
        const dep = byId.get(d);
        if (!dep) {
          blockedBy.push({ id: d, title: "(missing dep)", status: "UNKNOWN" });
          continue;
        }
        if (dep.status !== "ACCEPTED") {
          blockedBy.push({
            id: dep.id,
            title: dep.title,
            status: String(dep.status),
          });
        }
      }
      // Soft ordering: lower sortOrder siblings under same parent that are still OPEN/CLAIMED
      // do not hard-block unless listed in dependsOnJson (keeps parallel work viable).
      const claimableStatus =
        t.status === "OPEN" || t.status === "CLAIMED" || t.status === "SUBMITTED";
      const ready =
        t.status === "OPEN" && blockedBy.length === 0 && claimableStatus;
      return {
        id: t.id,
        title: t.title,
        ready: t.status === "OPEN" && blockedBy.length === 0,
        blockedBy,
        estimatedTokens: t.estimatedTokens || 0,
        goodFirst: !!t.goodFirst,
        tags: parseTaskTags(t.tags),
      };
    })
    .sort((a, b) => {
      if (a.ready !== b.ready) return a.ready ? -1 : 1;
      if (a.goodFirst !== b.goodFirst) return a.goodFirst ? -1 : 1;
      return a.estimatedTokens - b.estimatedTokens;
    });
}

export function readyOpenLeaves(tasks: DagTask[]): ReadyInfo[] {
  return computeReadySet(tasks).filter((t) => t.ready);
}

export function blockedOpenLeaves(tasks: DagTask[]): ReadyInfo[] {
  return computeReadySet(tasks).filter(
    (t) => !t.ready && t.blockedBy.length > 0
  );
}
