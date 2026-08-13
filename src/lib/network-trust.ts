/**
 * Network Gravity public trust metrics (home + forge strip).
 */
import { prisma } from "@/lib/prisma";
import { listOnlineWorkers } from "@/lib/agent-workers";

export type NetworkTrustSnapshot = {
  pendingReviews: number;
  /** Pending older than 24h */
  stalePending: number;
  acceptedLast7d: number;
  claimableLeaves: number;
  builders: number;
  sealedPackages: number;
  dualKeyProjects: number;
  workersOnline: number;
  strongWorkersOnline: number;
  generatedAt: string;
};

export async function getNetworkTrustSnapshot(): Promise<NetworkTrustSnapshot> {
  const since7 = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const staleBefore = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [
    pendingReviews,
    stalePending,
    acceptedLast7d,
    claimableLeaves,
    builders,
    sealedPackages,
    dualKeyProjects,
  ] = await Promise.all([
    prisma.contribution.count({ where: { status: "PENDING" } }),
    prisma.contribution.count({
      where: { status: "PENDING", createdAt: { lt: staleBefore } },
    }),
    prisma.contribution.count({
      where: { status: "ACCEPTED", createdAt: { gte: since7 } },
    }),
    prisma.task.count({
      where: {
        status: "OPEN",
        parentId: { not: null },
        claims: { none: { active: true } },
        project: { status: { in: ["ACTIVE", "FUNDED"] } },
      },
    }),
    prisma.user.count({
      where: {
        OR: [
          { contributions: { some: {} } },
          { projects: { some: {} } },
        ],
      },
    }),
    prisma.artifact.count({ where: { source: "package" } }),
    prisma.project.count({
      where: {
        requireDualKey: true,
        status: { in: ["ACTIVE", "FUNDED"] },
      },
    }),
  ]);

  let workersOnline = 0;
  let strongWorkersOnline = 0;
  try {
    const workers = await listOnlineWorkers();
    workersOnline = workers.length;
    const handles = [
      ...new Set(workers.map((w) => w.handle).filter(Boolean) as string[]),
    ];
    if (handles.length) {
      const users = await prisma.user.findMany({
        where: { handle: { in: handles } },
        select: { handle: true, reputation: true },
      });
      const { canQualityAutoAccept } = await import("@/lib/reputation-tiers");
      const strong = new Set(
        users
          .filter((u) => canQualityAutoAccept(u.reputation))
          .map((u) => u.handle)
      );
      strongWorkersOnline = workers.filter(
        (w) => w.handle && strong.has(w.handle)
      ).length;
    }
  } catch {
    workersOnline = 0;
    strongWorkersOnline = 0;
  }

  return {
    pendingReviews,
    stalePending,
    acceptedLast7d,
    claimableLeaves,
    builders,
    sealedPackages,
    dualKeyProjects,
    workersOnline,
    strongWorkersOnline,
    generatedAt: new Date().toISOString(),
  };
}
