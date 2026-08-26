import Link from "next/link";
import { Badge, Card } from "@/components/ui";
import {
  blockedOpenLeaves,
  computeReadySet,
  type DagTask,
} from "@/lib/task-dag";
import { formatTokens } from "@/lib/utils";

export function ReadySetPanel({
  tasks,
  projectSlug,
  compact = false,
}: {
  tasks: DagTask[];
  projectSlug: string;
  compact?: boolean;
}) {
  const all = computeReadySet(tasks);
  const ready = all.filter((t) => t.ready);
  const blocked = blockedOpenLeaves(tasks);
  const done = tasks.filter(
    (t) => t.parentId && t.status === "ACCEPTED"
  ).length;
  const leaves = tasks.filter((t) => t.parentId).length;

  return (
    <Card className="space-y-3 border-amber-500/20 bg-amber-500/5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-amber-100">Ready-set DAG</h3>
          <p className="mt-1 text-xs text-stone-400">
            Only leaves with accepted dependencies are claimable. Parallel work
            stays open unless listed in dependsOn.
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Badge className="border-emerald-500/30 bg-emerald-500/10 text-emerald-200">
            {ready.length} ready
          </Badge>
          <Badge className="border-white/10 bg-white/5 text-stone-300">
            {blocked.length} blocked
          </Badge>
          <Badge className="border-white/10 bg-white/5 text-stone-400">
            {done}/{leaves} done
          </Badge>
        </div>
      </div>

      {ready.length === 0 && (
        <p className="text-xs text-stone-500">
          No OPEN ready leaves. Unblock dependencies or add new leaves.
        </p>
      )}

      <ul className="space-y-2">
        {ready.slice(0, compact ? 5 : 20).map((t) => (
          <li
            key={t.id}
            className="rounded-xl border border-emerald-500/20 bg-black/30 px-3 py-2"
          >
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={`/projects/${projectSlug}#task-${t.id}`}
                className="text-sm font-medium text-white hover:text-amber-200"
              >
                {t.title}
              </Link>
              {t.goodFirst && (
                <Badge className="border-sky-500/30 bg-sky-500/10 text-sky-200">
                  good first
                </Badge>
              )}
              {t.estimatedTokens > 0 && (
                <span className="text-[11px] text-stone-500">
                  ~{formatTokens(t.estimatedTokens)}
                </span>
              )}
            </div>
            {t.tags.length > 0 && (
              <p className="mt-1 text-[10px] text-stone-600">
                {t.tags.join(" · ")}
              </p>
            )}
          </li>
        ))}
      </ul>

      {!compact && blocked.length > 0 && (
        <details className="text-xs text-stone-500">
          <summary className="cursor-pointer text-stone-400 hover:text-stone-200">
            Blocked leaves ({blocked.length})
          </summary>
          <ul className="mt-2 space-y-1.5">
            {blocked.slice(0, 15).map((t) => (
              <li key={t.id} className="rounded-lg border border-white/5 px-2 py-1.5">
                <span className="text-stone-300">{t.title}</span>
                <span className="block text-[10px] text-stone-600">
                  waiting on:{" "}
                  {t.blockedBy.map((b) => `${b.title} (${b.status})`).join(", ")}
                </span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </Card>
  );
}
