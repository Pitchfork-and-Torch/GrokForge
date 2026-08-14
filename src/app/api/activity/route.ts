import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/** Public recent ledger tape for home Live Activity polling. */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = Math.min(
      24,
      Math.max(3, Number(searchParams.get("limit") || 12) || 12)
    );

    const rows = await prisma.ledgerEntry.findMany({
      where: { project: { status: "ACTIVE" } },
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        project: { select: { slug: true, title: true } },
      },
    });

    return NextResponse.json({
      ok: true,
      generatedAt: new Date().toISOString(),
      items: rows.map((e) => ({
        id: e.id,
        kind: e.kind,
        summary: e.summary,
        createdAt:
          e.createdAt.toISOString().slice(0, 16).replace("T", " ") + " UTC",
        project: e.project,
      })),
    });
  } catch (e) {
    console.error("[api/activity]", e);
    return NextResponse.json(
      { ok: false, error: "activity unavailable" },
      { status: 503 }
    );
  }
}
