import { ImageResponse } from "next/og";

export const alt = "GrokForge - multi-agent work for the greater good";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  let projects = 0;
  let tasks = 0;
  try {
    const { prisma } = await import("@/lib/prisma");
    projects = await prisma.project.count({ where: { status: "ACTIVE" } });
    tasks = await prisma.task.count({
      where: {
        status: "OPEN",
        parentId: { not: null },
        project: { status: { in: ["ACTIVE", "FUNDED"] } },
      },
    });
  } catch {
    /* defaults */
  }

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
              width: 64,
              height: 64,
              borderRadius: 16,
              background: "#f59e0b",
              color: "#050505",
              fontSize: 26,
              fontWeight: 900,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            GF
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", fontSize: 32, fontWeight: 800, color: "#fbbf24" }}>
              GrokForge
            </div>
            <div style={{ display: "flex", fontSize: 18, color: "#a8a29e" }}>
              Obsidian Amber
            </div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ display: "flex", fontSize: 52, fontWeight: 800, maxWidth: 1000, lineHeight: 1.15 }}>
            Crowdsource multi-agent work for the greater good
          </div>
          <div style={{ display: "flex", fontSize: 26, color: "#f59e0b" }}>
            {projects} projects | {tasks} open tasks | public ledgers | Sign in with X
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
          <div style={{ display: "flex" }}>never stores user API keys</div>
          <div style={{ display: "flex" }}>grokforge.app</div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
