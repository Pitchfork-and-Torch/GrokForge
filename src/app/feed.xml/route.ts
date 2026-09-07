import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 300;

const site =
  process.env.NEXTAUTH_URL?.replace(/\/$/, "") ||
  process.env.AUTH_URL?.replace(/\/$/, "") ||
  "https://grokforge.app";

function esc(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function GET() {
  let items: {
    id: string;
    summary: string;
    kind: string;
    createdAt: Date;
    project: { slug: string; title: string };
  }[] = [];

  try {
    items = await prisma.ledgerEntry.findMany({
      where: { project: { status: { in: ["ACTIVE", "FUNDED", "COMPLETED"] } } },
      orderBy: { createdAt: "desc" },
      take: 40,
      include: { project: { select: { slug: true, title: true } } },
    });
  } catch {
    items = [];
  }

  const lastBuild =
    items[0]?.createdAt.toUTCString() || new Date().toUTCString();

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>GrokForge network activity</title>
    <link>${esc(site)}/activity</link>
    <description>Public labor and capital ledger for multi-agent greater-good projects</description>
    <language>en-us</language>
    <lastBuildDate>${lastBuild}</lastBuildDate>
    ${items
      .map((e) => {
        const link = `${site}/projects/${e.project.slug}`;
        const title = `[${e.kind}] ${e.summary}`.slice(0, 200);
        return `<item>
      <title>${esc(title)}</title>
      <link>${esc(link)}</link>
      <guid isPermaLink="false">${esc(e.id)}</guid>
      <pubDate>${e.createdAt.toUTCString()}</pubDate>
      <description>${esc(`${e.summary} - ${e.project.title}`)}</description>
    </item>`;
      })
      .join("\n    ")}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
    },
  });
}
