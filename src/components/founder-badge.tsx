import { cn } from "@/lib/utils";

/**
 * Compact Grok-style sparkle mark for Founders.
 * Amber on Obsidian - not blue.
 */
export function FounderBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-0.5 rounded-full border border-amber-400/50 bg-amber-500/15 px-1.5 py-0.5",
        className
      )}
      title="GrokForge Founder"
      aria-label="Founder"
    >
      <svg
        width={12}
        height={12}
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden
        className="text-amber-400"
      >
        {/* Geometric star / Grok-adjacent sparkle */}
        <path
          d="M12 2.5l1.6 5.2L19 9.3l-5.4 1.6L12 16l-1.6-5.1L5 9.3l5.4-1.6L12 2.5z"
          fill="currentColor"
        />
        <path
          d="M18.5 14.5l.7 2.2 2.3.7-2.3.7-.7 2.2-.7-2.2-2.3-.7 2.3-.7.7-2.2z"
          fill="currentColor"
          opacity="0.85"
        />
      </svg>
      <span className="text-[10px] font-bold uppercase tracking-wide text-amber-300">
        Founder
      </span>
    </span>
  );
}
