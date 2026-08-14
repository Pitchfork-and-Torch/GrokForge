import { NextRequest } from "next/server";
import { TaskStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { jsonOk, requireApiUser } from "@/lib/api-v1";

export const dynamic = "force-dynamic";

/** GET /api/v1/tasks?status=OPEN&project=slug&limit=20 */
export async function GET(req: NextRequest) {
  const auth = await requireApiUser(req, "tasks:read");
  if (!auth.ok) return auth.response;

  const sp = req.nextUrl.searchParams;
  const statusParam = (sp.get("status") || "OPEN").toUpperCase();
  const projectSlug = sp.get("project") || sp.get("slug") || "";
  const limit = Math.min(50, Math.max(1, Number(sp.get("limit") || 20) || 20));

  const allowed = new Set(Object.values(TaskStatus));
  const status = allowed.has(statusParam as TaskStatus)
    ? (statusParam as TaskStatus)
    : TaskStatus.OPEN;

  const tasks = await prisma.task.findMany({
    where: {
      status,
      ...(projectSlug
        ? { project: { slug: projectSlug } }
        : { project: { status: { in: ["ACTIVE", "FUNDED"] } } }),
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      title: true,
      prompt: true,
      acceptanceCriteria: true,
      estimatedTokens: true,
      status: true,
      parentId: true,
      sortOrder: true,
      createdAt: true,
      project: {
        select: {
          id: true,
          slug: true,
          title: true,
          category: true,
          license: true,
          status: true,
        },
      },
    },
  });

  return jsonOk({
    count: tasks.length,
    tasks: tasks.map((t) => ({
      id: t.id,
      title: t.title,
      prompt: t.prompt,
      acceptanceCriteria: t.acceptanceCriteria,
      estimatedTokens: t.estimatedTokens,
      status: t.status,
      parentId: t.parentId,
      sortOrder: t.sortOrder,
      createdAt: t.createdAt.toISOString(),
      project: t.project,
      projectUrl: `/projects/${t.project.slug}`,
      taskAnchor: `/projects/${t.project.slug}#task-${t.id}`,
    })),
  });
}
