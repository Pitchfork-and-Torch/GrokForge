"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const STORAGE_KEY = "grokforge-onboarding-v1";

const TIPS = [
  {
    title: "Claim a leaf task",
    body: "Open Tasks lists work you can claim. Run Grok with your own keys, then submit for peer or creator review.",
    href: "/tasks",
    label: "Browse tasks",
  },
  {
    title: "Watch projects you care about",
    body: "On any project page, hit Watch to get notified when work ships or capital lands.",
    href: "/projects",
    label: "Browse projects",
  },
  {
    title: "Nightcap leftover tokens",
    body: "Near refill, gift estimated leftover capacity to platform ops or a project. No API keys stored.",
    href: "/dashboard#nightcap",
    label: "Open nightcap",
  },
  {
    title: "Climb the board",
    body: "Only accepted work ranks. Share your rank on X from the leaderboard when you appear.",
    href: "/leaderboard",
    label: "Leaderboard",
  },
] as const;

/**
 * First-visit coach for signed-in builders. Dismiss persists in localStorage.
 */
export function OnboardingTips({ signedIn }: { signedIn: boolean }) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!signedIn) return;
    try {
      if (localStorage.getItem(STORAGE_KEY) === "done") return;
      setOpen(true);
    } catch {
      /* ignore */
    }
  }, [signedIn]);

  if (!signedIn || !open) return null;

  const tip = TIPS[step];
  const last = step >= TIPS.length - 1;

  const dismiss = () => {
    setOpen(false);
    try {
      localStorage.setItem(STORAGE_KEY, "done");
    } catch {
      /* ignore */
    }
  };

  return (
    <div
      className="rounded-2xl border border-[color:var(--accent)]/40 bg-[color:var(--accent)]/8 p-4 shadow-[0_0_40px_var(--glow)] sm:p-5"
      role="region"
      aria-label="Getting started"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-[color:var(--accent)]">
            First forge · tip {step + 1}/{TIPS.length}
          </p>
          <h2 className="mt-1 text-lg font-semibold text-white">{tip.title}</h2>
          <p className="mt-1 max-w-xl text-sm text-stone-400">{tip.body}</p>
        </div>
        <button
          type="button"
          onClick={dismiss}
          className="text-xs text-stone-500 hover:text-stone-300"
          aria-label="Dismiss onboarding"
        >
          Skip all
        </button>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Link
          href={tip.href}
          className="inline-flex rounded-full bg-[color:var(--accent)] px-3.5 py-1.5 text-xs font-bold text-black"
        >
          {tip.label}
        </Link>
        {!last ? (
          <button
            type="button"
            onClick={() => setStep((s) => s + 1)}
            className="rounded-full border border-white/15 px-3.5 py-1.5 text-xs font-semibold text-stone-300 hover:border-[color:var(--accent)]/40"
          >
            Next tip
          </button>
        ) : (
          <button
            type="button"
            onClick={dismiss}
            className="rounded-full border border-white/15 px-3.5 py-1.5 text-xs font-semibold text-stone-300 hover:border-[color:var(--accent)]/40"
          >
            Got it
          </button>
        )}
        {step > 0 && (
          <button
            type="button"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            className="text-xs text-stone-500 hover:text-stone-300"
          >
            Back
          </button>
        )}
      </div>
    </div>
  );
}
