import { prisma } from "@/lib/prisma";
import { fetchUserBadges } from "@/lib/badges-data";

export const dynamic = "force-dynamic";

function esc(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** 1200x630 achievement share card for X posts */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ handle: string }> }
) {
  const { handle: raw } = await ctx.params;
  const handle = decodeURIComponent(raw).replace(/^@/, "").slice(0, 40);

  let rep = 0;
  let badges: { label: string }[] = [];
  let accepted = 0;
  try {
    const user = await prisma.user.findFirst({
      where: { handle: { equals: handle, mode: "insensitive" } },
      select: {
        id: true,
        reputation: true,
        _count: {
          select: {
            contributions: { where: { status: "ACCEPTED" } },
          },
        },
      },
    });
    if (user) {
      rep = user.reputation;
      accepted = user._count.contributions;
      badges = (await fetchUserBadges(user.id)).slice(0, 6).map((b) => ({
        label: b.label,
      }));
    }
  } catch {
    /* empty card still renders */
  }

  const badgeText =
    badges.length > 0
      ? badges.map((b) => b.label).join("  ·  ")
      : "Builder";

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630" role="img">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#050505"/>
      <stop offset="55%" stop-color="#0a0a0a"/>
      <stop offset="100%" stop-color="#1a1205"/>
    </linearGradient>
    <radialGradient id="glow" cx="80%" cy="20%" r="50%">
      <stop offset="0%" stop-color="#f59e0b" stop-opacity="0.25"/>
      <stop offset="100%" stop-color="#f59e0b" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <rect width="1200" height="630" fill="url(#glow)"/>
  <rect x="40" y="40" width="1120" height="550" rx="32" fill="#121212" stroke="#f59e0b" stroke-opacity="0.35"/>
  <rect x="72" y="72" width="72" height="72" rx="16" fill="#f59e0b"/>
  <text x="108" y="120" text-anchor="middle" font-family="system-ui,Segoe UI,sans-serif" font-size="28" font-weight="900" fill="#050505">GF</text>
  <text x="164" y="108" font-family="system-ui,Segoe UI,sans-serif" font-size="22" font-weight="600" fill="#a8a29e">GrokForge achievements</text>
  <text x="72" y="220" font-family="system-ui,Segoe UI,sans-serif" font-size="64" font-weight="800" fill="#fafaf9">@${esc(handle)}</text>
  <text x="72" y="280" font-family="system-ui,Segoe UI,sans-serif" font-size="28" fill="#f59e0b">${rep} rep · ${accepted} accepted</text>
  <text x="72" y="360" font-family="system-ui,Segoe UI,sans-serif" font-size="26" fill="#d6d3d1">${esc(badgeText.slice(0, 72))}</text>
  <text x="72" y="520" font-family="system-ui,Segoe UI,sans-serif" font-size="20" fill="#78716c">greater-good multi-agent work · grokforge.app</text>
</svg>`;

  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
    },
  });
}
