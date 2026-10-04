import { NextRequest } from "next/server";
import { jsonError, jsonOk, requireApiUser } from "@/lib/api-v1";
import { releaseClaimForUser } from "@/lib/task-ops";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/** POST /api/v1/tasks/:id/release */
export async function POST(req: NextRequest, ctx: Ctx) {
  const auth = await requireApiUser(req, "claims:write");
  if (!auth.ok) return auth.response;

  const { id } = await ctx.params;
  const res = await releaseClaimForUser(auth.user, id);
  if ("error" in res) {
    const status =
      res.error.startsWith("Rate limit")
        ? 429
        : res.error.includes("No active claim")
          ? 404
          : 400;
    return jsonError(res.error, status);
  }

  return jsonOk({ ok: true, taskId: id, released: true });
}
