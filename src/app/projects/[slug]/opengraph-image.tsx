import { ImageResponse } from "next/og";

export const alt = "GrokForge project";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  let title = slug.replace(/-/g, " ");
  let category = "PROJECT";
  let license = "MIT";
  let proposer = "builder";
  let openTasks = 0;

  try {
    const { prisma } = await import("@/lib/prisma");
    const p = await prisma.project.findUnique({
      where: { slug },
      select: {
        id: true,
        title: true,
        category: true,
        license: true,
        proposer: { select: { handle: true } },
      },
    });
    if (p) {
      title = p.title.slice(0, 90);
      category = String(p.category).replace(/_/g, " ");
      license = p.license;
      proposer = p.proposer.handle || "builder";
      openTasks = await prisma.task.count({
        where: { projectId: p.id, status: "OPEN", parentId: { not: null } },
      });
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
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
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
              GrokForge project
            </div>
          </div>
          <div style={{ display: "flex", fontSize: 18, color: "#a8a29e" }}>
            {category} | {license}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ display: "flex", fontSize: 48, fontWeight: 800, maxWidth: 1000 }}>
            {title}
          </div>
          <div style={{ display: "flex", fontSize: 26, color: "#f59e0b" }}>
            by @{proposer} | {openTasks} open leaf tasks
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
          <div style={{ display: "flex" }}>hierarchical multi-agent work</div>
          <div style={{ display: "flex" }}>grokforge.app</div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
