"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import { isFounderHandle } from "@/lib/identity";
import { FounderBadge } from "@/components/founder-badge";
import { MobileNav } from "@/components/mobile-nav";
import { XFollowPill } from "@/components/x-follow-pill";
import { SiteFooter } from "@/components/ui";
import {
  NotificationBell,
  type BellItem,
} from "@/components/notification-bell";
import { StickyMobileBar } from "@/components/sticky-mobile-bar";

type UserChip = {
  name?: string | null;
  handle?: string | null;
  reputation?: number;
} | null;

type NavItem = {
  href: string;
  label: string;
  signedInOnly?: boolean;
};

const WORK: NavItem[] = [
  { href: "/projects", label: "Projects" },
  { href: "/tasks", label: "Tasks" },
  { href: "/projects/new", label: "Propose", signedInOnly: true },
];

const YOU: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", signedInOnly: true },
  { href: "/cockpit", label: "Cockpit", signedInOnly: true },
];

const NETWORK: NavItem[] = [
  { href: "/leaderboard", label: "Leaders" },
  { href: "/activity", label: "Activity" },
  { href: "/rankings", label: "Rankings" },
];

const STUDIO: NavItem[] = [
  { href: "/forge", label: "Forge" },
  { href: "/ships", label: "Ships" },
  { href: "/quests", label: "Quests" },
];

const MARKETING_LINKS: NavItem[] = [
  { href: "/projects", label: "Projects" },
  { href: "/tasks", label: "Tasks" },
];

function isMarketingPath(path: string) {
  return path === "/" || path === "/login" || path === "/about" || path === "/status";
}

function itemActive(path: string, href: string) {
  if (href === "/") return path === "/";
  if (href === "/projects/new") return path === "/projects/new";
  if (href === "/projects") return path === "/projects" || (path.startsWith("/projects/") && !path.startsWith("/projects/new"));
  return path === href || path.startsWith(`${href}/`);
}

function visibleItems(items: NavItem[], signedIn: boolean) {
  return items.filter((it) => !it.signedInOnly || signedIn);
}

function openCommandPalette() {
  window.dispatchEvent(new Event("gf-cmdk"));
}

function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <Link
      href="/"
      className="group flex min-w-0 items-center gap-2 rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--accent)] text-sm font-black text-black shadow-[0_0_20px_var(--glow)]">
        GF
      </span>
      {!compact && (
        <span className="font-display truncate text-sm font-bold tracking-tight text-[var(--foreground)] group-hover:text-[var(--accent)]">
          GrokForge
        </span>
      )}
    </Link>
  );
}

function CmdkButton({ className }: { className?: string }) {
  return (
    <button
      type="button"
      onClick={openCommandPalette}
      className={cn(
        "inline-flex min-h-11 items-center gap-2 rounded-full border border-[color:var(--border)] bg-black/30 px-3 text-left text-sm text-[var(--muted)] hover:border-[color:var(--accent)]/40 hover:text-[var(--foreground)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]",
        className
      )}
      aria-label="Open command palette"
    >
      <span className="truncate">Jump to...</span>
      <kbd className="hidden rounded border border-white/10 px-1.5 py-0.5 text-[10px] text-stone-500 sm:inline">
        Ctrl K
      </kbd>
    </button>
  );
}

