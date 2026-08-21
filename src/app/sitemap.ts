import type { MetadataRoute } from "next";

/**
 * Never touch Prisma at module load. Missing DATABASE_URL must not fail Vercel builds
 * (common after team transfer before env is re-copied).
 */
export const dynamic = "force-dynamic";
export const revalidate = 3600;

const site =
  process.env.NEXTAUTH_URL?.replace(/\/$/, "") ||
  process.env.AUTH_URL?.replace(/\/$/, "") ||
  "https://grokforge.app";

function staticRoutes(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: site, lastModified: now, changeFrequency: "daily", priority: 1 },
    {
      url: `${site}/projects`,
      lastModified: now,
      changeFrequency: "hourly",
      priority: 0.9,
    },
    {
      url: `${site}/tasks`,
      lastModified: now,
      changeFrequency: "hourly",
      priority: 0.88,
    },
    {
      url: `${site}/activity`,
      lastModified: now,
      changeFrequency: "hourly",
      priority: 0.86,
    },
    {
      url: `${site}/ships`,
      lastModified: now,
      changeFrequency: "hourly",
      priority: 0.87,
    },
    {
      url: `${site}/leaderboard`,
      lastModified: now,
      changeFrequency: "hourly",
      priority: 0.85,
    },
    {
      url: `${site}/projects/new`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${site}/about`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${site}/status`,
      lastModified: now,
      changeFrequency: "hourly",
      priority: 0.45,
    },
    {
      url: `${site}/login`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.4,
    },
  ];
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = staticRoutes();

  if (!process.env.DATABASE_URL) {
    console.warn("[sitemap] DATABASE_URL missing - static routes only");
    return base;
  }

  try {
    // Dynamic import so Prisma is not initialized during module evaluation
    const { prisma } = await import("@/lib/prisma");
    const [projects, builders] = await Promise.all([
      prisma.project.findMany({
        where: { status: { in: ["ACTIVE", "FUNDED", "COMPLETED"] } },
        select: { slug: true, updatedAt: true },
        take: 500,
      }),
      prisma.user.findMany({
        where: {
          handle: { not: null },
          OR: [
            { projects: { some: {} } },
            { contributions: { some: {} } },
            { donations: { some: {} } },
          ],
        },
        select: { handle: true, updatedAt: true },
        take: 200,
      }),
    ]);
    return [
      ...base,
      ...projects.map((p) => ({
        url: `${site}/projects/${p.slug}`,
        lastModified: p.updatedAt,
        changeFrequency: "daily" as const,
        priority: 0.8,
      })),
      ...builders
        .filter((u) => u.handle)
        .map((u) => ({
          url: `${site}/u/${u.handle}`,
          lastModified: u.updatedAt,
          changeFrequency: "weekly" as const,
          priority: 0.65,
        })),
    ];
  } catch (err) {
    console.warn("[sitemap] DB unavailable, static routes only", err);
    return base;
  }
}
