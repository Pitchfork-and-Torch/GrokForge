import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { githubPublishConfigured, getPublishOrg } from "@/lib/github-publish";

export const dynamic = "force-dynamic";

/** Public forge health for status.jonbailey.xyz and agents */
export async function GET() {
  try {
    const since7 = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const [
      activeProjects,
      openLeaves,
      accepted7d,
      seals,
      pending,
      builders,
    ] = await Promise.all([
      prisma.project.count({ where: { status: { in: ["ACTIVE", "FUNDED"] } } }),
      prisma.task.count({
        where: {
          status: "OPEN",
          parentId: { not: null },
          project: { status: { in: ["ACTIVE", "FUNDED"] } },
        },
      }),
      prisma.contribution.count({
        where: { status: "ACCEPTED", createdAt: { gte: since7 } },
      }),
      prisma.artifact.count({ where: { source: "package" } }),
      prisma.contribution.count({ where: { status: "PENDING" } }),
      prisma.user.count({
        where: {
          OR: [
            { contributions: { some: {} } },
            { projects: { some: {} } },
          ],
        },
      }),
    ]);

    const claimable = await prisma.task.count({
      where: {
        status: "OPEN",
        parentId: { not: null },
        claims: { none: { active: true } },
        project: { status: { in: ["ACTIVE", "FUNDED"] } },
      },
    });

    let stalePending = 0;
    let strongWorkersOnline = 0;
    let workersOnline = 0;
    try {
      const { getNetworkTrustSnapshot } = await import("@/lib/network-trust");
      const trust = await getNetworkTrustSnapshot();
      stalePending = trust.stalePending;
      strongWorkersOnline = trust.strongWorkersOnline;
      workersOnline = trust.workersOnline;
    } catch {
      /* non-fatal */
    }

    return NextResponse.json({
      ok: true,
      generatedAt: new Date().toISOString(),
      metrics: {
        activeProjects,
        openLeaves,
        claimableLeaves: claimable,
        acceptedLast7d: accepted7d,
        sealedPackages: seals,
        pendingReviews: pending,
        stalePendingReviews: stalePending,
        builders,
        workersOnline,
        strongWorkersOnline,
        fillRateHint:
          openLeaves > 0
            ? Number((accepted7d / Math.max(openLeaves, 1)).toFixed(3))
            : null,
      },
      features: {
        shipToGitHub: githubPublishConfigured(),
        publishOrg: getPublishOrg(),
        fundingGoalDefaultUsd: 0,
        networkGravity: true,
        strongWorkerAutoAccept: true,
      },
    });
  } catch (e) {
    return NextResponse.json(
      {
        ok: false,
        error: e instanceof Error ? e.message.slice(0, 200) : "health failed",
      },
      { status: 500 }
    );
  }
}
