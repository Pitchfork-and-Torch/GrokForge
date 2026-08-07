import { NextRequest } from "next/server";
import { requireApiUser, jsonOk, jsonError } from "@/lib/api-v1";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/contributions?status=PENDING&project=slug&limit=20
 * List contributions (founder elevated or any token with contributions:write for own work).
 * With moderation:write: any pending on the network (filterable).
 * Without: only the caller's contributions.
 */
export async function GET(req: NextRequest) {
  const auth = await requireApiUser(req, "contributions:write");
  if (!auth.ok) return auth.response;

  const url = new URL(req.url);
  const status = (url.searchParams.get("status") || "PENDING").toUpperCase();
  const project = url.searchParams.get("project") || undefined;
  const limit = Math.min(
    50,
    Math.max(1, Number(url.searchParams.get("limit") || 20) || 20)
  );

  const allowed = new Set(["PENDING", "ACCEPTED", "REJECTED"]);
  if (!allowed.has(status)) {
    return jsonError("status must be PENDING, ACCEPTED, or REJECTED", 400);
  }

  const { hasScope } = await import("@/lib/api-tokens");
  const canModerate = hasScope(auth.user.scopes, "moderation:write");

  const rows = await prisma.contribution.findMany({
    where: {
      status: status as "PENDING" | "ACCEPTED" | "REJECTED",
      ...(canModerate ? {} : { userId: auth.user.id }),
      ...(project
        ? {
            task: {
              project: {
                OR: [{ slug: project }, { id: project }],
              },
            },
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      user: { select: { handle: true, id: true } },
      task: {
        select: {
          id: true,
          title: true,
          status: true,
          project: { select: { id: true, slug: true, title: true } },
        },
      },
    },
  });

  return jsonOk({
    count: rows.length,
    canModerate,
    contributions: rows.map((c) => ({
      id: c.id,
      status: c.status,
      score: c.score,
      contentType: c.contentType,
      bodyPreview: c.body.slice(0, 240),
      sources: c.sources,
      createdAt: c.createdAt.toISOString(),
      author: c.user.handle,
      taskId: c.task.id,
      taskTitle: c.task.title,
      taskStatus: c.task.status,
      project: c.task.project,
      receiptPath: `/c/${c.id}`,
    })),
  });
}
