import { NextRequest } from "next/server";
import {
  jsonError,
  jsonOk,
  readJsonBody,
  requireApiUser,
} from "@/lib/api-v1";
import { upsertWorkerHeartbeat } from "@/lib/agent-workers";

export const dynamic = "force-dynamic";

/**
 * POST /api/v1/agent/heartbeat
 * Local/VPS workers report presence. No model keys accepted.
 *
 * Body:
 * {
 *   workerName: string,
 *   status?: "idle"|"busy"|"error",
 *   projectFilter?: string[] | string,
 *   lastTaskId?, lastProjectSlug?, lastError?,
 *   event?: "ping"|"claim"|"submit"|"error",
 *   meta?: object
 * }
 */
export async function POST(req: NextRequest) {
  const auth = await requireApiUser(req, "tasks:read");
  if (!auth.ok) return auth.response;

  const parsed = await readJsonBody(req);
  if (!parsed.ok) return parsed.response;

  const workerName = String(parsed.body.workerName || "").trim();
  if (!workerName) return jsonError("workerName required", 400);

  try {
    const row = await upsertWorkerHeartbeat({
      userId: auth.user.id,
      workerName,
      status: typeof parsed.body.status === "string" ? parsed.body.status : "idle",
      projectFilter:
        (parsed.body.projectFilter as string[] | string | undefined) ?? null,
      lastTaskId:
        typeof parsed.body.lastTaskId === "string"
          ? parsed.body.lastTaskId
          : null,
      lastProjectSlug:
        typeof parsed.body.lastProjectSlug === "string"
          ? parsed.body.lastProjectSlug
          : null,
      lastError:
        typeof parsed.body.lastError === "string"
          ? parsed.body.lastError
          : null,
      event:
        typeof parsed.body.event === "string" ? parsed.body.event : "ping",
      meta:
        parsed.body.meta && typeof parsed.body.meta === "object"
          ? (parsed.body.meta as Record<string, unknown>)
          : null,
    });

    return jsonOk({
      ok: true,
      workerName: row.workerName,
      status: row.status,
      lastSeenAt: row.lastSeenAt.toISOString(),
    });
  } catch (e) {
    return jsonError(
      e instanceof Error ? e.message.slice(0, 200) : "Heartbeat failed",
      400
    );
  }
}
