"use client";

import { useEffect, useState } from "react";

export type LiveForgeNumbers = {
  visitors: number;
  xBuilders: number;
  activeProjects: number;
  completedProjects: number;
  openLeafTasks: number;
};

function CountUp({ value, className }: { value: number; className?: string }) {
  const [n, setN] = useState(value);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setN(value);
      return;
    }
    const from = n;
    const to = value;
    if (from === to) return;
    const t0 = performance.now();
    const dur = 700;
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      setN(Math.round(from + (to - from) * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  return (
    <span className={className ?? "tabular-nums font-bold text-amber-200"}>
      {n.toLocaleString()}
    </span>
  );
}

function mergeStats(
  prev: LiveForgeNumbers,
  s: Record<string, unknown>
): LiveForgeNumbers {
  return {
    visitors: typeof s.visitors === "number" ? s.visitors : prev.visitors,
    xBuilders:
      typeof s.xBuilders === "number"
        ? s.xBuilders
        : typeof s.builders === "number"
          ? s.builders
          : prev.xBuilders,
    activeProjects:
      typeof s.activeProjects === "number"
        ? s.activeProjects
        : prev.activeProjects,
    completedProjects:
      typeof s.completedProjects === "number"
        ? s.completedProjects
        : prev.completedProjects,
    openLeafTasks:
      typeof s.openLeafTasks === "number"
        ? s.openLeafTasks
        : prev.openLeafTasks,
  };
}

export function LiveForgeBar({ stats }: { stats: LiveForgeNumbers }) {
  const [live, setLive] = useState(stats);

  useEffect(() => {
    setLive(stats);
  }, [stats]);

  // Poll on mount + interval so completed tallies track ship acceptances
  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      try {
        const res = await fetch("/api/stats", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        const s = data?.stats;
        if (!s || cancelled) return;
        setLive((prev) => mergeStats(prev, s));
      } catch {
        /* offline / degraded */
      }
    };
    void tick();
    const id = window.setInterval(tick, 30_000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  const items: {
    k: string;
    hint: string;
    v: number;
    tone: "amber" | "emerald";
  }[] = [
    {
      k: "Visitors",
      hint: "Unique network traffic",
      v: live.visitors,
      tone: "amber",
    },
    {
      k: "X builders",
      hint: "Signed-in with X",
      v: live.xBuilders,
      tone: "amber",
    },
    {
      k: "Active projects",
      hint: "Open greater-good work",
      v: live.activeProjects,
      tone: "amber",
    },
    {
      k: "Completed projects",
      hint: "All claimable tasks accepted",
      v: live.completedProjects,
      tone: "emerald",
    },
    {
      k: "Open tasks",
      hint: "Claimable leaf work",
      v: live.openLeafTasks,
      tone: "amber",
    },
  ];

  return (
    <section
      className="relative z-0 overflow-hidden rounded-2xl border border-amber-500/40 bg-gradient-to-br from-amber-500/10 via-[#050505] to-[#050505] p-4 shadow-[0_0_48px_rgba(245,158,11,0.14)] sm:rounded-3xl sm:p-6"
      aria-label="Live Forge stats"
      aria-live="polite"
    >
      <div className="pointer-events-none absolute -right-8 top-0 h-32 w-32 rounded-full bg-amber-400/15 blur-3xl" />
      <div className="pointer-events-none absolute -left-6 bottom-0 h-24 w-24 rounded-full bg-amber-600/10 blur-2xl" />

      <div className="relative mb-4 flex flex-wrap items-end justify-between gap-3 sm:mb-5">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60 motion-reduce:animate-none" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
            </span>
            <h2 className="text-sm font-black uppercase tracking-[0.22em] text-amber-200 sm:text-base">
              Live Forge
            </h2>
            <span className="rounded-full border border-emerald-400/40 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-emerald-200">
              Live
            </span>
          </div>
          <p className="mt-1.5 max-w-xl text-xs text-stone-500 sm:text-sm">
            Single network pulse - visitors, builders, active and completed projects, open tasks.
            Refreshes about every 30s while this page is open.
          </p>
        </div>
      </div>

      <dl className="relative grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-5">
        {items.map((it) => (
          <div
            key={it.k}
            className={`rounded-2xl border px-3 py-4 sm:px-4 sm:py-5 ${
              it.tone === "emerald"
                ? "border-emerald-500/35 bg-emerald-500/10"
                : "border-amber-500/25 bg-black/45"
            }`}
          >
            <dt className="text-[10px] font-semibold uppercase tracking-[0.16em] text-stone-500 sm:text-[11px]">
              {it.k}
            </dt>
            <dd className="mt-2">
              <CountUp
                value={it.v}
                className={`block text-3xl font-black tabular-nums leading-none tracking-tight sm:text-4xl md:text-5xl ${
                  it.tone === "emerald" ? "text-emerald-300" : "text-amber-300"
                }`}
              />
            </dd>
            <p className="mt-2 text-[11px] leading-snug text-stone-600 sm:text-xs">{it.hint}</p>
          </div>
        ))}
      </dl>
    </section>
  );
}
