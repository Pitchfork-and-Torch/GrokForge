"use client";

import { useState } from "react";

export function CopyLinkButton({
  url,
  label = "Copy link",
}: {
  url: string;
  label?: string;
}) {
  const [done, setDone] = useState(false);

  return (
    <button
      type="button"
      className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-stone-200 hover:border-amber-500/40"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(url);
          setDone(true);
          setTimeout(() => setDone(false), 2000);
        } catch {
          // fallback
          window.prompt("Copy this URL", url);
        }
      }}
    >
      {done ? "Copied" : label}
    </button>
  );
}
