"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * Entry points to sealed package source - ship page + ZIP download.
 * Use on every surface that shows a sealed project (home, list, featured, detail).
 * stopPropagation so it works inside clickable cards.
 */
export function ShipSourceLinks({
  slug,
  sealed,
  compact = false,
  className,
  githubUrl,
}: {
  slug: string;
  /** True when a package Artifact (source=package) exists */
  sealed: boolean;
  compact?: boolean;
  className?: string;
  /** Optional published GitHub repo URL */
  githubUrl?: string | null;
}) {
  if (!sealed) return null;

  const shipHref = `/projects/${slug}/ship`;
  const zipHref = `/api/projects/${slug}/package`;

  return (
    <span
      className={cn(
        "inline-flex flex-wrap items-center gap-1.5",
        className
      )}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      <Link
        href={shipHref}
        className={cn(
          "inline-flex items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-500/15 font-bold text-emerald-100 transition hover:border-emerald-400/60 hover:bg-emerald-500/25",
          compact ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-[11px]"
        )}
        title="Open sealed package and source"
      >
        <span aria-hidden>✓</span>
        {compact ? "Source" : "Shipped source"}
      </Link>
      <a
        href={zipHref}
        className={cn(
          "inline-flex items-center gap-1 rounded-full border border-amber-500/35 bg-amber-500/10 font-bold text-amber-100 transition hover:border-amber-400/50 hover:bg-amber-500/20",
          compact ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-[11px]"
        )}
        title="Download GitHub-ready ZIP package"
      >
        ZIP
      </a>
      {githubUrl ? (
        <a
          href={githubUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            "inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/5 font-bold text-stone-200 transition hover:border-white/30",
            compact ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-[11px]"
          )}
          title="Open on GitHub"
        >
          GitHub
        </a>
      ) : null}
    </span>
  );
}

/** Badge+links cluster for completed+sealed projects */
export function SealedProjectChip({
  slug,
  sealed,
  fullyComplete,
  compact = false,
}: {
  slug: string;
  sealed: boolean;
  fullyComplete?: boolean;
  compact?: boolean;
}) {
  if (!sealed && !fullyComplete) return null;
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      {fullyComplete && !sealed && (
        <span
          className={cn(
            "rounded-full border border-emerald-500/30 bg-emerald-500/10 font-bold uppercase tracking-wide text-emerald-200",
            compact ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-[11px]"
          )}
        >
          Complete
        </span>
      )}
      <ShipSourceLinks slug={slug} sealed={sealed} compact={compact} />
    </span>
  );
}
