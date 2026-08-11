import { NextRequest } from "next/server";
import { jsonOk } from "@/lib/api-v1";
import { listOnlineWorkers, WORKER_ONLINE_MS } from "@/lib/agent-workers";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/agent/workers
 * Public list of workers seen recently (no secrets).
 * Query: ?withinMs=600000
 */
export async function GET(req: NextRequest) {
  const withinRaw = req.nextUrl.searchParams.get("withinMs");
  const withinMs = Math.min(
    60 * 60 * 1000,
    Math.max(60_000, Number(withinRaw) || WORKER_ONLINE_MS)
  );
  try {
    const workers = await listOnlineWorkers({ withinMs });
    return jsonOk({
      ok: true,
      withinMs,
      count: workers.length,
      workers,
      rails: {
        neverStoreSuperGrokKeys: true,
        inferenceLocal: true,
      },
    });
  } catch {
    // Table may not exist until db push
    return jsonOk({
      ok: true,
      withinMs,
      count: 0,
      workers: [],
      note: "No worker heartbeats yet",
    });
  }
}
