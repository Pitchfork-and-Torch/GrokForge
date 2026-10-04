"use client";

import { useEffect, useState } from "react";
import type { BadgeDef } from "@/lib/badges";

/**
 * When badge ids grow vs localStorage snapshot, show a soft amber toast.
 * Call with the signed-in user's current computed badges.
 */
export function BadgeUnlockToast({
  userId,
  badges,
}: {
  userId: string;
  badges: BadgeDef[];
}) {
  const [toast, setToast] = useState<BadgeDef | null>(null);

  useEffect(() => {
    if (!userId || badges.length === 0) return;
    const key = `gf-badges-seen:${userId}`;
    let seen: string[] = [];
    try {
      seen = JSON.parse(localStorage.getItem(key) || "[]");
      if (!Array.isArray(seen)) seen = [];
    } catch {
      seen = [];
    }
    const ids = badges.map((b) => b.id);
    const fresh = badges.filter((b) => !seen.includes(b.id));
    // First visit: seed without toast storm
    if (seen.length === 0) {
      try {
        localStorage.setItem(key, JSON.stringify(ids));
      } catch {
        /* ignore */
      }
      return;
    }
    if (fresh.length === 0) return;
    const next = fresh[0];
    setToast(next);
    try {
      localStorage.setItem(key, JSON.stringify([...new Set([...seen, ...ids])]));
    } catch {
      /* ignore */
    }
    const t = window.setTimeout(() => setToast(null), 4200);
    return () => window.clearTimeout(t);
  }, [userId, badges]);

  if (!toast) return null;

  return (
    <div
      className="pointer-events-none fixed bottom-20 left-1/2 z-[60] w-[min(92vw,22rem)] -translate-x-1/2 animate-[gf-toast-in_0.35s_ease-out]"
      role="status"
      aria-live="polite"
    >
      <div className="rounded-2xl border border-amber-500/40 bg-[#0a0a0a]/95 px-4 py-3 shadow-[0_0_40px_rgba(245,158,11,0.25)] backdrop-blur">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-500">
          Badge unlocked
        </p>
        <p className="mt-1 text-sm font-semibold text-white">{toast.label}</p>
        <p className="mt-0.5 text-xs text-stone-400">{toast.blurb}</p>
      </div>
    </div>
  );
}
