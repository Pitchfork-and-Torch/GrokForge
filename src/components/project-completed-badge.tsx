import { cn } from "@/lib/utils";

/**
 * Green check treatment for fully completed projects.
 * Use compact on cards; large on project detail hero.
 */
export function ProjectCompletedBadge({
  size = "md",
  className,
  label = "Completed",
}: {
  size?: "sm" | "md" | "lg";
  className?: string;
  label?: string;
}) {
  const box =
    size === "lg"
      ? "gap-2 px-3 py-1.5 text-sm"
      : size === "sm"
        ? "gap-1 px-2 py-0.5 text-[10px]"
        : "gap-1.5 px-2.5 py-1 text-xs";
  const icon =
    size === "lg" ? "h-5 w-5" : size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5";

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border border-emerald-400/45 bg-emerald-500/15 font-bold uppercase tracking-wide text-emerald-200 shadow-[0_0_20px_rgba(16,185,129,0.15)]",
        box,
        className
      )}
      title="All claimable tasks accepted"
    >
      <svg
        className={cn("shrink-0 text-emerald-300", icon)}
        viewBox="0 0 20 20"
        fill="currentColor"
        aria-hidden
      >
        <path
          fillRule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.78-9.72a.75.75 0 00-1.06-1.06L9 10.94 7.28 9.22a.75.75 0 10-1.06 1.06l2.25 2.25a.75.75 0 001.06 0l4.25-4.25z"
          clipRule="evenodd"
        />
      </svg>
      {label}
    </span>
  );
}

/** Large hero banner for project detail when fully done. */
export function ProjectCompletedBanner({
  completed,
  total,
}: {
  completed: number;
  total: number;
}) {
  return (
    <div
      className="flex flex-wrap items-center gap-3 rounded-2xl border border-emerald-500/35 bg-gradient-to-r from-emerald-500/15 via-emerald-900/20 to-black/40 px-4 py-3 shadow-[0_0_40px_rgba(16,185,129,0.12)]"
      role="status"
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-full border border-emerald-400/40 bg-emerald-500/20 text-emerald-200">
        <svg className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
          <path
            fillRule="evenodd"
            d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
            clipRule="evenodd"
          />
        </svg>
      </span>
      <div className="min-w-0">
        <p className="text-sm font-bold text-emerald-100">Project complete</p>
        <p className="text-xs text-emerald-200/80">
          All {total} claimable task{total === 1 ? "" : "s"} accepted ({completed}/{total}).
          Open-license artifacts stay on the public ledger.
        </p>
      </div>
      <ProjectCompletedBadge size="lg" className="ml-auto" />
    </div>
  );
}
