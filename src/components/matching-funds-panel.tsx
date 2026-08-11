"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { fundMatchingPoolAction, setMatchingFundsAction } from "@/lib/actions";
import { Button, Input, Label } from "@/components/ui";
import { ratioLabel } from "@/lib/matching-funds";

function usd(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

export function MatchingFundsPanel({
  projectId,
  projectSlug,
  canEdit,
  signedIn,
  matchingEnabled,
  matchingRatioBps,
  matchingPoolCents,
  matchingRemainingCents,
}: {
  projectId: string;
  projectSlug: string;
  /** Creator or founder: configure ratio / toggle */
  canEdit: boolean;
  /** Any signed-in user can fund the pool on this project */
  signedIn: boolean;
  matchingEnabled: boolean;
  matchingRatioBps: number;
  matchingPoolCents: number;
  matchingRemainingCents: number;
}) {
  const router = useRouter();
  const used = Math.max(0, matchingPoolCents - matchingRemainingCents);
  const pct =
    matchingPoolCents > 0
      ? Math.min(100, Math.round((used / matchingPoolCents) * 100))
      : 0;
  const [enabled, setEnabled] = useState(matchingEnabled);
  const [ratioBps, setRatioBps] = useState(matchingRatioBps);
  const [fundUsd, setFundUsd] = useState(50);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const preview = useMemo(() => {
    const d = 1000; // $10 sample
    const ideal = Math.floor((d * ratioBps) / 10000);
    return ideal;
  }, [ratioBps]);

  // Always show panel so visitors can fund any project from the page
  return (
    <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-amber-100">Matching funds</h3>
          <p className="mt-1 text-xs text-stone-400">
            Fund a transparent match pool on this project. Community donations then
            get extra capital from this budget at {ratioLabel(matchingRatioBps)}.
            Match spends are public ledger events. Anyone signed in can fund the
            pool; only the creator or founder configures the ratio.
          </p>
        </div>
        {matchingEnabled && matchingRemainingCents > 0 ? (
          <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-bold text-emerald-200">
            Live {ratioLabel(matchingRatioBps)}
          </span>
        ) : (
          <span className="rounded-full border border-white/10 px-2.5 py-0.5 text-[11px] text-stone-500">
            {matchingEnabled ? "Pool empty" : matchingPoolCents > 0 ? "Paused" : "Ready to fund"}
          </span>
        )}
      </div>

      {matchingPoolCents > 0 && (
        <div className="space-y-1">
          <div className="flex justify-between text-[11px] text-stone-500">
            <span>
              Matched {usd(used)} of {usd(matchingPoolCents)}
            </span>
            <span>{usd(matchingRemainingCents)} left</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-black/40">
            <div
              className="h-full rounded-full bg-amber-400/80"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      )}

      {/* Fund pool: any signed-in user, any project */}
      <div className="space-y-2 border-t border-white/5 pt-3">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-200/80">
          Fund match pool
        </p>
        {signedIn ? (
          <div className="flex flex-wrap items-end gap-2">
            <div className="min-w-[8rem] flex-1">
              <Label htmlFor="fundUsd">Amount (USD)</Label>
              <Input
                id="fundUsd"
                type="number"
                min={1}
                max={100000}
                value={fundUsd}
                onChange={(e) => setFundUsd(Number(e.target.value) || 0)}
                className="mt-1"
              />
            </div>
            <Button
              type="button"
              disabled={pending || fundUsd < 1}
              className="!bg-amber-400 !font-bold !text-black"
              onClick={() => {
                setError(null);
                setOk(null);
                const fd = new FormData();
                fd.set("projectId", projectId);
                fd.set("amountUsd", String(fundUsd));
                start(async () => {
                  const res = await fundMatchingPoolAction(fd);
                  if (res?.error) setError(res.error);
                  else {
                    setOk(`Added $${fundUsd.toFixed(2)} to the match pool.`);
                    router.refresh();
                  }
                });
              }}
            >
              {pending ? "Funding…" : "Fund pool"}
            </Button>
          </div>
        ) : (
          <p className="text-xs text-stone-500">
            <Link
              href={`/login?next=/projects/${projectSlug}`}
              className="text-amber-300 hover:underline"
            >
              Sign in
            </Link>{" "}
            to fund the matching pool on this project.
          </p>
        )}
      </div>

      {canEdit && (
        <div className="space-y-3 border-t border-white/5 pt-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-stone-500">
            Creator settings
          </p>
          <label className="flex items-center gap-2 text-xs text-stone-300">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              className="rounded border-white/20"
            />
            Enable matching on this project
          </label>
          <div>
            <Label htmlFor="ratioBps">Match ratio (basis points, 10000 = 1:1)</Label>
            <Input
              id="ratioBps"
              type="number"
              min={0}
              max={50000}
              step={500}
              value={ratioBps}
              onChange={(e) => setRatioBps(Number(e.target.value) || 0)}
              className="mt-1"
            />
            <p className="mt-1 text-[11px] text-stone-600">
              Example: $10 community gift triggers ~{usd(preview)} match at{" "}
              {ratioLabel(ratioBps)}.
            </p>
          </div>
          <Button
            type="button"
            variant="secondary"
            disabled={pending}
            onClick={() => {
              setError(null);
              setOk(null);
              const fd = new FormData();
              fd.set("projectId", projectId);
              fd.set("enabled", enabled ? "1" : "0");
              fd.set("ratioBps", String(ratioBps));
              start(async () => {
                const res = await setMatchingFundsAction(fd);
                if (res?.error) setError(res.error);
                else {
                  setOk("Match settings saved.");
                  router.refresh();
                }
              });
            }}
          >
            {pending ? "Saving…" : "Save match settings"}
          </Button>
        </div>
      )}

      {error && <p className="text-sm text-rose-400">{error}</p>}
      {ok && <p className="text-sm text-emerald-400">{ok}</p>}
    </div>
  );
}
