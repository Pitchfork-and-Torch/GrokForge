"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Badge, Card } from "@/components/ui";

export type NightcapTallyNumbers = {
  platformAvailable: number;
  platformTotalGifted: number;
  projectsAvailable: number;
  networkAvailable: number;
  networkTotalGifted: number;
  giftCount: number;
  lastGiftAt: string | null;
};

function fmt(n: number) {
  return n.toLocaleString();
}

/**
 * Public live nightcap pool - polls /api/nightcap ~every 20s.
 */
export function NightcapPoolTally({
  initial,
  compact = false,
}: {
  initial?: NightcapTallyNumbers | null;
  compact?: boolean;
}) {
  const [tally, setTally] = useState<NightcapTallyNumbers | null>(
    initial ?? null
  );
  const [liveAt, setLiveAt] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      try {
        const res = await fetch("/api/nightcap", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled || !data?.tally) return;
        setTally({
          platformAvailable: data.tally.platformAvailable ?? 0,
          platformTotalGifted: data.tally.platformTotalGifted ?? 0,
          projectsAvailable: data.tally.projectsAvailable ?? 0,
          networkAvailable: data.tally.networkAvailable ?? 0,
          networkTotalGifted: data.tally.networkTotalGifted ?? 0,
          giftCount: data.tally.giftCount ?? 0,
          lastGiftAt: data.tally.lastGiftAt ?? null,
        });
        setLiveAt(data.tally.generatedAt ?? new Date().toISOString());
      } catch {
        /* degraded */
      }
    };
    void tick();
    const id = window.setInterval(tick, 20_000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  if (!tally) {
    return (
      <Card className="border-amber-500/20 bg-amber-500/5">
        <p className="text-sm text-stone-500">Loading nightcap pool…</p>
      </Card>
    );
  }

  if (compact) {
    return (
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <Badge className="border-amber-500/40 bg-amber-500/15 text-amber-100">
          Nightcap pool
        </Badge>
        <span className="tabular-nums font-semibold text-amber-200">
          {fmt(tally.networkAvailable)}
        </span>
        <span className="text-stone-500">capacity available</span>
        <Link href="#nightcap" className="text-amber-400 hover:underline">
          Gift leftovers
        </Link>
      </div>
    );
  }

  return (
    <div id="nightcap-pool" className="scroll-mt-24">
    <Card
      className="space-y-3 border-amber-500/30 bg-gradient-to-br from-amber-950/40 to-black/40"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-50 motion-reduce:animate-none" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
            </span>
            <h2 className="text-sm font-semibold text-amber-100">
              Nightcap pool · live
            </h2>
          </div>
          <p className="mt-1 max-w-xl text-xs text-stone-400">
            Real on-platform capacity balances from builder gifts. Not SuperGrok
            API keys - reported leftover capacity that credits a public pool.
            Refreshes about every 20s.
          </p>
        </div>
        <Link
          href="#nightcap"
          className="rounded-full border border-amber-500/40 bg-amber-500/15 px-3 py-1.5 text-xs font-semibold text-amber-100 hover:bg-amber-500/25"
        >
          Gift leftover capacity
        </Link>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            k: "Network available",
            v: tally.networkAvailable,
            hint: "Platform + all projects",
            accent: true,
          },
          {
            k: "Platform available",
            v: tally.platformAvailable,
            hint: "Forge ops pool",
          },
          {
            k: "Projects available",
            v: tally.projectsAvailable,
            hint: "Earmarked to projects",
          },
          {
            k: "Lifetime gifted",
            v: tally.networkTotalGifted,
            hint: `${tally.giftCount} gift${tally.giftCount === 1 ? "" : "s"}`,
          },
        ].map((it) => (
          <div
            key={it.k}
            className={`rounded-xl border px-3 py-2 ${
              it.accent
                ? "border-amber-500/40 bg-amber-500/10"
                : "border-white/10 bg-black/35"
            }`}
          >
            <p className="text-[10px] uppercase tracking-wide text-stone-500">
              {it.k}
            </p>
            <p
              className={`text-xl font-bold tabular-nums ${
                it.accent ? "text-amber-100" : "text-white"
              }`}
            >
              {fmt(it.v)}
            </p>
            <p className="text-[10px] text-stone-600">{it.hint}</p>
          </div>
        ))}
      </div>

      {liveAt && (
        <p className="text-[10px] text-stone-600">
          Snapshot {liveAt.slice(0, 19).replace("T", " ")} UTC
          {tally.lastGiftAt
            ? ` · last gift ${tally.lastGiftAt.slice(0, 16).replace("T", " ")}`
            : ""}
        </p>
      )}
    </Card>
    </div>
  );
}
