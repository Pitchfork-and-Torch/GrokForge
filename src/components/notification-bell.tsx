"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { markNotificationsReadAction } from "@/lib/actions";

export type BellItem = {
  id: string;
  title: string;
  body: string;
  href: string | null;
  read: boolean;
  createdAt: string;
};

export function NotificationBell({
  initialUnread,
  initialItems,
}: {
  initialUnread: number;
  initialItems: BellItem[];
}) {
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(initialUnread);
  const [items, setItems] = useState(initialItems);
  const [pending, start] = useTransition();
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setUnread(initialUnread);
    setItems(initialItems);
  }, [initialUnread, initialItems]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (root.current && !root.current.contains(e.target as Node)) {
        setOpen(false);
      }
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
    <div className="relative" ref={root}>
      <button
        type="button"
        className="relative inline-flex h-11 w-11 items-center justify-center rounded-full border border-amber-900/50 bg-[#121212] text-amber-200 hover:border-amber-500/50 sm:h-9 sm:w-9 sm:bg-white/5"
        aria-label={
          unread > 0
            ? `${unread} unread notifications`
            : "Notifications"
        }
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M12 22a2.5 2.5 0 0 0 2.45-2h-4.9A2.5 2.5 0 0 0 12 22zm7-6V11a7 7 0 1 0-14 0v5l-2 2v1h18v-1l-2-2z" />
        </svg>
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-bold text-black">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-[min(100vw-2rem,20rem)] overflow-hidden rounded-2xl border border-amber-900/40 bg-[#050505] shadow-2xl" style={{ backgroundColor: "#050505" }}>
          <div className="flex items-center justify-between border-b border-white/10 px-3 py-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-stone-400">
              Notifications
            </span>
            {unread > 0 && (
              <button
                type="button"
                disabled={pending}
                className="text-[11px] text-amber-400 hover:underline"
                onClick={() =>
                  start(async () => {
                    await markNotificationsReadAction();
                    setUnread(0);
                    setItems((prev) => prev.map((i) => ({ ...i, read: true })));
                  })
                }
              >
                Mark all read
              </button>
            )}
          </div>
          <ul className="max-h-72 overflow-y-auto">
            {items.length === 0 && (
              <li className="px-3 py-4 text-sm text-stone-500">
                No notifications yet. Comments and donations on your projects show up here.
              </li>
            )}
            {items.map((n) => (
              <li
                key={n.id}
                className={
                  n.read
                    ? "border-b border-white/5 px-3 py-2.5"
                    : "border-b border-white/5 bg-amber-500/5 px-3 py-2.5"
                }
              >
                {n.href ? (
                  <Link
                    href={n.href}
                    className="block"
                    onClick={() => setOpen(false)}
                  >
                    <div className="text-sm font-medium text-stone-100">{n.title}</div>
                    <p className="mt-0.5 line-clamp-2 text-xs text-stone-500">{n.body}</p>
                    <p className="mt-1 text-[10px] text-stone-600">{n.createdAt}</p>
                  </Link>
                ) : (
                  <>
                    <div className="text-sm font-medium text-stone-100">{n.title}</div>
                    <p className="mt-0.5 line-clamp-2 text-xs text-stone-500">{n.body}</p>
                  </>
                )}
              </li>
            ))}
          </ul>
          <div className="border-t border-white/10 px-3 py-2">
            <Link
              href="/dashboard"
              className="text-xs font-medium text-amber-400 hover:underline"
              onClick={() => setOpen(false)}
            >
              Open dashboard
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
