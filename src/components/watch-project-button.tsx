"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  unwatchProjectAction,
  watchProjectAction,
} from "@/lib/actions";

export function WatchProjectButton({
  projectId,
  initiallyWatching,
  signedIn,
}: {
  projectId: string;
  initiallyWatching: boolean;
  signedIn: boolean;
}) {
  const [watching, setWatching] = useState(initiallyWatching);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (!signedIn) {
    return (
      <Link
        href="/login"
        className="inline-flex items-center rounded-full border border-amber-900/50 bg-white/5 px-3 py-1.5 text-xs font-semibold text-amber-200 hover:border-amber-500/40"
      >
        Sign in to watch
      </Link>
    );
  }

  return (
    <div className="inline-flex flex-col items-start gap-1">
      <button
        type="button"
        disabled={pending}
        title={
          watching
            ? "Stop notifications for this project"
            : "Get notified when work ships or capital lands"
        }
        className={
          watching
            ? "inline-flex items-center rounded-full border border-amber-500/50 bg-amber-500/15 px-3 py-1.5 text-xs font-semibold text-amber-200 hover:bg-amber-500/25 disabled:opacity-60"
            : "inline-flex items-center rounded-full border border-amber-900/50 bg-white/5 px-3 py-1.5 text-xs font-semibold text-stone-200 hover:border-amber-500/40 disabled:opacity-60"
        }
        onClick={() =>
          start(async () => {
            setError(null);
            const res = watching
              ? await unwatchProjectAction(projectId)
              : await watchProjectAction(projectId);
            if (res.error) {
              setError(res.error);
              return;
            }
            setWatching(!!res.watching);
          })
        }
      >
        {pending ? "..." : watching ? "Watching" : "Watch project"}
      </button>
      {!watching && (
        <span className="max-w-[12rem] text-[10px] leading-snug text-stone-600">
          Notify on ship &amp; capital
        </span>
      )}
      {error && <span className="text-[11px] text-red-400">{error}</span>}
    </div>
  );
}
