import { NextRequest, NextResponse } from "next/server";
import { buildZipBuffer } from "@/lib/seal-package";
import { loadPackageFilesForProject } from "@/lib/seal-ops";

export const dynamic = "force-dynamic";

/**
 * GET /api/projects/:slug/package
 * Public download of the sealed open-license package (regenerated from DB).
 */
export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await ctx.params;
    if (!slug) {
      return NextResponse.json({ error: "Missing slug" }, { status: 400 });
    }
    const url = new URL(req.url);
    const version = url.searchParams.get("v") || undefined;

    const pack = await loadPackageFilesForProject(slug, { version });
    if ("error" in pack) {
      return NextResponse.json({ error: pack.error }, { status: 404 });
    }

    // Require a primary package artifact (project was sealed) unless ?preview=1 with auth later
    const { prisma } = await import("@/lib/prisma");
    const sealed = await prisma.artifact.findFirst({
      where: { project: { slug }, source: "package" },
      select: { id: true },
    });
    if (!sealed) {
      return NextResponse.json(
        { error: "Project has not been sealed yet" },
        { status: 404 }
      );
    }

    const zip = buildZipBuffer(pack.files);
    return new NextResponse(new Uint8Array(zip), {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${pack.zipName}"`,
        "Content-Length": String(zip.length),
        "Cache-Control": "public, max-age=60",
        "X-Content-Hash": pack.hash,
        "X-Package-Version": pack.version,
      },
    });
  } catch (e) {
    console.error("[package download]", e);
    return NextResponse.json({ error: "Package unavailable" }, { status: 503 });
  }
}
