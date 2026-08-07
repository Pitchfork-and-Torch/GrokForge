"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  generateProjectBannerAction,
  clearProjectBannerAction,
} from "@/lib/actions";
import { Button } from "@/components/ui";

/** Display a project banner (hero). */
export function ProjectBannerHero({
  url,
  title,
}: {
  url: string | null | undefined;
  title: string;
}) {
  if (!url) return null;
  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/50 shadow-[0_0_40px_rgba(245,158,11,0.08)]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt={`Banner for ${title}`}
        className="aspect-[16/9] w-full object-cover sm:aspect-[2.4/1]"
      />
    </div>
  );
}

/** Card strip for discover / featured lists. */
export function ProjectBannerThumb({
  url,
  title,
}: {
  url: string | null | undefined;
  title: string;
}) {
  if (!url) return null;
  return (
    <div className="-mx-1 mb-3 overflow-hidden rounded-xl border border-white/10 sm:-mx-0">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt=""
        aria-hidden
        title={title}
        className="aspect-[16/9] w-full object-cover"
      />
    </div>
  );
}

/**
 * After create with auto-Imagine: generate once, then refresh.
 * Safe no-op if banner already present or user not creator.
 */
export function BannerAutoGenerate({
  projectId,
  enabled,
  hasBanner,
}: {
  projectId: string;
  enabled: boolean;
  hasBanner: boolean;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "working" | "done" | "error">(
    "idle"
  );
  const [error, setError] = useState<string | null>(null);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    if (!enabled || hasBanner || started) return;
    setStarted(true);
    setStatus("working");
    void (async () => {
      const res = await generateProjectBannerAction(projectId);
      if (res?.error) {
        setError(res.error);
        setStatus("error");
        return;
      }
      setStatus("done");
      router.refresh();
      // Drop query param without full navigation noise
      try {
        const u = new URL(window.location.href);
        u.searchParams.delete("banner");
        window.history.replaceState({}, "", u.pathname + u.search);
      } catch {
        /* ignore */
      }
    })();
  }, [enabled, hasBanner, projectId, router, started]);

  if (!enabled || hasBanner) return null;
  if (status === "idle" || status === "done") return null;

  return (
    <div
      className={`rounded-xl border px-3 py-2 text-xs ${
        status === "error"
          ? "border-rose-500/30 bg-rose-500/10 text-rose-200"
          : "border-amber-500/30 bg-amber-500/10 text-amber-100"
      }`}
      role="status"
    >
      {status === "working" && "Grok Imagine is painting your project banner..."}
      {status === "error" && (error || "Banner generation failed.")}
    </div>
  );
}

/** Creator controls: regenerate with Imagine / clear. */
export function BannerCreatorControls({
  projectId,
  hasBanner,
}: {
  projectId: string;
  hasBanner: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        type="button"
        variant="secondary"
        disabled={pending}
        className="!text-xs"
        onClick={() =>
          start(async () => {
            setError(null);
            const res = await generateProjectBannerAction(projectId);
            if (res?.error) setError(res.error);
            else router.refresh();
          })
        }
      >
        {pending
          ? "Generating..."
          : hasBanner
            ? "Regenerate banner (Grok)"
            : "Generate banner (Grok)"}
      </Button>
      {hasBanner && (
        <Button
          type="button"
          variant="ghost"
          disabled={pending}
          className="!text-xs"
          onClick={() =>
            start(async () => {
              setError(null);
              const res = await clearProjectBannerAction(projectId);
              if (res?.error) setError(res.error);
              else router.refresh();
            })
          }
        >
          Remove banner
        </Button>
      )}
      {error && <span className="text-[11px] text-rose-400">{error}</span>}
    </div>
  );
}
