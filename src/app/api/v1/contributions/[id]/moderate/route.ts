import { NextRequest } from "next/server";
import { requireApiUser, readJsonBody, jsonOk, jsonError } from "@/lib/api-v1";
import { moderateContributionForUser } from "@/lib/moderation-ops";

export const dynamic = "force-dynamic";

/**
 * POST /api/v1/contributions/:id/moderate
 * Body: { decision: "accept" | "reject", notes?: string }
 * Scope: moderation:write (founder elevated token)
 */
export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const auth = await requireApiUser(req, "moderation:write");
  if (!auth.ok) return auth.response;

  const { id } = await ctx.params;
  if (!id) return jsonError("Missing contribution id", 400);

  const body = await readJsonBody(req);
  if (!body.ok) return body.response;

  const decision = String(body.body.decision || "").toLowerCase();
  if (decision !== "accept" && decision !== "reject") {
    return jsonError('decision must be "accept" or "reject"', 400);
  }
  const notes =
    typeof body.body.notes === "string" ? body.body.notes : undefined;

  const res = await moderateContributionForUser(
    {
      id: auth.user.id,
      handle: auth.user.handle,
      name: auth.user.name,
    },
    id,
    decision,
    notes,
    { via: "api", founderOverride: true }
  );

  if ("error" in res) {
    const status =
      res.error.includes("Only") || res.error.includes("founder")
        ? 403
        : res.error.includes("Not found")
          ? 404
          : 400;
    return jsonError(res.error, status);
  }

  return jsonOk({
    ok: true,
    contributionId: id,
    accepted: res.accepted,
    decision,
    message: res.accepted
      ? "Contribution accepted; task marked ACCEPTED."
      : "Contribution rejected; task reopened.",
  });
}
