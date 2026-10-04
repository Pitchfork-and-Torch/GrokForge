"use client";

import type { BadgeProgress } from "@/lib/badges";
import { badgeIconPath } from "@/lib/badges";
import { BadgeIcon } from "@/components/badge-row";
import type { BadgeDef } from "@/lib/badges";

export function BadgeGallery({ rows }: { rows: BadgeProgress[] }) {
  const earned = rows.filter((r) => r.earned);
  const locked = rows.filter((r) => !r.earned);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-semibold text-white">Badge collection</h2>
        <p className="mt-1 text-xs text-stone-500">
          {earned.length} earned · {locked.length} locked. Hover or focus any mark for details.
        </p>
      </div>

      {earned.length > 0 && (
        <ul className="grid gap-2 sm:grid-cols-2">
          {earned.map((r) => {
            const def: BadgeDef = {
              id: r.id,
              label: r.label,
              blurb: r.blurb,
              tier: r.tier,
            };
            return (
              <li
                key={r.id}
                className="flex items-start gap-2.5 rounded-xl border border-[color:var(--accent)]/25 bg-[color:var(--accent)]/5 px-3 py-2.5"
              >
                <BadgeIcon badge={def} size="md" />
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-sm font-medium text-stone-100">{r.label}</span>
                    <span className="text-[10px] uppercase tracking-wide text-emerald-400/90">
                      Earned
                    </span>
                  </div>
                  <p className="text-xs text-stone-500">{r.blurb}</p>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {locked.length > 0 && (
        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-500">
            Locked · progress
          </h3>
          <ul className="grid gap-2 sm:grid-cols-2">
            {locked.map((r) => (
              <li
                key={r.id}
                className="rounded-xl border border-white/8 bg-black/25 px-3 py-2.5 opacity-80"
              >
                <div className="flex items-start gap-2.5">
                  <span
                    className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/5 text-[10px] font-bold text-stone-500 grayscale"
                    aria-hidden
                  >
                    {badgeIconPath(r.id)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-stone-400">{r.label}</div>
                    <p className="text-xs text-stone-600">{r.blurb}</p>
                    {r.progressLabel && (
                      <div className="mt-2">
                        <div className="mb-0.5 flex justify-between text-[10px] text-stone-500">
                          <span>{r.progressLabel}</span>
                          <span>{r.progressPct ?? 0}%</span>
                        </div>
                        <div
                          className="h-1.5 overflow-hidden rounded-full bg-white/10"
                          role="progressbar"
                          aria-valuenow={r.progressPct ?? 0}
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-label={`Progress toward ${r.label}`}
                        >
                          <div
                            className="h-full rounded-full bg-[color:var(--accent)]/70 transition-[width] duration-300"
                            style={{ width: `${Math.max(0, Math.min(100, r.progressPct ?? 0))}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
