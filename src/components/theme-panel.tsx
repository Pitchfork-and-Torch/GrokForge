"use client";

import { useEffect, useState } from "react";
import { saveThemePrefAction } from "@/lib/actions";
import {
  DEFAULT_THEME,
  THEMES,
  applyThemeToDocument,
  isThemeId,
  type ThemeId,
} from "@/lib/themes";

const STORAGE_KEY = "grokforge-theme";

export type { ThemeId };

export function ThemePanel({
  initialTheme,
  signedIn = false,
}: {
  initialTheme?: string | null;
  signedIn?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [theme, setTheme] = useState<ThemeId>(DEFAULT_THEME);

  useEffect(() => {
    try {
      const fromAccount =
        initialTheme && isThemeId(initialTheme) ? initialTheme : null;
      const raw = localStorage.getItem(STORAGE_KEY);
      const saved =
        fromAccount || (raw && isThemeId(raw) ? raw : null) || DEFAULT_THEME;
      setTheme(saved);
      applyThemeToDocument(saved);
      if (fromAccount) {
        try {
          localStorage.setItem(STORAGE_KEY, fromAccount);
        } catch {
          /* ignore */
        }
      }
    } catch {
      applyThemeToDocument(DEFAULT_THEME);
    }
  }, [initialTheme]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const pick = (id: ThemeId) => {
    setTheme(id);
    applyThemeToDocument(id);
    try {
      localStorage.setItem(STORAGE_KEY, id);
    } catch {
      /* ignore */
    }
    if (signedIn) {
      void saveThemePrefAction(id);
    }
  };

  const surprise = () => {
    const pool = THEMES.filter((t) => t.id !== theme);
    const next = pool[Math.floor(Math.random() * pool.length)] || THEMES[0];
    pick(next.id);
  };

  const current = THEMES.find((t) => t.id === theme) || THEMES[0];

  return (
    <div className="fixed bottom-[max(3.75rem,calc(env(safe-area-inset-bottom)+3.25rem))] right-3 z-[60] flex flex-col items-end gap-2 sm:bottom-4 sm:right-4">
      {open && (
        <div
          className="max-h-[min(70vh,32rem)] w-[min(100vw-1.5rem,20rem)] overflow-y-auto overflow-x-hidden rounded-2xl border border-[color:var(--accent)]/40 bg-[color:var(--background-elevated)] shadow-2xl sm:w-80"
          role="dialog"
          aria-label="Theme control center"
        >
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-[color:var(--background-elevated)] px-3 py-2">
            <div className="flex items-center gap-1.5" aria-hidden>
              <span className="h-2.5 w-2.5 rounded-full bg-rose-500/80" />
              <span className="h-2.5 w-2.5 rounded-full bg-amber-400/80" />
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/80" />
            </div>
            <span className="text-[10px] font-semibold uppercase tracking-widest text-stone-500">
              Control Center
            </span>
            <button
              type="button"
              className="text-xs text-stone-500 hover:text-white"
              onClick={() => setOpen(false)}
              aria-label="Close theme panel"
            >
              Esc
            </button>
          </div>

          {/* Live preview */}
          <div className="border-b border-white/10 p-3">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-stone-500">
              Live preview · {current.label}
            </p>
            <div
              className="space-y-2 rounded-xl border border-white/10 p-2.5"
              style={{
                background: current.vars["--background"],
                color: current.vars["--foreground"],
              }}
            >
              <div
                className="rounded-lg border px-2.5 py-2 text-xs"
                style={{
                  background: current.vars["--card"],
                  borderColor: `${current.vars["--accent"]}55`,
                }}
              >
                <div className="font-semibold" style={{ color: current.vars["--accent"] }}>
                  Sample project card
                </div>
                <div className="mt-0.5 opacity-70" style={{ color: current.vars["--muted"] }}>
                  Hierarchical multi-agent greater-good work
                </div>
              </div>
              <div
                className="flex items-center gap-2 rounded-lg border px-2 py-1.5 text-[11px]"
                style={{
                  background: current.vars["--background-elevated"],
                  borderColor: `${current.vars["--bronze"]}66`,
                }}
              >
                <span
                  className="flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-black"
                  style={{
                    background: current.vars["--accent"],
                    color: current.light ? "#1c1917" : "#0a0a0a",
                  }}
                >
                  1
                </span>
                <span>@builder · leaderboard row</span>
              </div>
            </div>
          </div>

          <ul className="space-y-1 p-2">
            {THEMES.map((t) => (
              <li key={t.id}>
                <button
                  type="button"
                  onClick={() => pick(t.id)}
                  className={
                    theme === t.id
                      ? "flex w-full items-start gap-3 rounded-xl border border-[color:var(--accent)]/45 bg-[color:var(--accent)]/10 px-3 py-2 text-left text-sm text-white"
                      : "flex w-full items-start gap-3 rounded-xl border border-transparent px-3 py-2 text-left text-sm text-stone-300 hover:bg-white/5"
                  }
                >
                  <span className="relative mt-0.5 h-5 w-5 shrink-0 overflow-hidden rounded-full border border-white/20 shadow">
                    <span
                      className="absolute inset-0"
                      style={{ background: t.swatch }}
                    />
                    {t.swatch2 && (
                      <span
                        className="absolute inset-y-0 right-0 w-1/2"
                        style={{ background: t.swatch2 }}
                      />
                    )}
                  </span>
                  <span className="min-w-0">
                    <span className="block font-medium">{t.label}</span>
                    <span className="block text-[10px] leading-snug text-stone-500">
                      {t.vibe}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/10 px-3 py-2">
            <button
              type="button"
              className="text-xs text-[color:var(--accent)] hover:underline"
              onClick={() => pick(DEFAULT_THEME)}
            >
              Reset to Obsidian Amber
            </button>
            <button
              type="button"
              className="rounded-full border border-white/15 px-2.5 py-1 text-[11px] font-semibold text-stone-300 hover:border-[color:var(--accent)]/40 hover:text-white"
              onClick={surprise}
            >
              Surprise me
            </button>
          </div>
        </div>
      )}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-11 w-11 items-center justify-center rounded-full border border-[color:var(--accent)]/40 bg-[color:var(--background-elevated)] text-[color:var(--accent)] shadow-lg hover:border-[color:var(--accent)]/70"
        aria-label="Open theme control center"
        aria-expanded={open}
        title="Themes"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M12 3a9 9 0 1 0 9 9c0-.5-.04-1-.12-1.48a5 5 0 0 1-6.4-6.4A9 9 0 0 0 12 3z" />
        </svg>
      </button>
    </div>
  );
}
