import { createHash } from "crypto";
import { prisma } from "@/lib/prisma";
import { rateLimitAsync } from "@/lib/rate-limit";

export type LiveStats = {
  visitors: number;
  xBuilders: number;
  activeProjects: number;
  /** Projects with status COMPLETED or all claimable leaves accepted. */
  completedProjects: number;
  openLeafTasks: number;
  /** Nightcap network capacity available (on-platform pool). */
  nightcapAvailable: number;
};

async function ensureRow() {
  return prisma.siteStats.upsert({
    where: { id: "global" },
    create: { id: "global", visitors: 0, xBuilders: 0 },
    update: {},
  });
}

/** Count X-linked users (builders). */
export async function countXBuilders(): Promise<number> {
  try {
    return await prisma.account.groupBy({
      by: ["userId"],
      where: { provider: "twitter" },
    }).then((rows) => rows.length);
  } catch {
    return prisma.user.count({
      where: { handle: { not: null } },
    });
  }
}

/**
 * Bump visitor counter with coarse IP hash rate limit (1 / 45m / key).
 * Safe to call from layout; never throws to the page.
 * After a successful bump, mirrors Live Forge total into hub fleet hits
 * (hits.jonbailey.xyz /sync/grokforge) so jonbailey.xyz network visits stay current.
 */
export async function bumpVisitor(ipHint?: string | null): Promise<void> {
  try {
    const raw = (ipHint || "anon").slice(0, 128);
    const hash = createHash("sha256").update(raw).digest("hex").slice(0, 16);
    const rl = await rateLimitAsync(`visit:${hash}`, {
      limit: 1,
      windowMs: 45 * 60 * 1000,
    });
    if (!rl.ok) return;

    await ensureRow();
    await prisma.siteStats.update({
      where: { id: "global" },
      data: { visitors: { increment: 1 } },
    });

    // Fire-and-forget: fleet hub sum includes Live Forge via shared hits Worker.
    void mirrorLiveForgeToFleetHits();
  } catch (e) {
    console.warn("[site-stats] bumpVisitor", e);
  }
}

/** Push absolute Live Forge visitor total into hits.jonbailey.xyz fleet slug. */
async function mirrorLiveForgeToFleetHits(): Promise<void> {
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 2500);
    await fetch("https://hits.jonbailey.xyz/sync/grokforge", {
      method: "GET",
      cache: "no-store",
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        "User-Agent": "grokforge-live-forge/1.0",
      },
    });
    clearTimeout(t);
  } catch {
    /* non-fatal - Worker cron also syncs every 15m */
  }
}

/** Refresh xBuilders from accounts table (call after X sign-in enrich). */
export async function refreshXBuilders(): Promise<number> {
  try {
    await ensureRow();
    const n = await countXBuilders();
    await prisma.siteStats.update({
      where: { id: "global" },
      data: { xBuilders: n },
    });
    return n;
  } catch (e) {
    console.warn("[site-stats] refreshXBuilders", e);
    return 0;
  }
}

export type FeaturedProjectCard = {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: string;
  license: string;
  status: string;
  /** Optional project banner URL */
  bannerUrl: string | null;
  /** Accepted claimable tasks */
  completedTasks: number;
  /** Total claimable (leaf) tasks */
  totalTasks: number;
  openTasks: number;
  claimedTasks: number;
  submittedTasks: number;
  fullyComplete: boolean;
  /** Has Seal & Ship package artifact */
  sealed: boolean;
  /** Public thumbs-up count */
  thumbCount: number;
  proposerHandle: string | null;
};

export async function getFeaturedProjectId(): Promise<string | null> {
  try {
    const row = await ensureRow();
    return (row as { featuredProjectId?: string | null }).featuredProjectId || null;
  } catch {
    return null;
  }
}

export async function getFeaturedProject(): Promise<FeaturedProjectCard | null> {
  try {
    const id = await getFeaturedProjectId();
    if (!id) return null;
    const p = await prisma.project.findFirst({
      where: {
        id,
        status: { in: ["ACTIVE", "FUNDED", "COMPLETED"] },
      },
      include: {
        proposer: { select: { handle: true } },
        tasks: {
          select: { id: true, status: true, parentId: true },
        },
        artifacts: {
          where: { source: "package" },
          select: { id: true, isPrimary: true, version: true },
          take: 5,
        },
        _count: { select: { thumbs: true } },
      },
    });
    if (!p) return null;
    const leaves = p.tasks.filter((t) => t.parentId != null);
    const pool = leaves.length > 0 ? leaves : p.tasks;
    const completedTasks = pool.filter((t) => t.status === "ACCEPTED").length;
    const totalTasks = pool.length;
    const fullyComplete =
      p.status === "COMPLETED" || (totalTasks > 0 && completedTasks === totalTasks);
    const sealed = (p.artifacts?.length ?? 0) > 0;
    return {
      id: p.id,
      slug: p.slug,
      title: p.title,
      description: p.description.slice(0, 220),
      category: p.category,
      license: p.license,
      status: p.status,
      bannerUrl: (p as { bannerUrl?: string | null }).bannerUrl || null,
      completedTasks,
      totalTasks,
      openTasks: pool.filter((t) => t.status === "OPEN").length,
      claimedTasks: pool.filter((t) => t.status === "CLAIMED").length,
      submittedTasks: pool.filter((t) => t.status === "SUBMITTED").length,
      fullyComplete,
      sealed,
      thumbCount: p._count.thumbs,
      proposerHandle: p.proposer.handle,
    };
  } catch (e) {
    console.warn("[getFeaturedProject]", e);
    return null;
  }
}

export async function getLiveStats(): Promise<LiveStats> {
  try {
    const row = await ensureRow();
    const xBuilders =
      row.xBuilders > 0 ? row.xBuilders : await countXBuilders();
    if (row.xBuilders === 0 && xBuilders > 0) {
      await prisma.siteStats.update({
        where: { id: "global" },
        data: { xBuilders },
      });
    }
    const [activeProjects, openLeafTasks, publicProjects] = await Promise.all([
      prisma.project.count({ where: { status: "ACTIVE" } }),
      prisma.task.count({
        where: {
          status: "OPEN",
          parentId: { not: null },
          project: { status: { in: ["ACTIVE", "FUNDED"] } },
        },
      }),
      prisma.project.findMany({
        where: { status: { in: ["ACTIVE", "FUNDED", "COMPLETED"] } },
        select: {
          status: true,
          tasks: { select: { status: true, parentId: true } },
        },
      }),
    ]);
    const { isProjectCompleteDisplay } = await import("@/lib/utils");
    const completedProjects = publicProjects.filter((p) =>
      isProjectCompleteDisplay(p.status, p.tasks)
    ).length;
    let nightcapAvailable = 0;
    try {
      const { getNightcapPublicTally } = await import("@/lib/nightcap-pool");
      nightcapAvailable = (await getNightcapPublicTally()).networkAvailable;
    } catch {
      nightcapAvailable = 0;
    }
    return {
      visitors: row.visitors,
      xBuilders,
      activeProjects,
      completedProjects,
      openLeafTasks,
      nightcapAvailable,
    };
  } catch {
    return {
      visitors: 0,
      xBuilders: 0,
      activeProjects: 0,
      completedProjects: 0,
      openLeafTasks: 0,
      nightcapAvailable: 0,
    };
  }
}
