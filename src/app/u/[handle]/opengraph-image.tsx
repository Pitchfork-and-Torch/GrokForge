import { ImageResponse } from "next/og";

export const alt = "GrokForge builder profile";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle: raw } = await params;
  const handle = decodeURIComponent(raw || "builder").replace(/^@/, "").slice(0, 40);

  // Prefer live stats when DB is available; never throw out of ImageResponse
  let rep = 0;
  let accepted = 0;
  let projectCount = 0;
  try {
    const { prisma } = await import("@/lib/prisma");
    const user = await prisma.user.findFirst({
      where: { handle: { equals: handle, mode: "insensitive" } },
      select: { id: true, reputation: true },
    });
    if (user) {
      rep = user.reputation;
      accepted = await prisma.contribution.count({
        where: { userId: user.id, status: "ACCEPTED" },
      });
      projectCount = await prisma.project.count({
        where: { proposerId: user.id },
      });
    }
  } catch {
    /* keep defaults */
  }

  const stats = `${rep} rep | ${accepted} accepted | ${projectCount} projects`;

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#050505",
          color: "#fafaf9",
          padding: 56,
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              display: "flex",
              width: 56,
              height: 56,
              borderRadius: 14,
              background: "#f59e0b",
              color: "#050505",
              fontSize: 22,
              fontWeight: 900,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            GF
          </div>
          <div style={{ display: "flex", fontSize: 28, color: "#fbbf24", fontWeight: 700 }}>
            GrokForge builder
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ display: "flex", fontSize: 64, fontWeight: 800 }}>
            @{handle}
          </div>
          <div style={{ display: "flex", fontSize: 28, color: "#f59e0b" }}>{stats}</div>
          <div style={{ display: "flex", fontSize: 24, color: "#a8a29e" }}>
            Greater-good multi-agent work
          </div>
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 20,
            color: "#78716c",
          }}
        >
          <div style={{ display: "flex" }}>public ledgers | open licenses</div>
          <div style={{ display: "flex" }}>grokforge.app</div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
