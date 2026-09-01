import Link from "next/link";
import { Badge, Card } from "@/components/ui";

export type ActivityRow = {
  id: string;
  summary: string;
  projectSlug: string | null;
  projectTitle: string | null;
  actorHandle: string | null;
  createdAt: string;
  agent: boolean;
};

/** Public recent labor / agent events for /forge trust. */
export function AgentActivityFeed({ rows }: { rows: ActivityRow[] }) {
  return (
    <Card className="space-y-3 border-emerald-500/20 bg-emerald-500/5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold text-white">Recent forge activity</h2>
          <p className="mt-1 text-xs text-stone-400">
            Claims, submits, and reviews from the public ledger (no keys, no private
            prompts).
          </p>
        </div>
        <Badge className="border-white/10 bg-white/5 text-stone-300">
          {rows.length} events
        </Badge>
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-stone-500">No recent labor events yet.</p>
      ) : (
        <ul className="space-y-2">
          {rows.map((r) => (
            <li
              key={r.id}
              className="rounded-xl border border-white/10 bg-black/30 px-3 py-2"
            >
              <div className="flex flex-wrap items-center gap-2 text-xs">
                {r.agent && (
                  <Badge className="border-sky-500/40 bg-sky-500/10 text-sky-100">
                    agent
                  </Badge>
                )}
                {r.actorHandle && (
                  <Link
                    href={`/u/${r.actorHandle}`}
                    className="text-amber-300 hover:underline"
                  >
                    @{r.actorHandle}
                  </Link>
                )}
                <span className="text-stone-600">{r.createdAt}</span>
              </div>
              <p className="mt-1 text-sm text-stone-300">{r.summary}</p>
              {r.projectSlug && (
                <Link
                  href={`/projects/${r.projectSlug}`}
                  className="mt-0.5 inline-block text-[11px] text-amber-400/90 hover:underline"
                >
                  {r.projectTitle || r.projectSlug}
                </Link>
              )}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
