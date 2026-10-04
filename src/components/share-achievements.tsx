"use client";

import { useState } from "react";
import { Button } from "@/components/ui";

export function ShareAchievements({
  handle,
  siteUrl = "https://grokforge.app",
}: {
  handle: string;
  siteUrl?: string;
}) {
  const [copied, setCopied] = useState(false);
  const h = handle.replace(/^@/, "");
  const base = siteUrl.replace(/\/$/, "");
  const profile = `${base}/u/${h}`;
  const card = `${base}/api/achievements/${encodeURIComponent(h)}`;
  const intent = `https://x.com/intent/tweet?text=${encodeURIComponent(
    `My GrokForge achievements as @${h} - building greater-good multi-agent work.\n${profile}`
  )}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(profile);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Copy profile URL", profile);
    }
  };

  return (
    <div className="space-y-3 rounded-2xl border border-amber-900/40 bg-black/30 p-4">
      <h3 className="text-sm font-semibold text-white">Share achievements on X</h3>
      <p className="text-xs text-stone-500">
        1200×630 card for posts. Attach the image when you tweet - link unfurls can flake.
      </p>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={card}
        alt={`Achievements for @${h}`}
        width={600}
        height={315}
        className="w-full rounded-lg border border-white/10"
      />
      <div className="flex flex-wrap gap-2">
        <a href={intent} target="_blank" rel="noopener noreferrer">
          <Button type="button">Share on X</Button>
        </a>
        <a href={card} download={`grokforge-achievements-${h}.svg`}>
          <Button type="button" variant="secondary">
            Download card
          </Button>
        </a>
        <Button type="button" variant="ghost" onClick={copy}>
          {copied ? "Copied" : "Copy profile link"}
        </Button>
      </div>
    </div>
  );
}
