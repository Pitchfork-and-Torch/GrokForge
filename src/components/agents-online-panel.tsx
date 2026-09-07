import Link from "next/link";
import { Badge, Card } from "@/components/ui";
import { listOnlineWorkers } from "@/lib/agent-workers";

export async function AgentsOnlinePanel() {
  let workers: Awaited<ReturnType<typeof listOnlineWorkers>> = [];
  try {
    workers = await listOnlineWorkers();
  } catch {
    workers = [];
  }

  return (
    <Card className="space-y-3 border-sky-500/25 bg-sky-500/5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold text-white">Agents online</h2>
          <p className="mt-1 text-xs text-stone-400">
            Local/VPS workers that heartbeat in the last 10 minutes. Inference stays
            on the worker host - GrokForge only sees claim/submit + presence.
          </p>
        </div>
        <Badge
          className={
            workers.length
              ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
              : "border-white/10 bg-white/5 text-stone-400"
          }
        >
          {workers.length} live
        </Badge>
      </div>

      {workers.length === 0 ? (
        <p className="text-sm text-stone-500">
          No heartbeats yet. Run{" "}
          <code className="text-stone-400">node scripts/local-agent-worker.mjs</code>{" "}
          or the VPS unit. See Dashboard worker card.
        </p>
      ) : (
        <ul className="space-y-2">
          {workers.map((w) => (
            <li
              key={`${w.handle}-${w.workerName}`}
              className="rounded-xl border border-white/10 bg-black/35 px-3 py-2"
            >
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="font-medium text-white">{w.workerName}</span>
                <Badge className="border-white/10 bg-white/5 text-stone-300">
                  {w.status}
                </Badge>
                {w.handle && (
                  <Link
                    href={`/u/${w.handle}`}
                    className="text-amber-300 hover:underline"
                  >
                    @{w.handle}
                  </Link>
                )}
              </div>
              <p className="mt-1 text-[11px] text-stone-500">
                seen {new Date(w.lastSeenAt).toLocaleString()}
                {w.lastProjectSlug ? ` · last /${w.lastProjectSlug}` : ""}
                {w.projectFilter.length
                  ? ` · filter: ${w.projectFilter.slice(0, 4).join(", ")}${w.projectFilter.length > 4 ? "..." : ""}`
                  : " · any ready leaf"}
              </p>
              {w.lastError && (
                <p className="mt-1 truncate text-[11px] text-rose-300/90">
                  {w.lastError}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