function UserMenu({ user }: { user: NonNullable<UserChip> }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        className="inline-flex max-w-[10rem] items-center gap-1.5 truncate rounded-full border border-[color:var(--border)] bg-white/5 px-3 py-2 text-sm text-[var(--accent)] hover:border-[color:var(--accent)]/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={menuId}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="truncate">@{user.handle || "you"}</span>
        {isFounderHandle(user.handle) && <FounderBadge className="hidden xl:inline-flex scale-90" />}
      </button>
      {open && (
        <div
          id={menuId}
          role="menu"
          className="absolute right-0 top-full z-50 mt-1.5 min-w-[12rem] rounded-xl border border-[color:var(--border)] bg-[var(--background-elevated)] py-1.5 shadow-[0_12px_40px_rgba(0,0,0,0.75)]"
        >
          <p className="px-3.5 py-1.5 text-[11px] text-stone-500">
            {user.reputation ?? 0} rep
          </p>
          <Link
            role="menuitem"
            href="/dashboard"
            className="block px-3.5 py-2 text-sm text-stone-200 hover:bg-amber-500/15 hover:text-amber-100"
            onClick={() => setOpen(false)}
          >
            Dashboard
          </Link>
          <Link
            role="menuitem"
            href="/cockpit"
            className="block px-3.5 py-2 text-sm text-stone-200 hover:bg-amber-500/15 hover:text-amber-100"
            onClick={() => setOpen(false)}
          >
            Cockpit
          </Link>
          <button
            type="button"
            role="menuitem"
            className="block w-full px-3.5 py-2 text-left text-sm text-stone-200 hover:bg-amber-500/15 hover:text-amber-100"
            onClick={() => {
              setOpen(false);
              void signOut({ callbackUrl: "/" });
            }}
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}

function SignInLink({ compact = false }: { compact?: boolean }) {
  return (
    <Link
      className="inline-flex min-h-11 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full bg-[var(--accent)] px-3.5 py-2 text-sm font-bold tracking-tight text-black shadow-[0_0_24px_var(--glow)] hover:bg-[var(--accent-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-hover)]"
      href="/login"
      aria-label="Sign in with X"
    >
      <span aria-hidden className="text-[13px] font-black leading-none">
        &#120143;
      </span>
      {compact ? "Sign in" : "Sign in with X"}
    </Link>
  );
}

function NavGroup({
  title,
  items,
  path,
}: {
  title: string;
  items: NavItem[];
  path: string;
}) {
  if (items.length === 0) return null;
  return (
    <div className="space-y-1">
      <p className="px-2.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
        {title}
      </p>
      <ul className="space-y-0.5">
        {items.map((it) => {
          const active = itemActive(path, it.href);
          return (
            <li key={it.href}>
              <Link
                href={it.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-11 items-center rounded-xl px-2.5 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]",
                  active
                    ? "bg-[color:var(--accent)]/15 text-[var(--accent)]"
                    : "text-[var(--muted)] hover:bg-white/5 hover:text-[var(--foreground)]"
                )}
              >
                {it.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function SideRail({
  signedIn,
  user,
  path,
}: {
  signedIn: boolean;
  user?: UserChip;
  path: string;
}) {
  return (
    <aside
      className="fixed inset-y-0 left-0 z-30 hidden w-[15.5rem] flex-col border-r border-[color:var(--border)] bg-[var(--background-elevated)] lg:flex"
      aria-label="Workspace"
    >
      <div className="flex h-14 items-center px-3">
        <BrandMark />
      </div>
      <nav className="flex flex-1 flex-col gap-5 overflow-y-auto px-2.5 pb-4">
        <NavGroup title="Work" items={visibleItems(WORK, signedIn)} path={path} />
        <NavGroup title="You" items={visibleItems(YOU, signedIn)} path={path} />
        <NavGroup title="Network" items={NETWORK} path={path} />
        <NavGroup title="Studio" items={STUDIO} path={path} />
      </nav>
      <div className="space-y-2 border-t border-[color:var(--border)] p-3">
        <XFollowPill showLabel className="!h-9 !max-h-9 !pr-2.5" />
        <div className="flex flex-wrap gap-x-3 gap-y-1 px-1 text-[11px] text-stone-500">
          <Link href="/about" className="hover:text-[var(--accent)]">
            About
          </Link>
          <Link href="/status" className="hover:text-[var(--accent)]">
            Status
          </Link>
          {user?.handle && (
            <Link href={`/u/${user.handle}`} className="hover:text-[var(--accent)]">
              Profile
            </Link>
          )}
        </div>
      </div>
    </aside>
  );
}

export function AppChrome({
  user,
  notifications = [],
  unreadCount = 0,
  profileHref = null,
  children,
}: {
  user?: UserChip;
  notifications?: BellItem[];
  unreadCount?: number;
  profileHref?: string | null;
  children: ReactNode;
}) {
  const path = usePathname() || "/";
  const signedIn = !!user;
  const product = !isMarketingPath(path);

  return (
    <div className={product ? "gf-shell-product" : "gf-shell-marketing"}>
      {product && <SideRail signedIn={signedIn} user={user} path={path} />}

      <header className="gf-chrome sticky top-0 z-40 border-b bg-[var(--background)]">
        <div
          className={cn(
            "mx-auto flex h-14 flex-nowrap items-center justify-between gap-2 px-3 sm:px-4",
            product ? "max-w-none" : "max-w-6xl"
          )}
        >
          <div className="flex min-w-0 items-center gap-2 lg:gap-3">
            <span className="gf-header-brand">
              <BrandMark compact={product} />
            </span>
            {!product && (
              <nav className="hidden items-center gap-0.5 sm:flex" aria-label="Main">
                {MARKETING_LINKS.map((it) => (
                  <Link
                    key={it.href}
                    href={it.href}
                    className="whitespace-nowrap rounded-full px-3 py-1.5 text-sm text-[var(--muted)] hover:bg-white/5 hover:text-[var(--foreground)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
                  >
                    {it.label}
                  </Link>
                ))}
              </nav>
            )}
          </div>

          <div className="hidden min-w-0 flex-1 justify-center px-2 sm:flex">
            <CmdkButton className="w-full max-w-md" />
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              onClick={openCommandPalette}
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[color:var(--border)] text-[var(--muted)] hover:text-[var(--foreground)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] sm:hidden"
              aria-label="Open command palette"
            >
              /
            </button>
            {user && (
              <NotificationBell
                initialUnread={unreadCount}
                initialItems={notifications}
              />
            )}
            <div className="hidden sm:block">
              {user ? <UserMenu user={user} /> : <SignInLink />}
            </div>
            <div className="sm:hidden">
              <MobileNav user={user} />
            </div>
          </div>
        </div>
      </header>

      <main
        id="main"
        className={cn(
          "gf-shell-main min-h-[70vh] px-3 py-5 pb-20 sm:px-4 sm:py-8 sm:pb-8",
          !product && "mx-auto max-w-6xl"
        )}
      >
        {children}
      </main>

      <div className="gf-shell-footer">
        <SiteFooter signedIn={signedIn} />
      </div>

      <StickyMobileBar signedIn={signedIn} profileHref={profileHref} />
    </div>
  );
}
