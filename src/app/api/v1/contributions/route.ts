import { NextRequest } from "next/server";
import { requireApiUser, jsonOk, jsonError } from "@/lib/api-v1";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/contributions?status=PENDING&project=slug&limit=20&peerable=1
 *
 * - Default: caller's own contributions (contributions:write)
 * - moderation:write: any contribution matching filters
 * - peerable=1 + status=PENDING: others' pending (second-builder review flywheel)
 */
export async function GET(req: NextRequest) {
  const auth = await requireApiUser(req, "contributions:write");
  if (!auth.ok) return auth.response;

  const url = new URL(req.url);
  const status = (url.searchParams.get("status") || "PENDING").toUpperCase();
  const project = url.searchParams.get("project") || undefined;
  const peerable =
    url.searchParams.get("peerable") === "1" ||
    url.searchParams.get("peerable") === "true";
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

  if (peerable && status !== "PENDING") {
    return jsonError("peerable=1 only applies to status=PENDING", 400);
  }

  const rows = await prisma.contribution.findMany({
    where: {
      status: status as "PENDING" | "ACCEPTED" | "REJECTED",
      ...(peerable
        ? {
            // Builder Flywheel: second-builder discovery of peer-review work
            userId: { not: auth.user.id },
            task: {
              project: {
                status: { in: ["ACTIVE", "FUNDED", "COMPLETED"] },
                ...(project
                  ? { OR: [{ slug: project }, { id: project }] }
                  : {}),
              },
            },
          }
        : {
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
          }),
    },
    orderBy: { createdAt: "asc" },
    take: limit,
    include: {
      user: { select: { handle: true, id: true } },
      reviews: { select: { id: true, reviewerId: true } },
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
    peerable: !!peerable,
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
      peerReviewCount: c.reviews.length,
      alreadyReviewedByMe: c.reviews.some((r) => r.reviewerId === auth.user.id),
      reviewHint: {
        method: "POST",
        path: `/api/v1/contributions/${c.id}/review`,
        body: { score: 4, notes: "optional" },
      },
    })),
  });
}
