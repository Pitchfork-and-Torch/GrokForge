import { NextRequest, NextResponse } from "next/server";
import { loadPackageFilesForProject } from "@/lib/seal-ops";
import {
  buildGeneratedSkillPack,
  extractSkillsFromPackageFiles,
} from "@/lib/skill-pack";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * GET /api/projects/:slug/skill-pack
 * Returns JSON skill pack (installable Agent Skills) from sealed package + accepted leaves.
 * ?format=zip not implemented as binary zip in edge-free path; clients write files from JSON.
 */
export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ slug: string }> }
) {
  const { slug } = await ctx.params;
  const project = await prisma.project.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      title: true,
      description: true,
      license: true,
      tasks: {
        where: { parentId: { not: null }, status: "ACCEPTED" },
        orderBy: { sortOrder: "asc" },
        include: {
          contributions: {
            where: { status: "ACCEPTED" },
            orderBy: { createdAt: "desc" },
            take: 1,
            select: { body: true },
          },
        },
      },
    },
  });
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const pack = await loadPackageFilesForProject(project.id);
  const fromSeal =
    "ok" in pack && pack.ok
      ? extractSkillsFromPackageFiles(pack.files)
      : [];

  const generated = buildGeneratedSkillPack({
    slug: project.slug,
    title: project.title,
    description: project.description,
    license: project.license || "MIT",
    leaves: project.tasks.map((t) => ({
      title: t.title,
      prompt: t.prompt,
      acceptanceCriteria: t.acceptanceCriteria,
      body: t.contributions[0]?.body || null,
    })),
  });

  const files = [...fromSeal, ...generated];
  const url = new URL(req.url);
  const format = url.searchParams.get("format") || "json";

  if (format === "md" && files[0]) {
    return new NextResponse(files[0].content, {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": `attachment; filename="${project.slug}-SKILL.md"`,
      },
    });
  }

  return NextResponse.json({
    ok: true,
    slug: project.slug,
    title: project.title,
    installHint:
      "Write each files[].path under ~/.grok/skills/ (or your agent skills root)",
    files,
    sealedSkillCount: fromSeal.length,
    generated: true,
  });
}
