"use client";

import { useState } from "react";
import { Button, Card } from "@/components/ui";

/**
 * Human-friendly skill pack install (not a raw JSON wall).
 * Download file + copy CLI command for Grok Build / local agents.
 */
export function SkillPackInstall({
  slug,
  title,
  skillPackApiUrl,
  compact = false,
}: {
  slug: string;
  title: string;
  /** Base API URL without query, e.g. https://grokforge.app/api/projects/foo/skill-pack */
  skillPackApiUrl: string;
  compact?: boolean;
}) {
  const [copied, setCopied] = useState<"cmd" | "url" | null>(null);
  const downloadUrl = `${skillPackApiUrl}${skillPackApiUrl.includes("?") ? "&" : "?"}download=1`;
  const mdUrl = `${skillPackApiUrl}${skillPackApiUrl.includes("?") ? "&" : "?"}format=md`;
  const cmd = `node scripts/install-skill-pack.mjs ${slug}`;

  function copy(text: string, kind: "cmd" | "url") {
    void navigator.clipboard?.writeText(text).then(() => {
      setCopied(kind);
      setTimeout(() => setCopied(null), 2000);
    });
  }

  if (compact) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <a href={downloadUrl}>
          <Button type="button" variant="secondary">
            Download skill pack
          </Button>
        </a>
        <Button
          type="button"
          variant="ghost"
          className="!text-xs"
          onClick={() => copy(cmd, "cmd")}
        >
          {copied === "cmd" ? "Copied command" : "Copy install command"}
        </Button>
      </div>
    );
  }

  return (
    <Card className="space-y-3 border-sky-500/25 bg-sky-500/5">
      <div>
        <h3 className="text-sm font-semibold text-sky-100">
          Install skill pack
        </h3>
        <p className="mt-1 text-xs text-stone-400">
          For Grok Build / local agents: download the pack or run the installer
          from a GrokForge checkout. Files land under{" "}
          <code className="text-stone-300">~/.grok/skills/</code>. Never needs
          SuperGrok keys.
        </p>
        <p className="mt-1 text-[11px] text-stone-500">{title}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <a href={downloadUrl}>
          <Button type="button" variant="secondary">
            Download JSON pack
          </Button>
        </a>
        <a href={mdUrl}>
          <Button type="button" variant="ghost" className="!text-xs">
            Download SKILL.md
          </Button>
        </a>
        <Button
          type="button"
          variant="ghost"
          className="!text-xs"
          onClick={() => copy(cmd, "cmd")}
        >
          {copied === "cmd" ? "Copied" : "Copy install command"}
        </Button>
      </div>

      <div className="space-y-1">
        <p className="text-[11px] font-medium uppercase tracking-wide text-stone-500">
          One-line install (repo root)
        </p>
        <pre className="overflow-x-auto rounded-lg border border-white/10 bg-black/50 px-3 py-2 font-mono text-[11px] text-emerald-400/90">
          {cmd}
        </pre>
        <p className="text-[11px] text-stone-600">
          Requires{" "}
          <code className="text-stone-500">scripts/install-skill-pack.mjs</code>{" "}
          from the GrokForge repo (or any machine that can fetch the public API).
        </p>
      </div>

      <details className="text-xs text-stone-500">
        <summary className="cursor-pointer text-stone-400 hover:text-stone-300">
          Advanced: raw API URL
        </summary>
        <p className="mt-2 break-all font-mono text-[10px] text-stone-600">
          {skillPackApiUrl}
        </p>
        <button
          type="button"
          className="mt-1 text-amber-400 hover:underline"
          onClick={() => copy(skillPackApiUrl, "url")}
        >
          {copied === "url" ? "Copied" : "Copy API URL"}
        </button>
      </details>
    </Card>
  );
}
