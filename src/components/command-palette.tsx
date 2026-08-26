"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

type Cmd = {
  id: string;
  label: string;
  hint?: string;
  href: string;
  keys?: string;
  signedInOnly?: boolean;
};

const COMMANDS: Cmd[] = [
  { id: "home", label: "Home", href: "/", keys: "G H" },
  { id: "projects", label: "Browse projects", href: "/projects", keys: "G P" },
  { id: "tasks", label: "Open tasks", href: "/tasks", keys: "G T" },
  { id: "activity", label: "Network activity", href: "/activity", keys: "G A" },
  { id: "leaders", label: "Leaderboard", href: "/leaderboard", keys: "G L" },
  { id: "rankings", label: "Project rankings", href: "/rankings", keys: "G R" },
  { id: "propose", label: "Propose a project", href: "/projects/new", keys: "G N", signedInOnly: true },
  { id: "dash", label: "Dashboard", href: "/dashboard", keys: "G D", signedInOnly: true },
  { id: "cockpit", label: "Creator cockpit", href: "/cockpit", keys: "G C", signedInOnly: true },
  { id: "ships", label: "Sealed ships", href: "/ships", keys: "G S" },
  { id: "review", label: "Review queue", href: "/tasks?review=1" },
  { id: "goodfirst", label: "Good first leaves", href: "/tasks?goodFirst=1" },
  { id: "forge", label: "Live forge", href: "/forge" },
  { id: "quests", label: "Quest templates", href: "/quests" },
  { id: "about", label: "About", href: "/about" },
  { id: "status", label: "System status", href: "/status" },
  { id: "login", label: "Sign in with X", href: "/login" },
];

export function CommandPalette() {
  const router = useRouter();
  const { data: session } = useSession();
  const signedIn = !!session?.user;
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [gPending, setGPending] = useState(false);
  const [active, setActive] = useState(0);

  const items = useMemo(() => {
    const base = COMMANDS.filter((c) => {
      if (c.id === "login" && signedIn) return false;
      if (c.signedInOnly && !signedIn) return false;
      return true;
    });
    const qq = q.trim().toLowerCase();
    if (!qq) return base;
    return base.filter(
      (c) =>
        c.label.toLowerCase().includes(qq) ||
        c.href.toLowerCase().includes(qq) ||
        (c.keys || "").toLowerCase().includes(qq)
    );
  }, [q, signedIn]);

  useEffect(() => {
    setActive(0);
  }, [q, open]);

  useEffect(() => {
    const onOpen = () => {
      setOpen(true);
      setQ("");
    };
    window.addEventListener("gf-cmdk", onOpen);
    return () => window.removeEventListener("gf-cmdk", onOpen);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      const typing =
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        (e.target as HTMLElement)?.isContentEditable;

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
        setQ("");
        return;
      }
      if (e.key === "Escape") {
        setOpen(false);
        setGPending(false);
        return;
      }

      if (open) {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          setActive((i) => Math.min(items.length - 1, i + 1));
        } else if (e.key === "ArrowUp") {
          e.preventDefault();
          setActive((i) => Math.max(0, i - 1));
        } else if (e.key === "Enter" && items[active]) {
          e.preventDefault();
          router.push(items[active].href);
          setOpen(false);
        }
        return;
      }

      if (typing) return;

      // G then letter chords
      if (e.key.toLowerCase() === "g" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        setGPending(true);
        window.setTimeout(() => setGPending(false), 900);
        return;
      }
      if (gPending && !e.metaKey && !e.ctrlKey) {
        const map: Record<string, string> = {
          h: "/",
          p: "/projects",
          t: "/tasks",
          a: "/activity",
          l: "/leaderboard",
          d: "/dashboard",
          n: "/projects/new",
          c: "/cockpit",
          s: "/ships",
        };
        const href = map[e.key.toLowerCase()];
        if (href) {
          e.preventDefault();
          if (
            (href === "/dashboard" || href === "/projects/new" || href === "/cockpit") &&
            !signedIn
          ) {
            router.push("/login");
          } else {
            router.push(href);
          }
        }
        setGPending(false);
      }

      if (e.key === "?" && !e.metaKey && !e.ctrlKey) {
        setOpen(true);
        setQ("");
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, items, active, gPending, router, signedIn]);

  return (
    <>
      {gPending && (
        <div className="pointer-events-none fixed bottom-20 left-4 z-[55] rounded-lg border border-[color:var(--border)] bg-[var(--background-elevated)] px-2 py-1 text-[10px] text-[var(--accent)]">
          G...
        </div>
      )}
      {open && (
        <div
          className="fixed inset-0 z-[70] flex items-start justify-center bg-black/70 px-4 pt-[12vh] backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="Command palette"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div className="gf-surface w-full max-w-lg overflow-hidden rounded-2xl">
            <div className="border-b border-white/10 px-3 py-2">
              <input
                autoFocus
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Jump to... (Ctrl/Cmd+K)"
                className="w-full bg-transparent text-sm text-stone-100 outline-none placeholder:text-stone-600"
              />
            </div>
            <ul className="max-h-72 overflow-y-auto py-1">
              {items.map((c, i) => (
                <li key={c.id}>
                  <button
                    type="button"
                    className={
                      i === active
                        ? "flex min-h-11 w-full items-center justify-between px-3 py-2.5 text-left text-sm bg-[color:var(--accent)]/15 text-[var(--foreground)]"
                        : "flex min-h-11 w-full items-center justify-between px-3 py-2.5 text-left text-sm text-[var(--muted)] hover:bg-white/5"
                    }
                    onMouseEnter={() => setActive(i)}
                    onClick={() => {
                      router.push(c.href);
                      setOpen(false);
                    }}
                  >
                    <span>{c.label}</span>
                    {c.keys && (
                      <kbd className="text-[10px] text-stone-600">{c.keys}</kbd>
                    )}
                  </button>
                </li>
              ))}
              {items.length === 0 && (
                <li className="px-3 py-4 text-sm text-stone-500">No matches</li>
              )}
            </ul>
            <div className="border-t border-white/10 px-3 py-2 text-[10px] text-stone-600">
              Esc close · up/down · Enter · ? help · G then H/P/T/L/D/N/C/S
            </div>
          </div>
        </div>
      )}
    </>
  );
}
