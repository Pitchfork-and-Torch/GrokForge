import { cn } from "@/lib/utils";
import Link from "next/link";
import { type ButtonHTMLAttributes, type InputHTMLAttributes, type TextareaHTMLAttributes } from "react";

export function Button({
  className,
  variant = "primary",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
}) {
  const variants = {
    primary:
      "bg-sky-500 text-black hover:bg-sky-400 shadow-[0_0_20px_rgba(14,165,233,0.35)]",
    secondary:
      "bg-white/5 text-zinc-100 border border-white/10 hover:bg-white/10",
    ghost: "bg-transparent text-zinc-300 hover:bg-white/5",
    danger: "bg-rose-600/90 text-white hover:bg-rose-500",
  };
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition disabled:opacity-50",
        variants[variant],
        className
      )}
      {...props}
    />
  );
}

export function Input({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-sky-500/60 focus:ring-1 focus:ring-sky-500/40",
        className
      )}
      {...props}
    />
  );
}

export function Textarea({
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-sky-500/60 focus:ring-1 focus:ring-sky-500/40 min-h-[100px]",
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
      className={cn("mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-400", className)}
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
        "rounded-2xl border border-white/10 bg-zinc-950/80 p-5 shadow-[0_0_40px_rgba(0,0,0,0.35)] backdrop-blur",
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
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border border-sky-500/30 bg-sky-500/10 px-2.5 py-0.5 text-xs font-medium text-sky-300",
        className
      )}
    >
      {children}
    </span>
  );
}

export function ProgressBar({ value, className }: { value: number; className?: string }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className={cn("h-2 w-full overflow-hidden rounded-full bg-white/10", className)}>
      <div
        className="h-full rounded-full bg-gradient-to-r from-sky-600 to-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.5)]"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function SiteHeader({
  user,
}: {
  user?: { name?: string | null; handle?: string | null; reputation?: number } | null;
}) {
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-black/70 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="group flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-500 text-sm font-black text-black shadow-[0_0_20px_rgba(14,165,233,0.5)]">
            GF
          </span>
          <div>
            <div className="text-sm font-bold tracking-tight text-white group-hover:text-sky-300">
              GrokForge
            </div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">
              greater-good agents
            </div>
          </div>
        </Link>
        <nav className="flex flex-wrap items-center gap-1 text-sm text-zinc-300">
          <Link className="rounded-full px-3 py-1.5 hover:bg-white/5 hover:text-white" href="/projects">
            Projects
          </Link>
          <Link className="rounded-full px-3 py-1.5 hover:bg-white/5 hover:text-white" href="/projects/new">
            Propose
          </Link>
          <Link className="rounded-full px-3 py-1.5 hover:bg-white/5 hover:text-white" href="/dashboard">
            Dashboard
          </Link>
          <Link className="rounded-full px-3 py-1.5 hover:bg-white/5 hover:text-white" href="/about">
            About
          </Link>
          {user ? (
            <Link
              className="ml-1 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-sky-300 hover:border-sky-500/40"
              href="/dashboard"
            >
              @{user.handle || "you"} · {user.reputation ?? 0} rep
            </Link>
          ) : (
            <Link
              className="ml-1 rounded-full bg-sky-500 px-3 py-1.5 font-semibold text-black hover:bg-sky-400"
              href="/login"
            >
              Sign in
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-white/10 py-10 text-center text-xs text-zinc-500">
      <p>
        GrokForge · transparent multi-agent crowdfunding · open licenses default · never stores user API keys
      </p>
      <p className="mt-2">
        Built for the X / Grok ecosystem · demo-friendly · greater good only
      </p>
    </footer>
  );
}
