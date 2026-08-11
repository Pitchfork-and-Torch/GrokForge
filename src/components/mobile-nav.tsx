"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import { isFounderHandle } from "@/lib/identity";
import { FounderBadge } from "@/components/founder-badge";

type UserChip = {
  name?: string | null;
  handle?: string | null;
  reputation?: number;
} | null;

const links = [
  { href: "/projects", label: "Projects" },
  { href: "/tasks", label: "Open tasks" },
  { href: "/cockpit", label: "Cockpit" },
  { href: "/quests", label: "Quests" },
  { href: "/activity", label: "Activity" },
  { href: "/leaderboard", label: "Leaders" },
  { href: "/rankings", label: "Rankings" },
  { href: "/projects/new", label: "Propose" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/about", label: "About" },
  { href: "/status", label: "Status" },
];

export function MobileNav({ user }: { user?: UserChip }) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  const drawer =
    mounted &&
    createPortal(
      <>
        {/* Scrim - solid enough that page content never reads through */}
        <div
          className={cn(
            "fixed inset-0 z-[200] bg-black/85 transition-opacity duration-200 sm:hidden",
            open ? "opacity-100" : "pointer-events-none opacity-0"
          )}
          onClick={() => setOpen(false)}
          aria-hidden={!open}
        />

        {/* Panel - fully opaque; portaled out of header stacking context */}
        <nav
          id="mobile-nav-drawer"
          className={cn(
            "fixed inset-y-0 right-0 z-[210] flex w-[min(100%,20rem)] flex-col border-l border-amber-900/50 bg-[#050505] p-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))] shadow-[-12px_0_40px_rgba(0,0,0,0.85)] transition-transform duration-200 ease-out sm:hidden",
            open ? "translate-x-0" : "pointer-events-none translate-x-full"
          )}
          style={{ backgroundColor: "#050505" }}
          aria-hidden={!open}
          aria-label="Mobile menu"
        >
          <div
            className="mb-3 flex items-center justify-between border-b border-amber-900/40 pb-3"
            style={{ backgroundColor: "#050505" }}
          >
            <span className="text-sm font-bold tracking-tight text-white">Menu</span>
            <button
              type="button"
              className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border border-white/10 text-sm text-stone-300 hover:bg-white/5 hover:text-white"
              onClick={() => setOpen(false)}
              aria-label="Close menu"
            >
              Close
            </button>
          </div>

          <ul className="flex flex-1 flex-col gap-0.5 overflow-y-auto">
            {links.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  className="flex min-h-12 items-center rounded-xl px-3 py-3 text-base font-medium text-stone-100 hover:bg-amber-500/15 hover:text-amber-200 active:bg-amber-500/20"
                  onClick={() => setOpen(false)}
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>

          <div
            className="mt-3 space-y-2 border-t border-amber-900/40 pt-4"
            style={{ backgroundColor: "#050505" }}
          >
            {user ? (
              <>
                <Link
                  href="/dashboard"
                  className="flex min-h-12 flex-wrap items-center gap-2 rounded-xl border border-amber-900/50 bg-[#121212] px-3 py-3 text-sm text-amber-200"
                  onClick={() => setOpen(false)}
                >
                  @{user.handle || "you"}
                  {isFounderHandle(user.handle) && <FounderBadge />}
                  <span className="text-stone-500">· {user.reputation ?? 0} rep</span>
                </Link>
                <button
                  type="button"
                  className="flex min-h-12 w-full items-center justify-center rounded-xl border border-white/15 bg-[#121212] px-3 py-3 text-sm text-stone-200 hover:bg-white/5"
                  onClick={() => {
                    setOpen(false);
                    void signOut({ callbackUrl: "/" });
                  }}
                >
                  Sign out
                </button>
              </>
            ) : (
              <Link
                href="/login"
                className="flex min-h-12 items-center justify-center gap-2 rounded-full bg-amber-500 px-4 py-3 text-sm font-bold text-black shadow-[0_0_24px_rgba(245,158,11,0.4)]"
                onClick={() => setOpen(false)}
                aria-label="Sign in with X"
              >
                <span aria-hidden className="font-black">
                  &#120143;
                </span>
                Sign in with X
              </Link>
            )}
          </div>
        </nav>
      </>,
      document.body
    );

  return (
    <div className="sm:hidden">
      <button
        type="button"
        className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-amber-800/60 bg-[#121212] text-amber-200 shadow-sm"
        aria-expanded={open}
        aria-controls="mobile-nav-drawer"
        aria-label={open ? "Close menu" : "Open menu"}
        onClick={() => setOpen((v) => !v)}
      >
        {open ? (
          <span className="text-xl leading-none" aria-hidden>
            ×
          </span>
        ) : (
          <span className="flex flex-col gap-1.5" aria-hidden>
            <span className="block h-0.5 w-4 rounded bg-amber-300" />
            <span className="block h-0.5 w-4 rounded bg-amber-300" />
            <span className="block h-0.5 w-4 rounded bg-amber-300" />
          </span>
        )}
      </button>
      {drawer}
    </div>
  );
}
