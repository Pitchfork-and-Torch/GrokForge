"use client";

import { useState } from "react";
import { Button } from "@/components/ui";

export function BuilderWidgetCard({
  handle,
  siteUrl = "https://grokforge.app",
}: {
  handle: string;
  siteUrl?: string;
}) {
  const [copied, setCopied] = useState(false);
  const h = handle.replace(/^@/, "");
  const profile = `${siteUrl.replace(/\/$/, "")}/u/${h}`;
  const svgUrl = `${siteUrl.replace(/\/$/, "")}/api/widget/${encodeURIComponent(h)}`;
  const markdown = `[![GrokForge Builder @${h}](${svgUrl})](${profile})`;
  const html = `<a href="${profile}"><img src="${svgUrl}" alt="GrokForge Builder @${h}" width="320" height="80" /></a>`;

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Copy widget code", text);
    }
  };

  return (
    <div className="space-y-3 rounded-2xl border border-amber-900/40 bg-black/30 p-4">
      <h3 className="text-sm font-semibold text-white">X bio / post widget</h3>
      <p className="text-xs text-stone-500">
        Sharp SVG badge for your profile or posts. Link points at your GrokForge profile.
      </p>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={svgUrl}
        alt={`GrokForge widget for @${h}`}
        width={320}
        height={80}
        className="rounded-lg border border-white/10"
      />
      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={() => copy(markdown)}>
          {copied ? "Copied" : "Copy markdown"}
        </Button>
        <Button type="button" variant="secondary" onClick={() => copy(html)}>
          Copy HTML
        </Button>
        <a href={svgUrl} download={`grokforge-${h}.svg`}>
          <Button type="button" variant="ghost">
            Download SVG
          </Button>
        </a>
      </div>
    </div>
  );
}
