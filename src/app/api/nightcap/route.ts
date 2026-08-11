import { NextResponse } from "next/server";
import { getNightcapPublicTally } from "@/lib/nightcap-pool";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * Public nightcap pool tally - real-time capacity balances.
 * No auth. Safe for Live Forge widgets.
 */
export async function GET() {
  try {
    const tally = await getNightcapPublicTally();
    const recent = await prisma.nightcapGift.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      select: {
        id: true,
        estimatedTokens: true,
        target: true,
        createdAt: true,
        user: { select: { handle: true } },
        project: { select: { slug: true, title: true } },
      },
    });

    return NextResponse.json({
      ok: true,
      tally,
      recent: recent.map((g) => ({
        id: g.id,
        tokens: g.estimatedTokens,
        target: g.target,
        author: g.user.handle,
        projectSlug: g.project?.slug ?? null,
        projectTitle: g.project?.title ?? null,
        at: g.createdAt.toISOString(),
      })),
    });
  } catch (e) {
    console.error("[api/nightcap]", e);
    return NextResponse.json(
      { ok: false, error: "nightcap tally unavailable" },
      { status: 503 }
    );
  }
}
