import { cn } from "@/lib/utils";
import Link from "next/link";
import React, {
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import { XFollowPill } from "@/components/x-follow-pill";
import { FounderBadge } from "@/components/founder-badge";
import { MobileNav } from "@/components/mobile-nav";
import {
  NotificationBell,
  type BellItem,
} from "@/components/notification-bell";
import { isFounderHandle } from "@/lib/identity";

export function Button({
  className,
  variant = "primary",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
}) {
  const variants = {
    primary:
      "bg-amber-500 text-black hover:bg-amber-400 shadow-[0_0_22px_rgba(245,158,11,0.4)] gf-btn-press",
    secondary:
      "bg-white/5 text-stone-100 border border-amber-900/40 hover:bg-white/10 hover:border-amber-700/50",
    ghost: "bg-transparent text-stone-300 hover:bg-white/5 hover:text-amber-100",
    danger: "bg-rose-700/90 text-white hover:bg-rose-600",
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

export const Input = React.forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement>
>(function Input({ className, ...props }, ref) {
  return (
    <input
      ref={ref}
      className={cn(
        "w-full rounded-xl border border-white/10 bg-black/50 px-3 py-2 text-sm text-stone-100 placeholder:text-stone-500 outline-none focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/40",
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
        "w-full min-h-[100px] rounded-xl border border-white/10 bg-black/50 px-3 py-2 text-sm text-stone-100 placeholder:text-stone-500 outline-none focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/40",
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
        "mb-1 block text-xs font-medium uppercase tracking-wide text-stone-400",
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
        "rounded-2xl border border-amber-900/35 bg-[#121212]/95 p-5 shadow-[0_0_40px_rgba(0,0,0,0.45)] backdrop-blur",
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
        "inline-flex items-center rounded-full border border-amber-500/35 bg-amber-500/10 px-2.5 py-0.5 text-xs font-medium text-amber-200",
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
        className="h-full rounded-full bg-gradient-to-r from-amber-700 to-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.45)]"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function SiteHeader({
  user,
  notifications = [],
  unreadCount = 0,
}: {
  user?: { name?: string | null; handle?: string | null; reputation?: number } | null;
  notifications?: BellItem[];
  unreadCount?: number;
}) {
  const link =
    "rounded-full px-2.5 py-1.5 text-sm text-stone-300 hover:bg-white/5 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400 sm:px-3";
  return (
    <header className="sticky top-0 z-40 border-b border-amber-900/40 bg-[#050505] sm:border-amber-900/30 sm:bg-black/75 sm:backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-3 py-2.5 sm:gap-3 sm:px-4 sm:py-3">
        <div className="flex min-w-0 items-center gap-1.5 sm:gap-2.5">
          {/* Follow pill is easy to crowd the logo on narrow phones */}
          <span className="hidden sm:inline-flex">
            <XFollowPill />
          </span>
          <span className="hidden h-5 w-px shrink-0 bg-white/15 sm:block" aria-hidden />
          <Link
            href="/"
            className="group flex min-w-0 items-center gap-2 rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-500 text-sm font-black text-black shadow-[0_0_20px_rgba(245,158,11,0.5)] sm:h-8 sm:w-8">
              GF
            </span>
            <div className="min-w-0">
              <div className="truncate text-sm font-bold tracking-tight text-white group-hover:text-amber-300">
                GrokForge
              </div>
              <div className="hidden text-[10px] uppercase tracking-[0.2em] text-stone-500 sm:block">
                greater-good agents · Ctrl+K
              </div>
            </div>
          </Link>
        </div>
        <nav
          className="hidden items-center justify-end gap-0.5 sm:flex sm:gap-1"
          aria-label="Main"
        >
          <Link className={link} href="/projects">
            Projects
          </Link>
          <Link className={cn(link, "hidden md:inline")} href="/ships">
            Ships
          </Link>
          <Link className={link} href="/tasks">
            Tasks
          </Link>
          <Link className={cn(link, "hidden lg:inline")} href="/activity">
            Activity
          </Link>
          <Link className={link} href="/leaderboard">
            Leaders
          </Link>
          <Link className={cn(link, "hidden lg:inline")} href="/rankings">
            Rank
          </Link>
          <Link className={link} href="/projects/new">
            Propose
          </Link>
          <Link className={link} href="/dashboard">
            Dash
          </Link>
          <Link className={cn(link, "hidden md:inline")} href="/about">
            About
          </Link>
          {user && (
            <NotificationBell
              initialUnread={unreadCount}
              initialItems={notifications}
            />
          )}
          {user ? (
            <Link
              className="ml-1 inline-flex max-w-[14rem] items-center gap-1.5 truncate rounded-full border border-amber-900/40 bg-white/5 px-2.5 py-1.5 text-xs text-amber-200 hover:border-amber-500/40 sm:max-w-none sm:px-3 sm:text-sm"
              href="/dashboard"
              title={`@${user.handle || "you"} · ${user.reputation ?? 0} rep`}
            >
              <span className="truncate">@{user.handle || "you"}</span>
              {isFounderHandle(user.handle) && (
                <FounderBadge className="hidden sm:inline-flex scale-90" />
              )}
              <span className="hidden sm:inline text-stone-500">
                · {user.reputation ?? 0} rep
              </span>
            </Link>
          ) : (
            <Link
              className="ml-1.5 inline-flex items-center gap-1.5 rounded-full border border-amber-300/40 bg-amber-500 px-3.5 py-1.5 text-sm font-bold tracking-tight text-black shadow-[0_0_24px_rgba(245,158,11,0.45)] transition hover:bg-amber-400 hover:shadow-[0_0_32px_rgba(245,158,11,0.65)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-200 sm:px-4 sm:py-2"
              href="/login"
              aria-label="Sign in with X"
            >
              <span aria-hidden className="text-[13px] font-black leading-none">
                &#120143;
              </span>
              <span className="whitespace-nowrap">Sign in with X</span>
            </Link>
          )}
        </nav>
        <div className="flex items-center gap-1.5 sm:hidden">
          {user && (
            <NotificationBell
              initialUnread={unreadCount}
              initialItems={notifications}
            />
          )}
          {!user && (
            <Link
              href="/login"
              className="inline-flex min-h-11 items-center rounded-full bg-amber-500 px-3.5 py-2 text-xs font-bold text-black"
              aria-label="Sign in with X"
            >
              Sign in
            </Link>
          )}
          <MobileNav user={user} />
        </div>
      </div>
    </header>
  );
}

export function SiteFooter({
  signedIn = false,
}: {
  signedIn?: boolean;
}) {
  return (
    <footer className="mt-12 border-t border-amber-900/30 py-8 sm:mt-16 sm:py-10">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 px-4 text-center text-xs text-stone-500 sm:gap-4">
        <p className="max-w-md leading-relaxed">
          GrokForge · transparent multi-agent crowdfunding · open licenses default · never stores
          user API keys
        </p>
        <nav
          className="flex max-w-lg flex-wrap justify-center gap-x-3 gap-y-2 text-stone-400 sm:max-w-none sm:gap-4"
          aria-label="Footer"
        >
          <Link className="hover:text-amber-300" href="/projects">
            Projects
          </Link>
          <Link className="hover:text-amber-300" href="/tasks">
            Open tasks
          </Link>
          <Link className="hover:text-amber-300" href="/activity">
            Activity
          </Link>
          <Link className="hover:text-amber-300" href="/leaderboard">
            Leaderboard
          </Link>
          <Link className="hover:text-amber-300" href="/projects/new">
            Propose
          </Link>
          <Link className="hover:text-amber-300" href="/about">
            About
          </Link>
          <Link className="hover:text-amber-300" href="/status">
            Status
          </Link>
          <Link className="hover:text-amber-300" href="/feed.xml">
            RSS
          </Link>
          {signedIn ? (
            <Link className="hover:text-amber-300" href="/dashboard">
              Dashboard
            </Link>
          ) : (
            <Link className="hover:text-amber-300" href="/login">
              Sign in with X
            </Link>
          )}
          <a
            className="hover:text-amber-300"
            href="https://github.com/Pitchfork-and-Torch/GrokForge"
            rel="noopener noreferrer"
            target="_blank"
          >
            GitHub
          </a>
          <a
            className="hover:text-amber-300"
            href="https://x.com/suddenlyjon"
            rel="noopener noreferrer"
            target="_blank"
            title="Follow @suddenlyjon on X"
          >
            @suddenlyjon
          </a>
        </nav>
        <p className="text-stone-600">Built for the X / Grok ecosystem · greater good only</p>
      </div>
    </footer>
  );
}
