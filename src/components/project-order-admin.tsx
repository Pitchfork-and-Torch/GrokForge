"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button, Card } from "@/components/ui";
import { reorderProjectsAction } from "@/lib/actions";

export type OrderableProject = {
  id: string;
  slug: string;
  title: string;
  status: string;
  displayOrder: number;
};

/** Founder-only curated list editor for public project order. */
export function ProjectOrderAdmin({
  projects,
}: {
  projects: OrderableProject[];
}) {
  const router = useRouter();
  const [rows, setRows] = useState(projects);
  const [error, setError] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function move(index: number, dir: -1 | 1) {
    const next = index + dir;
    if (next < 0 || next >= rows.length) return;
    const copy = [...rows];
    const t = copy[index];
    copy[index] = copy[next];
    copy[next] = t;
    setRows(copy);
  }

  function save() {
    setError(null);
    setHint(null);
    start(async () => {
      const res = await reorderProjectsAction(rows.map((r) => r.id));
      if (res?.error) setError(res.error);
      else {
        setHint(`Saved order (${rows.length} projects). Viewers see this as default.`);
        router.refresh();
      }
    });
  }

  return (
    <Card className="space-y-3 border-amber-500/30 bg-amber-500/5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-amber-100">
            Founder: public project order
          </h2>
          <p className="mt-1 text-xs text-stone-400">
            Default viewer sort is this curated order (then newest). Use Up/Down,
            then Save order.
          </p>
        </div>
        <Button
          type="button"
          className="!text-xs"
          disabled={pending}
          onClick={save}
        >
          {pending ? "Saving..." : "Save order"}
        </Button>
      </div>
      <ol className="space-y-1.5">
        {rows.map((p, i) => (
          <li
            key={p.id}
            className="flex flex-wrap items-center gap-2 rounded-xl border border-white/10 bg-black/40 px-2.5 py-2"
          >
            <span className="w-6 shrink-0 text-center text-xs text-stone-500">
              {i + 1}
            </span>
            <div className="min-w-0 flex-1">
              <Link
                href={`/projects/${p.slug}`}
                className="block truncate text-sm font-medium text-white hover:text-amber-200"
              >
                {p.title}
              </Link>
              <p className="truncate text-[11px] text-stone-500">
                {p.status} · /{p.slug}
              </p>
            </div>
            <div className="flex shrink-0 gap-1">
              <Button
                type="button"
                variant="ghost"
                className="!px-2 !py-1 !text-xs"
                disabled={pending || i === 0}
                onClick={() => move(i, -1)}
              >
                Up
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="!px-2 !py-1 !text-xs"
                disabled={pending || i === rows.length - 1}
                onClick={() => move(i, 1)}
              >
                Down
              </Button>
            </div>
          </li>
        ))}
      </ol>
      {hint && <p className="text-xs text-emerald-400">{hint}</p>}
      {error && <p className="text-xs text-rose-400">{error}</p>}
    </Card>
  );
}
