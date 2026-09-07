"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui";

export type ActivityItem = {
  id: string;
  kind: string;
  summary: string;
  createdAt: string;
  project: { slug: string; title: string };
};

const DEFAULT_VISIBLE = 3;

export function RecentActivity({
  items: initial,
  pollMs = 60_000,
}: {
  items: ActivityItem[];
  /** Soft poll for near-real-time feel; 0 disables */
  pollMs?: number;
}) {
  const [items, setItems] = useState(initial);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    setItems(initial);
  }, [initial]);

  useEffect(() => {
    if (!pollMs || pollMs < 10_000) return;
    let cancelled = false;
    const tick = async () => {
      try {
        const res = await fetch("/api/activity?limit=12", { cache: "no-store" });
        if (!res.ok || cancelled) return;
        const data = await res.json();
        if (data?.ok && Array.isArray(data.items)) {
          setItems(data.items);
        }
      } catch {
        /* degraded offline */
      }
    };
    const id = window.setInterval(tick, pollMs);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [pollMs]);

  const hasMore = items.length > DEFAULT_VISIBLE;
  const visible = expanded ? items : items.slice(0, DEFAULT_VISIBLE);

  return (
    <div>
      <Card className="divide-y divide-white/5 overflow-hidden p-0">
        {visible.map((e) => (
          <div
            key={e.id}
            className="flex flex-wrap items-start justify-between gap-2 px-4 py-3 text-sm"
          >
            <div className="min-w-0">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-stone-600">
                {e.kind}
              </span>
              <p className="text-stone-300">{e.summary}</p>
              <Link
                href={`/projects/${e.project.slug}`}
                className="text-xs text-amber-400 hover:underline"
              >
                {e.project.title}
              </Link>
            </div>
            <time className="shrink-0 text-[11px] text-stone-600">{e.createdAt}</time>
          </div>
        ))}
        {items.length === 0 && (
          <p className="p-6 text-sm text-stone-500">
            No network activity yet. Propose a project or claim a task to start the tape.
          </p>
        )}
      </Card>
      {hasMore && (
        <div className="mt-2 flex justify-center">
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-semibold text-stone-300 hover:border-[color:var(--accent)]/40 hover:text-[color:var(--accent-hover)]"
            aria-expanded={expanded}
          >
            {expanded
              ? "Show less"
              : `Show ${items.length - DEFAULT_VISIBLE} more actions`}
          </button>
        </div>
      )}
    </div>
  );
}
