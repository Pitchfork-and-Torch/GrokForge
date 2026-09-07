import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonError, jsonOk, requireApiUser } from "@/lib/api-v1";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/** GET /api/v1/tasks/:id */
export async function GET(req: NextRequest, ctx: Ctx) {
  const auth = await requireApiUser(req, "tasks:read");
  if (!auth.ok) return auth.response;

  const { id } = await ctx.params;
  const task = await prisma.task.findUnique({
    where: { id },
    include: {
      project: {
        select: {
          id: true,
          slug: true,
          title: true,
          category: true,
          license: true,
          status: true,
          description: true,
        },
      },
      claims: {
        where: { active: true },
        select: {
          id: true,
          userId: true,
          claimedAt: true,
          expiresAt: true,
          user: { select: { handle: true } },
        },
        take: 5,
      },
    },
  });

  if (!task) return jsonError("Task not found", 404);

  return jsonOk({
    id: task.id,
    title: task.title,
    prompt: task.prompt,
    acceptanceCriteria: task.acceptanceCriteria,
    estimatedTokens: task.estimatedTokens,
    status: task.status,
    parentId: task.parentId,
    sortOrder: task.sortOrder,
    createdAt: task.createdAt.toISOString(),
    project: task.project,
    activeClaims: task.claims.map((c) => ({
      id: c.id,
      handle: c.user.handle,
      claimedAt: c.claimedAt.toISOString(),
      expiresAt: c.expiresAt?.toISOString() ?? null,
      mine: c.userId === auth.user.id,
    })),
    projectUrl: `/projects/${task.project.slug}`,
    taskAnchor: `/projects/${task.project.slug}#task-${task.id}`,
  });
}
