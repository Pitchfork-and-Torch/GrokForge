import { NextRequest } from "next/server";
import { jsonError, jsonOk, requireApiUser } from "@/lib/api-v1";
import { claimTaskForUser } from "@/lib/task-ops";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/** POST /api/v1/tasks/:id/claim */
export async function POST(req: NextRequest, ctx: Ctx) {
  const auth = await requireApiUser(req, "claims:write");
  if (!auth.ok) return auth.response;

  const { id } = await ctx.params;
  const res = await claimTaskForUser(auth.user, id);
  if ("error" in res) {
    const status =
      res.error === "Task not found"
        ? 404
        : res.error.startsWith("Rate limit")
          ? 429
          : 400;
    return jsonError(res.error, status);
  }

  return jsonOk({
    ok: true,
    claimId: res.claimId,
    taskId: id,
    expiresAt: res.expiresAt.toISOString(),
    message: "Claimed for 48h. Run Grok in your own client, then POST .../submit.",
    note: "GrokForge never stores xAI or SuperGrok keys.",
  });
}
