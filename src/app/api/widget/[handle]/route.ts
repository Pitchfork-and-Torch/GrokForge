import { prisma } from "@/lib/prisma";
import { fetchUserBadges } from "@/lib/badges-data";
import { isFounderHandle } from "@/lib/identity";

export const dynamic = "force-dynamic";

function esc(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ handle: string }> }
) {
  const { handle: raw } = await ctx.params;
  const handle = decodeURIComponent(raw).replace(/^@/, "").slice(0, 40);

  let rep = 0;
  let badges: string[] = [];
  try {
    const user = await prisma.user.findFirst({
      where: { handle: { equals: handle, mode: "insensitive" } },
      select: { id: true, reputation: true, handle: true },
    });
    if (user) {
      rep = user.reputation;
      const b = await fetchUserBadges(user.id);
      badges = b.slice(0, 3).map((x) => x.label);
      if (isFounderHandle(user.handle) && !badges.includes("Founder")) {
        badges = ["Founder", ...badges].slice(0, 3);
      }
    }
  } catch {
    /* empty widget still renders */
  }

  const badgeLine = badges.length ? badges.join(" · ") : "Builder";
  const title = `@${handle}`;
  const sub = `GrokForge · ${rep} rep · ${badgeLine}`;

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="320" height="80" viewBox="0 0 320 80" role="img" aria-label="${esc(title)} on GrokForge">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0a0a0a"/>
      <stop offset="100%" stop-color="#1a1205"/>
    </linearGradient>
  </defs>
  <rect width="320" height="80" rx="14" fill="url(#g)" stroke="#f59e0b" stroke-opacity="0.45"/>
  <rect x="12" y="18" width="44" height="44" rx="10" fill="#f59e0b"/>
  <text x="34" y="47" text-anchor="middle" font-family="system-ui,Segoe UI,sans-serif" font-size="16" font-weight="800" fill="#050505">GF</text>
  <text x="70" y="36" font-family="system-ui,Segoe UI,sans-serif" font-size="16" font-weight="700" fill="#fafaf9">${esc(title)}</text>
  <text x="70" y="56" font-family="system-ui,Segoe UI,sans-serif" font-size="11" fill="#a8a29e">${esc(sub.slice(0, 48))}</text>
</svg>`;

  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
    },
  });
}
