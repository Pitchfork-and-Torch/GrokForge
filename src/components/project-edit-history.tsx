"use client";

import { useState } from "react";
import { Button, Card } from "@/components/ui";

export type EditHistoryRow = {
  id: string;
  field: string;
  summary: string;
  actorHandle: string | null;
  createdAt: string;
  oldValue?: string | null;
  newValue?: string | null;
};

export function ProjectEditHistory({
  rows,
  createdAtIso,
  createdAtLabel,
}: {
  rows: EditHistoryRow[];
  createdAtIso: string;
  createdAtLabel: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Card className="space-y-2 border-white/10">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-stone-500">
            Project timeline
          </p>
          <p className="text-sm text-stone-300">
            Created{" "}
            <time dateTime={createdAtIso} className="text-amber-100/90">
              {createdAtLabel}
            </time>
          </p>
        </div>
        <Button
          type="button"
          variant="secondary"
          className="text-xs"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? "Hide edit history" : `Edit history (${rows.length})`}
        </Button>
      </div>
      {open && (
        <ul className="max-h-72 space-y-2 overflow-y-auto border-t border-white/5 pt-2 text-xs text-stone-400">
          <li className="rounded-lg border border-white/5 bg-black/20 px-3 py-2">
            <span className="text-emerald-300/90">created</span> · project opened ·{" "}
            <time dateTime={createdAtIso}>{createdAtLabel}</time>
          </li>
          {rows.length === 0 && (
            <li className="px-1 text-stone-600">No edits recorded yet.</li>
          )}
          {rows.map((r) => (
            <li
              key={r.id}
              className="rounded-lg border border-white/5 bg-black/20 px-3 py-2"
            >
              <div className="flex flex-wrap gap-x-2 gap-y-0.5">
                <span className="font-medium text-amber-200/90">{r.field}</span>
                <span className="text-stone-500">{r.createdAt}</span>
                {r.actorHandle && (
                  <span className="text-stone-400">@{r.actorHandle}</span>
                )}
              </div>
              <p className="mt-0.5 text-stone-300">{r.summary}</p>
              {(r.oldValue || r.newValue) && (
                <details className="mt-1">
                  <summary className="cursor-pointer text-stone-500 hover:text-stone-300">
                    Diff snippet
                  </summary>
                  <pre className="mt-1 max-h-24 overflow-auto whitespace-pre-wrap break-words text-[10px] text-stone-500">
                    {r.oldValue ? `- ${r.oldValue.slice(0, 400)}\n` : ""}
                    {r.newValue ? `+ ${r.newValue.slice(0, 400)}` : ""}
                  </pre>
                </details>
              )}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
