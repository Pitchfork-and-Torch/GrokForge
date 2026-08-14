"use client";

import { useMemo, useState, useTransition } from "react";
import { Button } from "@/components/ui";
import { noteLeaderboardShareAction } from "@/lib/actions";

export function ShareRankTweet({
  handle,
  rank,
  score,
  reputation,
  badgeLabels = [],
  streakDays = 0,
  siteUrl = "https://grokforge.app",
  compact = false,
}: {
  handle: string;
  rank: number;
  score?: number;
  reputation?: number;
  badgeLabels?: string[];
  streakDays?: number;
  siteUrl?: string;
  compact?: boolean;
}) {
  const h = handle.replace(/^@/, "");
  const profile = `${siteUrl.replace(/\/$/, "")}/u/${h}`;
  const badgeBit =
    badgeLabels.slice(0, 3).join(" · ") ||
    (streakDays >= 2 ? `${streakDays}d streak` : "building in public");

  const defaultText = useMemo(
    () =>
      [
        "Forging hierarchical multi-agent work for the greater good on GrokForge",
        "",
        `Rank #${rank}${score != null ? ` · score ${score}` : ""}${
          reputation != null ? ` · ${reputation} rep` : ""
        } · ${badgeBit}`,
        "",
        `Check my profile & contribute: ${profile}`,
        "",
        "#GrokForge #xAI #PublicGoods #OpenSource",
      ].join("\n"),
    [rank, score, reputation, badgeBit, profile]
  );

  const [text, setText] = useState(defaultText);
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();

  const intent = `https://x.com/intent/tweet?text=${encodeURIComponent(text)}`;

  const share = () => {
    start(async () => {
      try {
        await noteLeaderboardShareAction({ handle: h, rank });
      } catch {
        /* non-fatal */
      }
      window.open(intent, "_blank", "noopener,noreferrer");
      setOpen(false);
    });
  };

  if (compact) {
    return (
      <a
        href={intent}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => {
          void noteLeaderboardShareAction({ handle: h, rank }).catch(() => {});
        }}
        className="inline-flex rounded-full border border-[color:var(--accent)]/40 bg-[color:var(--accent)]/10 px-2.5 py-1 text-[11px] font-semibold text-[color:var(--accent-hover)] hover:bg-[color:var(--accent)]/20"
      >
        Share on X
      </a>
    );
  }

  return (
    <div className="relative">
      <Button type="button" variant="secondary" onClick={() => setOpen((v) => !v)}>
        Share on X
      </Button>
      {open && (
        <div
          className="absolute right-0 z-40 mt-2 w-[min(100vw-2rem,22rem)] rounded-2xl border border-[color:var(--accent)]/35 bg-[color:var(--background-elevated)] p-3 shadow-2xl"
          role="dialog"
          aria-label="Edit rank tweet"
        >
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[color:var(--accent)]">
            Share your rank
          </p>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={8}
            className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-xs text-stone-200"
          />
          <div className="mt-2 flex flex-wrap gap-2">
            <Button type="button" disabled={pending} onClick={share}>
              {pending ? "Opening..." : "Post on X"}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
