"use client";

import { useState } from "react";
import { Button } from "@/components/ui";

/** Copy a deep link to claim a leaf (growth / invite builders). */
export function ClaimShareButton({
  projectSlug,
  taskId,
  taskTitle,
  siteUrl = "https://grokforge.app",
}: {
  projectSlug: string;
  taskId: string;
  taskTitle: string;
  siteUrl?: string;
}) {
  const [copied, setCopied] = useState(false);
  const url = `${siteUrl.replace(/\/$/, "")}/projects/${projectSlug}#task-${taskId}`;
  const tweet = `Claim this GrokForge leaf: ${taskTitle}\n${url}\n#GrokForge #BuildInPublic`;

  return (
    <div className="flex flex-wrap gap-1.5">
      <Button
        type="button"
        variant="ghost"
        className="!px-2 !py-1 !text-[11px]"
        onClick={() => {
          void navigator.clipboard?.writeText(url).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          });
        }}
      >
        {copied ? "Copied link" : "Copy claim link"}
      </Button>
      <a
        href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(tweet)}`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center rounded-full border border-white/10 px-2 py-1 text-[11px] text-stone-400 hover:border-amber-500/40 hover:text-amber-200"
      >
        Share on X
      </a>
    </div>
  );
}
