import { NextRequest } from "next/server";
import {
  jsonError,
  jsonOk,
  publicBaseUrl,
  readJsonBody,
  requireApiUser,
} from "@/lib/api-v1";
import { submitContributionForUser } from "@/lib/task-ops";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/**
 * POST /api/v1/tasks/:id/submit
 * Body: { body: string, sources?: string, contentType?: string }
 */
export async function POST(req: NextRequest, ctx: Ctx) {
  const auth = await requireApiUser(req, "contributions:write");
  if (!auth.ok) return auth.response;

  const parsed = await readJsonBody(req);
  if (!parsed.ok) return parsed.response;

  const { id } = await ctx.params;
  const body = String(parsed.body.body ?? parsed.body.content ?? "");
  const sources = String(parsed.body.sources ?? "");
  const contentType = String(parsed.body.contentType ?? "markdown");

  const res = await submitContributionForUser(auth.user, {
    taskId: id,
    body,
    sources,
    contentType,
  });

  if ("error" in res) {
    const status =
      res.error === "Task not found"
        ? 404
        : res.error.startsWith("Rate limit")
          ? 429
          : 400;
    return jsonError(res.error, status);
  }

  const base = publicBaseUrl(req);
  const auto = "autoAccepted" in res && res.autoAccepted;
  return jsonOk({
    ok: true,
    contributionId: res.contributionId,
    receiptPath: res.receiptPath,
    receiptUrl: `${base}${res.receiptPath}`,
    status: auto ? "ACCEPTED" : "PENDING",
    autoAccepted: !!auto,
    qualityStrength:
      "qualityStrength" in res ? res.qualityStrength ?? null : null,
    message: auto
      ? "Strong-worker quality auto-accept. Ready-set may unlock next leaves."
      : "Submitted for peer review. Public receipt on the ledger.",
  });
}
