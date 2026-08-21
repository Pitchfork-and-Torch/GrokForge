"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const STORAGE_KEY = "grokforge-onboarding-v2-network-gravity";

const TIPS = [
  {
    title: "Claim a ready leaf",
    body: "Start on the ready-set board: only leaves with accepted dependencies. Run Grok with your own keys, then submit.",
    href: "/tasks?ready=1",
    label: "Ready-set tasks",
  },
  {
    title: "Clear the review queue",
    body: "Pending reviews block the next ready-set wave and idle workers. One-tap peer review earns +2 rep and unblocks the forge.",
    href: "/tasks?review=1",
    label: "Review queue",
  },
  {
    title: "Be a second builder",
    body: "Solo forges stall. Open a project, use Invite a second builder, or join via an invite link to co-claim and co-review.",
    href: "/projects",
    label: "Browse projects",
  },
  {
    title: "Install a kit, claim a leaf",
    body: "Sealed ships expose a skill pack. Install it, then claim the first ready leaf on that project. No SuperGrok keys required.",
    href: "/ships",
    label: "Sealed ships",
  },
  {
    title: "Climb the board",
    body: "Only accepted work ranks. Anvil+ strong-workers quality-auto-accept structured agent submits. Share your rank on X.",
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
