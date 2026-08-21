"use client";

import {
  useId,
  useState,
  useLayoutEffect,
  useRef,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

/**
 * Accessible hover/focus info chip for reputation, streaks, capacity, etc.
 * Portaled so parent overflow never clips the panel.
 */
export function StatTip({
  label,
  value,
  detail,
  className = "",
}: {
  label: string;
  value: ReactNode;
  detail: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const [mounted, setMounted] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  const tipId = useId();

  useLayoutEffect(() => {
    setMounted(true);
  }, []);

  useLayoutEffect(() => {
    if (!open || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    const left = Math.min(
      window.innerWidth - 120,
      Math.max(120, r.left + r.width / 2)
    );
    let top = r.bottom + 8;
    if (top + 100 > window.innerHeight) top = Math.max(8, r.top - 100);
    setPos({ top, left });
  }, [open]);

  const tip =
    mounted &&
    open &&
    pos &&
    createPortal(
      <span
        id={tipId}
        role="tooltip"
        className="pointer-events-none fixed z-[300] w-52 -translate-x-1/2 rounded-xl border border-[color:var(--accent)]/35 bg-[color:var(--background-elevated)] p-2.5 text-[11px] leading-snug text-[color:var(--muted)] shadow-2xl"
        style={{
          top: pos.top,
          left: pos.left,
          backgroundColor: "var(--background-elevated)",
        }}
      >
        <span className="font-semibold text-[color:var(--foreground)]">{label}</span>
        <span className="mt-1 block">{detail}</span>
      </span>,
      document.body
    );

  return (
    <span
      ref={ref}
      className={`relative inline-flex ${className}`}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      <button
        type="button"
        className="inline-flex cursor-help flex-col items-start rounded-2xl border border-amber-900/35 bg-black/40 px-3 py-2.5 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--accent)]"
        aria-describedby={open ? tipId : undefined}
      >
        <span className="text-[10px] font-semibold uppercase tracking-widest text-stone-500">
          {label}
        </span>
        <span className="mt-0.5 text-lg font-bold tabular-nums text-amber-200">{value}</span>
      </button>
      {tip}
    </span>
  );
}
