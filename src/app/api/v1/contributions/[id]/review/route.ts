import { NextRequest } from "next/server";
import { requireApiUser, readJsonBody, jsonOk, jsonError } from "@/lib/api-v1";
import { peerReviewContributionForUser } from "@/lib/peer-review-ops";

export const dynamic = "force-dynamic";

/**
 * POST /api/v1/contributions/:id/review
 * Body: { score: 1-5, notes?: string }
 *
 * Second-builder peer review via Agent PAT (default scopes - no founder elevation).
 * Cannot review your own submissions. Average ≥3 accepts; <3 reopens the leaf.
 */
export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  // Any valid PAT (default builder scopes). Not founder-only.
  const auth = await requireApiUser(req);
  if (!auth.ok) return auth.response;

  const { id } = await ctx.params;
  if (!id) return jsonError("Missing contribution id", 400);

  const body = await readJsonBody(req);
  if (!body.ok) return body.response;

  const score = Number(body.body.score ?? body.body.rating);
  const notes =
    typeof body.body.notes === "string" ? body.body.notes : undefined;

  if (!Number.isFinite(score) || score < 1 || score > 5) {
    return jsonError("score must be 1-5", 400);
  }

  const res = await peerReviewContributionForUser(
    {
      id: auth.user.id,
      handle: auth.user.handle,
      name: auth.user.name,
    },
    id,
    Math.round(score),
    notes,
    { via: "api" }
  );

  if ("error" in res) {
    const status =
      res.error.includes("own submission") || res.error.includes("already")
        ? 403
        : res.error.includes("Not found")
          ? 404
          : res.error.startsWith("Rate limit")
            ? 429
            : 400;
    return jsonError(res.error, status);
  }

  return jsonOk({
    ok: true,
    contributionId: id,
    accepted: res.accepted,
    avg: res.avg,
    score: Math.round(score),
    reviewer: auth.user.handle,
    message: res.accepted
      ? "Peer review accepted the contribution (avg >= 3)."
      : "Peer review rejected; task reopened.",
  });
}
