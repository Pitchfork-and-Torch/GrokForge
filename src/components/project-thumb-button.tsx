"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { toggleProjectThumbAction } from "@/lib/actions";

/** Inline SVG - no emoji (avoids mojibake / ?? on some deploys). */
function ThumbIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
    >
      <path d="M2 10.5a1.5 1.5 0 0 1 1.5-1.5H6v10H3.5A1.5 1.5 0 0 1 2 17.5v-7zM8 20.5h8.76a2 2 0 0 0 1.94-1.52l1.8-7A2 2 0 0 0 18.56 9.5H14l.7-3.2A2.5 2.5 0 0 0 12.26 3.3L8 9.5v11z" />
    </svg>
  );
}

export function ProjectThumbButton({
  projectId,
  initialCount,
  initiallyThumbed,
  signedIn,
  compact = false,
}: {
  projectId: string;
  initialCount: number;
  initiallyThumbed: boolean;
  signedIn: boolean;
  compact?: boolean;
}) {
  const [count, setCount] = useState(initialCount);
  const [thumbed, setThumbed] = useState(initiallyThumbed);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const baseBtn =
    "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition disabled:opacity-60";
  const off =
    "border-amber-700/50 bg-amber-500/10 text-amber-100 hover:border-amber-400/60 hover:bg-amber-500/20";
  const on =
    "border-amber-400/70 bg-amber-500/25 text-amber-50 shadow-[0_0_16px_rgba(245,158,11,0.2)] hover:bg-amber-500/35";
  const compactBtn =
    "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition disabled:opacity-60";

  if (!signedIn) {
    return (
      <Link
        href="/login"
        title="Sign in to give a thumbs-up"
        className={compact ? `${compactBtn} ${off}` : `${baseBtn} ${off}`}
        onClick={(e) => e.stopPropagation()}
      >
        <ThumbIcon />
        <span className="tabular-nums">{count}</span>
        <span>{compact ? "Up" : "Thumbs up"}</span>
      </Link>
    );
  }

  return (
    <div className="inline-flex flex-col items-start gap-0.5">
      <button
        type="button"
        disabled={pending}
        title={thumbed ? "Remove thumbs-up" : "Thumbs up this project"}
        aria-pressed={thumbed}
        aria-label={
          thumbed
            ? `Remove thumbs-up, currently ${count}`
            : `Thumbs up, currently ${count}`
        }
        className={
          compact
            ? `${compactBtn} ${thumbed ? on : off}`
            : `${baseBtn} ${thumbed ? on : off}`
        }
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          start(async () => {
            setError(null);
            const res = await toggleProjectThumbAction(projectId);
            if (res?.error) {
              setError(res.error);
              return;
            }
            if (res?.ok) {
              setThumbed(!!res.thumbed);
              setCount(res.count);
            }
          });
        }}
      >
        <ThumbIcon />
        <span className="tabular-nums">{pending ? "..." : count}</span>
        <span>{thumbed ? "Liked" : compact ? "Up" : "Thumbs up"}</span>
      </button>
      {error && <span className="text-[10px] text-rose-400">{error}</span>}
    </div>
  );
}

export function ProjectThumbCount({ count }: { count: number }) {
  return (
    <span
      className="inline-flex items-center gap-1 text-xs font-medium text-amber-200/90"
      title={`${count} thumbs-up`}
    >
      <ThumbIcon className="opacity-90" />
      <span className="tabular-nums">{count}</span>
    </span>
  );
}
