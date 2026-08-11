"use client";

/** Second-builder invite intent (Network Gravity). */
export function secondBuilderInviteIntent(opts: {
  title: string;
  slug: string;
  siteUrl?: string;
  proposerHandle?: string | null;
  pendingReviews?: number;
  openLeaves?: number;
}): string {
  const base = (opts.siteUrl || "https://grokforge.app").replace(/\/$/, "");
  const path = `${base}/projects/${opts.slug.replace(/^\//, "")}?invite=1`;
  const handle = opts.proposerHandle?.replace(/^@/, "") || null;
  const bits: string[] = [];
  if ((opts.openLeaves || 0) > 0) bits.push(`${opts.openLeaves} open leaves`);
  if ((opts.pendingReviews || 0) > 0)
    bits.push(`${opts.pendingReviews} need review`);
  const lines = [
    `Need a second builder on GrokForge: ${opts.title}`,
    "",
    bits.length
      ? bits.join(" · ")
      : "Claim a ready leaf or peer-review a pending submit",
    handle ? `with @${handle}` : null,
    "",
    path,
    "",
    "#GrokForge #BuildInPublic #xAI",
  ].filter((x) => x != null) as string[];
  return `https://x.com/intent/tweet?text=${encodeURIComponent(lines.join("\n"))}`;
}

/** Build a ready-to-post X intent URL for a GrokForge project. */
export function projectTweetIntent(opts: {
  title: string;
  slug: string;
  siteUrl?: string;
  category?: string | null;
  proposerHandle?: string | null;
  featured?: boolean;
}): string {
  const base = (opts.siteUrl || "https://grokforge.app").replace(/\/$/, "");
  const path = opts.slug.startsWith("http")
    ? opts.slug
    : `${base}/projects/${opts.slug.replace(/^\//, "")}`;
  const handle = opts.proposerHandle?.replace(/^@/, "") || null;
  const cat = opts.category
    ? opts.category.replace(/_/g, " ").toLowerCase()
    : null;

  const lines = [
    opts.featured
      ? `Featured on GrokForge: ${opts.title}`
      : `${opts.title} on GrokForge`,
    "",
    cat
      ? `Open multi-agent work for the greater good · ${cat}`
      : "Open multi-agent work for the greater good",
    handle ? `by @${handle}` : null,
    "",
    path,
    "",
    "#GrokForge #xAI #PublicGoods #OpenSource",
  ].filter((x) => x != null) as string[];

  return `https://x.com/intent/tweet?text=${encodeURIComponent(lines.join("\n"))}`;
}

/**
 * One-click X share for a project.
 * Opens the X compose intent with ready copy (no extra form).
 */
export function ShareProjectButton({
  title,
  slug,
  siteUrl = "https://grokforge.app",
  category,
  proposerHandle,
  featured = false,
  variant = "default",
  className = "",
}: {
  title: string;
  slug: string;
  siteUrl?: string;
  category?: string | null;
  proposerHandle?: string | null;
  /** Use "Featured on GrokForge" lead-in for the pinned project */
  featured?: boolean;
  /** default = amber CTA · compact = small card pill · bar = full-width spotlight */
  variant?: "default" | "compact" | "bar";
  className?: string;
}) {
  const intent = projectTweetIntent({
    title,
    slug,
    siteUrl,
    category,
    proposerHandle,
    featured,
  });

  const label = featured ? "Tweet featured" : "Tweet";

  if (variant === "bar") {
    return (
      <a
        href={intent}
        target="_blank"
        rel="noopener noreferrer"
        className={`group flex w-full items-center justify-between gap-3 rounded-xl border border-amber-500/35 bg-gradient-to-r from-amber-500/15 via-amber-500/10 to-transparent px-3 py-2.5 text-left transition hover:border-amber-400/55 hover:from-amber-500/25 ${className}`}
        aria-label={`Tweet about ${title} on X`}
      >
        <span className="flex min-w-0 items-center gap-2.5">
          <span
            aria-hidden
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-500 text-sm font-black text-black shadow-[0_0_16px_rgba(245,158,11,0.45)]"
          >
            &#120143;
          </span>
          <span className="min-w-0">
            <span className="block text-xs font-bold text-amber-100">
              {featured ? "Tweet this spotlight" : "Tweet this project"}
            </span>
            <span className="block truncate text-[11px] text-stone-500 group-hover:text-stone-400">
              One click · ready copy for X
            </span>
          </span>
        </span>
        <span className="shrink-0 rounded-full border border-amber-400/40 bg-amber-500 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-black">
          Share
        </span>
      </a>
    );
  }

  if (variant === "compact") {
    return (
      <a
        href={intent}
        target="_blank"
        rel="noopener noreferrer"
        className={`inline-flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/15 px-2.5 py-1 text-[11px] font-bold text-amber-100 hover:border-amber-400/55 hover:bg-amber-500/25 ${className}`}
        aria-label={`Tweet about ${title} on X`}
        title="Tweet on X"
      >
        <span aria-hidden className="text-xs font-black leading-none">
          &#120143;
        </span>
        {label}
      </a>
    );
  }

  return (
    <a
      href={intent}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-1.5 rounded-full border border-amber-300/40 bg-amber-500 px-3 py-1.5 text-xs font-bold text-black shadow-[0_0_18px_rgba(245,158,11,0.35)] hover:bg-amber-400 ${className}`}
      aria-label={`Tweet about ${title} on X`}
    >
      <span aria-hidden className="text-sm font-black leading-none">
        &#120143;
      </span>
      {featured ? "Tweet featured" : "Tweet project"}
    </a>
  );
}
