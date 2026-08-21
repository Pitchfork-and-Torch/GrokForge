import { cn } from "@/lib/utils";
import Link from "next/link";
import React, {
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";

export function Button({
  className,
  variant = "primary",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
}) {
  const variants = {
    primary:
      "bg-[var(--accent)] text-black hover:bg-[var(--accent-hover)] shadow-[0_0_22px_var(--glow)] gf-btn-press",
    secondary:
      "bg-white/5 text-[var(--foreground)] border border-[color:var(--border)] hover:bg-white/10 hover:border-[color:var(--accent)]/40",
    ghost:
      "bg-transparent text-[var(--muted)] hover:bg-white/5 hover:text-[var(--foreground)]",
    danger: "bg-[var(--danger)]/90 text-white hover:bg-[var(--danger)]",
  };
  return (
    <button
      className={cn(
        "inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-semibold disabled:opacity-50",
        variants[variant],
        className
      )}
      {...props}
    />
  );
}

export const Input = React.forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement>
>(function Input({ className, ...props }, ref) {
  return (
    <input
      ref={ref}
      className={cn(
        "w-full min-h-11 rounded-xl border border-[color:var(--border)] bg-black/50 px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] outline-none focus:border-[color:var(--accent)]/60 focus:ring-1 focus:ring-[color:var(--accent)]/40",
        className
      )}
      {...props}
    />
  );
});

export function Textarea({
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "w-full min-h-[100px] rounded-xl border border-[color:var(--border)] bg-black/50 px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] outline-none focus:border-[color:var(--accent)]/60 focus:ring-1 focus:ring-[color:var(--accent)]/40",
        className
      )}
      {...props}
    />
  );
}

export function Label({
  children,
  htmlFor,
  className,
}: {
  children: React.ReactNode;
  htmlFor?: string;
  className?: string;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className={cn(
        "mb-1 block text-xs font-medium uppercase tracking-wide text-[var(--muted)]",
        className
      )}
    >
      {children}
    </label>
  );
}

export function Card({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "gf-surface rounded-2xl p-5 backdrop-blur",
        className
      )}
    >
      {children}
    </div>
  );
}

export function Badge({
  children,
  className,
  title,
}: {
  children: React.ReactNode;
  className?: string;
  title?: string;
}) {
  return (
    <span
      title={title}
      className={cn(
        "inline-flex items-center rounded-full border border-[color:var(--accent)]/35 bg-[color:var(--accent)]/10 px-2.5 py-0.5 text-xs font-medium text-[var(--accent)]",
        className
      )}
    >
      {children}
    </span>
  );
}

export function ProgressBar({
  value,
  className,
}: {
  value: number;
  className?: string;
}) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className={cn("h-2 w-full overflow-hidden rounded-full bg-white/10", className)}>
      <div
        className="h-full rounded-full bg-[var(--accent)] shadow-[0_0_12px_var(--glow)]"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function SiteFooter({
  signedIn = false,
}: {
  signedIn?: boolean;
}) {
  return (
    <footer className="mt-12 border-t border-[color:var(--border)] py-8 sm:mt-16 sm:py-10">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 px-4 text-center text-xs text-[var(--muted)] sm:gap-4">
        <p className="max-w-md leading-relaxed">
          GrokForge · transparent multi-agent crowdfunding · open licenses default · never stores
          user API keys
        </p>
        <nav
          className="flex max-w-lg flex-wrap justify-center gap-x-3 gap-y-2 sm:max-w-none sm:gap-4"
          aria-label="Footer"
        >
          <Link className="hover:text-[var(--accent)]" href="/projects">
            Projects
          </Link>
          <Link className="hover:text-[var(--accent)]" href="/tasks">
            Open tasks
          </Link>
          <Link className="hover:text-[var(--accent)]" href="/activity">
            Activity
          </Link>
          <Link className="hover:text-[var(--accent)]" href="/leaderboard">
            Leaderboard
          </Link>
          <Link className="hover:text-[var(--accent)]" href="/projects/new">
            Propose
          </Link>
          <Link className="hover:text-[var(--accent)]" href="/about">
            About
          </Link>
          <Link className="hover:text-[var(--accent)]" href="/status">
            Status
          </Link>
          <Link className="hover:text-[var(--accent)]" href="/llms.txt">
            llms.txt
          </Link>
          <Link className="hover:text-[var(--accent)]" href="/feed.xml">
            RSS
          </Link>
          {signedIn ? (
            <Link className="hover:text-[var(--accent)]" href="/dashboard">
              Dashboard
            </Link>
          ) : (
            <Link className="hover:text-[var(--accent)]" href="/login">
              Sign in with X
            </Link>
          )}
          <a
            className="hover:text-[var(--accent)]"
            href="https://github.com/Pitchfork-and-Torch/GrokForge"
            rel="noopener noreferrer"
            target="_blank"
          >
            GitHub
          </a>
          <a
            className="hover:text-[var(--accent)]"
            href="https://x.com/suddenlyjon"
            rel="noopener noreferrer"
            target="_blank"
            title="Follow @suddenlyjon on X"
          >
            @suddenlyjon
          </a>
        </nav>
        <p className="opacity-70">Built for the X / Grok ecosystem · greater good only</p>
      </div>
    </footer>
  );
}
