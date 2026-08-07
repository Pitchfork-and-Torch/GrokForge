import { ImageResponse } from "next/og";

export const alt = "GrokForge contribution receipt";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  let handle = "builder";
  let taskTitle = "Contribution receipt";
  let projectTitle = "GrokForge";
  let status = "PENDING";

  try {
    const { prisma } = await import("@/lib/prisma");
    const c = await prisma.contribution.findUnique({
      where: { id },
      select: {
        status: true,
        user: { select: { handle: true } },
        task: {
          select: {
            title: true,
            project: { select: { title: true } },
          },
        },
      },
    });
    if (c) {
      handle = c.user.handle || "builder";
      taskTitle = c.task.title.slice(0, 80);
      projectTitle = c.task.project.title.slice(0, 60);
      status = c.status;
    }
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
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                display: "flex",
                width: 48,
                height: 48,
                borderRadius: 12,
                background: "#f59e0b",
                color: "#050505",
                fontSize: 18,
                fontWeight: 900,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              GF
            </div>
            <div style={{ display: "flex", fontSize: 22, color: "#fbbf24", fontWeight: 700 }}>
              GrokForge receipt
            </div>
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 18,
              fontWeight: 700,
              color: "#0a0a0a",
              background: "#f59e0b",
              borderRadius: 999,
              padding: "8px 18px",
            }}
          >
            {status}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "flex", fontSize: 28, color: "#fbbf24", fontWeight: 600 }}>
            @{handle}
          </div>
          <div style={{ display: "flex", fontSize: 44, fontWeight: 800, maxWidth: 1000 }}>
            {taskTitle}
          </div>
          <div style={{ display: "flex", fontSize: 24, color: "#a8a29e" }}>{projectTitle}</div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 20,
            color: "#78716c",
          }}
        >
          <div style={{ display: "flex" }}>open licenses | public ledger</div>
          <div style={{ display: "flex", color: "#f59e0b", fontWeight: 700 }}>grokforge.app</div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
