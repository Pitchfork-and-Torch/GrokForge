"use client";

import { useState } from "react";
import { Card } from "@/components/ui";
import { formatCents } from "@/lib/utils";

export type LedgerRow = {
  id: string;
  kind: string;
  summary: string;
  amountCents: number;
  createdAtLabel: string;
};

/** Public ledger: first 3 entries visible; expand for the rest. */
export function CollapsibleLedger({
  entries,
  defaultVisible = 3,
}: {
  entries: LedgerRow[];
  defaultVisible?: number;
}) {
  const [open, setOpen] = useState(false);
  const visible = open ? entries : entries.slice(0, defaultVisible);
  const hidden = Math.max(0, entries.length - defaultVisible);

  return (
    <div className="space-y-2">
      <Card className="divide-y divide-white/5 overflow-hidden p-0">
        {visible.map((e) => (
          <div
            key={e.id}
            className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm"
          >
            <div>
              <span className="text-xs uppercase tracking-wide text-stone-500">
                {e.kind}
              </span>
              <p className="text-stone-300">{e.summary}</p>
            </div>
            <div className="text-right text-xs text-stone-500">
              {e.amountCents > 0 && (
                <div className="text-amber-300">{formatCents(e.amountCents)}</div>
              )}
              <div>{e.createdAtLabel}</div>
            </div>
          </div>
        ))}
        {entries.length === 0 && (
          <p className="p-4 text-sm text-stone-500">No ledger events yet.</p>
        )}
      </Card>
      {hidden > 0 && (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-stone-300 transition hover:border-amber-500/30 hover:text-amber-200"
          aria-expanded={open}
        >
          {open
            ? "Show fewer ledger entries"
            : `Show all ${entries.length} ledger entries (+${hidden} more)`}
        </button>
      )}
    </div>
  );
}
