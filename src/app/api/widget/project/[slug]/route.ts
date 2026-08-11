import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { projectTaskProgress } from "@/lib/utils";

export const dynamic = "force-dynamic";

/** Embeddable project progress JSON (+ simple HTML via ?format=html) */
export async function GET(
  req: Request,
  ctx: { params: Promise<{ slug: string }> }
) {
  const { slug } = await ctx.params;
  const url = new URL(req.url);
  const format = url.searchParams.get("format") || "json";

  const project = await prisma.project.findUnique({
    where: { slug },
    select: {
      title: true,
      slug: true,
      status: true,
      createdAt: true,
      license: true,
      tasks: { select: { id: true, status: true, parentId: true } },
      _count: { select: { thumbs: true, comments: true } },
    },
  });
  if (!project) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  const progress = projectTaskProgress(project.tasks);
  const payload = {
    title: project.title,
    slug: project.slug,
    status: project.status,
    createdAt: project.createdAt.toISOString(),
    license: project.license,
    progress: {
      completed: progress.completed,
      total: progress.total,
      pct:
        progress.total > 0
          ? Math.round((progress.completed / progress.total) * 100)
          : 0,
    },
    thumbs: project._count.thumbs,
    comments: project._count.comments,
    url: `https://grokforge.app/projects/${project.slug}`,
  };

  if (format === "html") {
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>${escapeHtml(
      project.title
    )}</title>
<style>body{font:14px system-ui;background:#0b0a09;color:#f5f0e8;margin:0;padding:12px}
.card{border:1px solid #3f3428;border-radius:12px;padding:12px;background:#161311}
a{color:#f59e0b;text-decoration:none}.bar{height:8px;background:#222;border-radius:99px;overflow:hidden;margin-top:8px}
.fill{height:100%;background:#f59e0b;width:${payload.progress.pct}%}</style></head>
<body><div class="card"><strong>${escapeHtml(project.title)}</strong>
<div style="opacity:.7;font-size:12px;margin-top:4px">${payload.progress.completed}/${payload.progress.total} tasks · ${project.status}</div>
<div class="bar"><div class="fill"></div></div>
<p style="margin:10px 0 0;font-size:12px"><a href="${payload.url}" target="_blank" rel="noopener">Open on GrokForge</a></p>
</div></body></html>`;
    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "public, s-maxage=60",
      },
    });
  }

  return NextResponse.json(payload, {
    headers: { "Cache-Control": "public, s-maxage=60" },
  });
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
