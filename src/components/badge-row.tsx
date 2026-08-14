"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { BadgeDef } from "@/lib/badges";
import { badgeCriteria, badgeIconPath } from "@/lib/badges";

type TipPos = { top: number; left: number };

/**
 * Portaled badge tooltip - escapes overflow:hidden on cards / leaderboard rows.
 */
export function BadgeIcon({
  badge,
  size = "sm",
  interactive = true,
}: {
  badge: BadgeDef;
  size?: "sm" | "md" | "lg";
  interactive?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [pos, setPos] = useState<TipPos | null>(null);
  const anchorRef = useRef<HTMLSpanElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const tipId = useId();
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dim =
    size === "lg"
      ? "h-9 w-9 text-xs"
      : size === "md"
        ? "h-6 w-6 text-[10px]"
        : "h-5 w-5 text-[9px]";

  useEffect(() => {
    setMounted(true);
  }, []);

  const clearClose = () => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  };

  const scheduleClose = () => {
    clearClose();
    // Delay so pointer can move from badge to portaled tip
    closeTimer.current = setTimeout(() => setOpen(false), 100);
  };

  const measure = useCallback(() => {
    const el = anchorRef.current;
    if (!el || typeof window === "undefined") return;
    const r = el.getBoundingClientRect();
    const tipW = 224; // w-56
    const tipH = tipRef.current?.offsetHeight || 128;
    const gap = 10;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    let left = r.left + r.width / 2;
    left = Math.max(tipW / 2 + 10, Math.min(vw - tipW / 2 - 10, left));

    const preferAbove = r.top >= tipH + gap + 8;
    let top = preferAbove ? r.top - tipH - gap : r.bottom + gap;
    // Keep fully in viewport vertically
    if (top < 8) top = 8;
    if (top + tipH > vh - 8) top = Math.max(8, vh - tipH - 8);

    setPos({ top, left });
  }, []);

  useLayoutEffect(() => {
    if (!open) {
      setPos(null);
      return;
    }
    measure();
    // Second pass after paint when tip height is known
    const raf = requestAnimationFrame(() => measure());
    const onScrollOrResize = () => measure();
    window.addEventListener("scroll", onScrollOrResize, true);
    window.addEventListener("resize", onScrollOrResize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScrollOrResize, true);
      window.removeEventListener("resize", onScrollOrResize);
    };
  }, [open, measure]);

  useEffect(() => () => clearClose(), []);

  const mark = (
    <span
      className={`inline-flex ${dim} items-center justify-center rounded-full border border-[color:var(--accent)]/40 bg-[color:var(--accent)]/10 font-bold text-[color:var(--accent-hover)] shadow-[0_0_10px_var(--glow)] transition-transform duration-150 ${
        open ? "scale-110 ring-2 ring-[color:var(--accent)]/50" : ""
      }`}
      aria-hidden={!interactive}
    >
      {badgeIconPath(badge.id)}
    </span>
  );

  if (!interactive) {
    return (
      <span title={`${badge.label}: ${badge.blurb}`} className="inline-flex">
        {mark}
      </span>
    );
  }

  const tooltip =
    mounted &&
    open &&
    createPortal(
      <div
        ref={tipRef}
        id={tipId}
        role="tooltip"
        onMouseEnter={() => {
          clearClose();
          setOpen(true);
        }}
        onMouseLeave={scheduleClose}
        className="fixed z-[300] w-56 rounded-xl border border-[color:var(--accent)]/40 p-3 text-left shadow-[0_16px_48px_rgba(0,0,0,0.7)]"
        style={{
          top: pos?.top ?? -9999,
          left: pos?.left ?? 0,
          transform: "translateX(-50%)",
          backgroundColor: "var(--background-elevated)",
          color: "var(--foreground)",
          visibility: pos ? "visible" : "hidden",
          animation: pos ? "gf-tip-in 0.15s ease-out" : undefined,
        }}
      >
        <div className="flex items-start gap-2">
          <span
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[color:var(--accent)]/40 bg-[color:var(--accent)]/15 text-xs font-bold text-[color:var(--accent-hover)]"
            aria-hidden
          >
            {badgeIconPath(badge.id)}
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-sm font-semibold text-[color:var(--foreground)]">
                {badge.label}
              </span>
              <span className="rounded-full border border-white/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-[color:var(--muted)]">
                Tier {badge.tier}
              </span>
            </div>
            <p className="mt-1 text-[11px] leading-snug text-[color:var(--muted)]">
              {badge.blurb}
            </p>
            <p className="mt-1.5 text-[10px] leading-snug text-[color:var(--accent-hover)]/90">
              {badgeCriteria(badge.id)}
            </p>
          </div>
        </div>
      </div>,
      document.body
    );

  return (
    <span
      ref={anchorRef}
      className="relative inline-flex"
      onMouseEnter={() => {
        clearClose();
        setOpen(true);
      }}
      onMouseLeave={scheduleClose}
      onFocus={() => {
        clearClose();
        setOpen(true);
      }}
      onBlur={scheduleClose}
    >
      <button
        type="button"
        className="inline-flex rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--accent)]"
        aria-describedby={open ? tipId : undefined}
        aria-label={`${badge.label}: ${badge.blurb}`}
      >
        {mark}
      </button>
      {tooltip}
    </span>
  );
}

export function BadgeRow({
  badges,
  max = 4,
  size = "sm",
}: {
  badges: BadgeDef[];
  max?: number;
  size?: "sm" | "md";
}) {
  if (!badges.length) return null;
  const show = badges.slice(0, max);

  return (
    <span className="inline-flex flex-wrap items-center gap-1" aria-label="Achievements">
      {show.map((b) => (
        <BadgeIcon key={b.id} badge={b} size={size} />
      ))}
      {badges.length > max && (
        <span className="text-[10px] text-stone-500">+{badges.length - max}</span>
      )}
    </span>
  );
}
