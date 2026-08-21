import type { ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export function DashKpi({
  label,
  value,
  hint,
  href,
  tone = "accent",
}: {
  label: string;
  value: string | number;
  hint?: string;
  href?: string;
  tone?: "accent" | "success" | "danger" | "muted";
}) {
  const toneClass =
    tone === "success"
      ? "text-[var(--success)]"
      : tone === "danger"
        ? "text-[var(--danger)]"
        : tone === "muted"
          ? "text-[var(--muted)]"
          : "text-[var(--accent)]";
  const inner = (
    <>
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
        {label}
      </p>
      <p className={cn("mt-1 font-display text-2xl font-bold tabular-nums leading-none", toneClass)}>
        {value}
      </p>
      {hint && <p className="mt-1.5 text-[11px] text-[var(--muted)]">{hint}</p>}
    </>
  );
  const cls = "gf-surface rounded-2xl p-3.5 sm:p-4";
  if (href) {
    return (
      <Link href={href} className={cn(cls, "gf-card-hover block")}>
        {inner}
      </Link>
    );
  }
  return <div className={cls}>{inner}</div>;
}

export function DashJump({
  items,
}: {
  items: { href: string; label: string }[];
}) {
  return (
    <nav aria-label="Dashboard sections" className="flex flex-wrap gap-1.5">
      {items.map((it) => (
        <a
          key={it.href}
          href={it.href}
          className="inline-flex min-h-9 items-center rounded-full border border-[color:var(--border)] bg-white/5 px-3 text-xs font-semibold text-[var(--muted)] hover:border-[color:var(--accent)]/40 hover:text-[var(--foreground)]"
        >
          {it.label}
        </a>
      ))}
    </nav>
  );
}

export function DashSection({
  id,
  kicker,
  title,
  hint,
  actions,
  children,
}: {
  id: string;
  kicker?: string;
  title: string;
  hint?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-20 space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div className="min-w-0">
          {kicker && (
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">
              {kicker}
            </p>
          )}
          <h2 className="font-display text-xl font-semibold text-[var(--foreground)]">{title}</h2>
          {hint && <p className="mt-0.5 text-sm text-[var(--muted)]">{hint}</p>}
        </div>
        {actions}
      </div>
      {children}
    </section>
  );
}

export function DashRow({
  children,
  className,
  warn,
}: {
  children: ReactNode;
  className?: string;
  warn?: boolean;
}) {
  return (
    <li
      className={cn(
        "rounded-xl border px-3 py-2",
        warn
          ? "border-[color:var(--accent)]/30 bg-[color:var(--accent)]/5"
          : "border-[color:var(--border)] bg-black/25",
        className
      )}
    >
      {children}
    </li>
  );
}
