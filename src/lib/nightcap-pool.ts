/**
 * Nightcap capacity pool - real on-platform balances.
 *
 * These are NOT SuperGrok / xAI API keys. Builders report leftover capacity
 * units; gifts credit a public pool that is tracked, summed, and displayed live.
 */
import { prisma } from "@/lib/prisma";

export type NightcapPublicTally = {
  /** Tokens available in the platform pool right now */
  platformAvailable: number;
  /** Lifetime gifted into platform pool */
  platformTotalGifted: number;
  /** Lifetime allocated / spent from platform pool */
  platformTotalSpent: number;
  /** Sum of all project nightcap available balances */
  projectsAvailable: number;
  /** Lifetime gifted to projects */
  projectsTotalGifted: number;
  /** platform + projects available */
  networkAvailable: number;
  /** platform + projects lifetime gifted */
  networkTotalGifted: number;
  giftCount: number;
  lastGiftAt: string | null;
  generatedAt: string;
  unit: "capacity_tokens";
  note: string;
};

async function ensureSiteStats() {
  return prisma.siteStats.upsert({
    where: { id: "global" },
    create: { id: "global", visitors: 0, xBuilders: 0 },
    update: {},
  });
}

/**
 * One-time / repair: if SiteStats pool is zero but gifts exist, backfill from ledger.
 */
export async function reconcileNightcapPoolsIfEmpty(): Promise<void> {
  try {
    const row = await ensureSiteStats();
    const giftAgg = await prisma.nightcapGift.aggregate({
      _sum: { estimatedTokens: true },
      _count: true,
    });
    const giftedSum = giftAgg._sum.estimatedTokens || 0;
    if (giftedSum <= 0) return;

    // If both platform available and total gifted are 0 but gifts exist, backfill
    if (
      (row as { nightcapTotalGifted?: number }).nightcapTotalGifted === 0 &&
      (row as { nightcapAvailable?: number }).nightcapAvailable === 0
    ) {
      const platformGifts = await prisma.nightcapGift.aggregate({
        where: { target: "PLATFORM" },
        _sum: { estimatedTokens: true },
      });
      const plat = platformGifts._sum.estimatedTokens || 0;
      if (plat > 0) {
        await prisma.siteStats.update({
          where: { id: "global" },
          data: {
            nightcapAvailable: plat,
            nightcapTotalGifted: plat,
          },
        });
      }

      // Per-project backfill
      const byProject = await prisma.nightcapGift.groupBy({
        by: ["projectId"],
        where: { target: "PROJECT", projectId: { not: null } },
        _sum: { estimatedTokens: true },
      });
      for (const g of byProject) {
        if (!g.projectId) continue;
        const n = g._sum.estimatedTokens || 0;
        if (n <= 0) continue;
        await prisma.project.update({
          where: { id: g.projectId },
          data: {
            nightcapAvailable: n,
            nightcapTotalGifted: n,
          },
        });
      }
    }
  } catch (e) {
    console.warn("[nightcap] reconcile", e);
  }
}

export async function getNightcapPublicTally(): Promise<NightcapPublicTally> {
  await reconcileNightcapPoolsIfEmpty();

  const [row, projectAgg, giftCount, lastGift] = await Promise.all([
    ensureSiteStats(),
    prisma.project.aggregate({
      _sum: {
        nightcapAvailable: true,
        nightcapTotalGifted: true,
      },
    }),
    prisma.nightcapGift.count(),
    prisma.nightcapGift.findFirst({
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    }),
  ]);

  const platformAvailable =
    (row as { nightcapAvailable?: number }).nightcapAvailable ?? 0;
  const platformTotalGifted =
    (row as { nightcapTotalGifted?: number }).nightcapTotalGifted ?? 0;
  const platformTotalSpent =
    (row as { nightcapTotalSpent?: number }).nightcapTotalSpent ?? 0;
  const projectsAvailable = projectAgg._sum.nightcapAvailable ?? 0;
  const projectsTotalGifted = projectAgg._sum.nightcapTotalGifted ?? 0;

  return {
    platformAvailable,
    platformTotalGifted,
    platformTotalSpent,
    projectsAvailable,
    projectsTotalGifted,
    networkAvailable: platformAvailable + projectsAvailable,
    networkTotalGifted: platformTotalGifted + projectsTotalGifted,
    giftCount,
    lastGiftAt: lastGift?.createdAt.toISOString() ?? null,
    generatedAt: new Date().toISOString(),
    unit: "capacity_tokens",
    note:
      "On-platform nightcap capacity units from builder gifts. Not SuperGrok API keys - real tracked pool balances on GrokForge.",
  };
}

/**
 * Credit gift into the real pool (platform or project).
 */
export async function creditNightcapPool(input: {
  tokens: number;
  target: "PLATFORM" | "PROJECT";
  projectId?: string | null;
}): Promise<{ platformAvailable: number; projectAvailable?: number }> {
  const tokens = Math.floor(input.tokens);
  if (!Number.isFinite(tokens) || tokens < 1) {
    throw new Error("Invalid nightcap token amount");
  }

  await ensureSiteStats();

  if (input.target === "PLATFORM") {
    const row = await prisma.siteStats.update({
      where: { id: "global" },
      data: {
        nightcapAvailable: { increment: tokens },
        nightcapTotalGifted: { increment: tokens },
      },
    });
    return {
      platformAvailable:
        (row as { nightcapAvailable?: number }).nightcapAvailable ?? tokens,
    };
  }

  if (!input.projectId) throw new Error("projectId required for PROJECT target");
  const project = await prisma.project.update({
    where: { id: input.projectId },
    data: {
      nightcapAvailable: { increment: tokens },
      nightcapTotalGifted: { increment: tokens },
    },
    select: { nightcapAvailable: true },
  });
  const site = await ensureSiteStats();
  return {
    platformAvailable:
      (site as { nightcapAvailable?: number }).nightcapAvailable ?? 0,
    projectAvailable: project.nightcapAvailable,
  };
}
