import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rateLimitBackend } from "@/lib/rate-limit";
import { getLiveStats } from "@/lib/site-stats";

export const dynamic = "force-dynamic";

/**
 * Public ecosystem stats - no secrets, safe for status widgets and embeds.
 */
export async function GET() {
  try {
    const [
      live,
      acceptedWork,
      totalDonationsCents,
      watches,
      comments,
      builders,
    ] = await Promise.all([
      getLiveStats(),
      prisma.contribution.count({ where: { status: "ACCEPTED" } }),
      prisma.donation.aggregate({ _sum: { amountCents: true } }),
      prisma.projectWatch.count(),
      prisma.projectComment.count({ where: { hidden: false } }),
      prisma.user.count({
        where: {
          OR: [
            { contributions: { some: {} } },
            { donations: { some: {} } },
            { projects: { some: {} } },
          ],
        },
      }),
    ]);

    return NextResponse.json({
      ok: true,
      generatedAt: new Date().toISOString(),
      stats: {
        visitors: live.visitors,
        xBuilders: live.xBuilders,
        activeProjects: live.activeProjects,
        completedProjects: live.completedProjects,
        openLeafTasks: live.openLeafTasks,
        acceptedWork,
        totalDonationsCents: totalDonationsCents._sum.amountCents || 0,
        watches,
        comments,
        builders,
      },
      features: {
        stripeConfigured: Boolean(process.env.STRIPE_SECRET_KEY?.trim()),
        rateLimitBackend: rateLimitBackend(),
        watches: true,
        openTasksBoard: true,
        notifications: true,
        claimAutoExpire: true,
        notifyWebhook: Boolean(process.env.NOTIFY_WEBHOOK_URL?.trim()),
        xMoneyP2p: true,
        themes: 11,
        creatorModeration: true,
      },
    });
  } catch (e) {
    console.error("[api/stats]", e);
    return NextResponse.json(
      { ok: false, error: "stats unavailable" },
      { status: 503 }
    );
  }
}
