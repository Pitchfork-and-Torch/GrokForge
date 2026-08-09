"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  generateProjectBannerAction,
  clearProjectBannerAction,
  uploadProjectBannerAction,
} from "@/lib/actions";
import { Button } from "@/components/ui";

const UPLOAD_MAX_EDGE = 1600;
const UPLOAD_JPEG_QUALITY = 0.84;
const UPLOAD_MAX_BYTES = 900_000;

async function compressForUpload(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) return file;
  if (typeof createImageBitmap === "undefined") return file;

  const bitmap = await createImageBitmap(file);
  try {
    let { width, height } = bitmap;
    if (width <= UPLOAD_MAX_EDGE && height <= UPLOAD_MAX_EDGE && file.size <= UPLOAD_MAX_BYTES) {
      return file;
    }
    const scale = Math.min(1, UPLOAD_MAX_EDGE / Math.max(width, height));
    width = Math.max(1, Math.round(width * scale));
    height = Math.max(1, Math.round(height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", UPLOAD_JPEG_QUALITY)
    );
    if (!blob) return file;
    return new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", {
      type: "image/jpeg",
      lastModified: Date.now(),
    });
  } finally {
    bitmap.close();
  }
}

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

/** Creator controls: custom upload / regenerate with Imagine / clear. */
export function BannerCreatorControls({
  projectId,
  hasBanner,
}: {
  projectId: string;
  hasBanner: boolean;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [busy, setBusy] = useState<"upload" | "imagine" | "clear" | null>(null);
  const [pending, start] = useTransition();

  async function onUploadPick(list: FileList | null) {
    setError(null);
    setHint(null);
    const raw = list?.[0];
    if (!raw) return;
    if (!raw.type.startsWith("image/")) {
      setError("Choose a JPEG, PNG, or WebP image.");
      if (fileRef.current) fileRef.current.value = "";
      return;
    }

    start(async () => {
      setBusy("upload");
      try {
        const compressed = await compressForUpload(raw);
        if (compressed.size > UPLOAD_MAX_BYTES) {
          setError(
            `Still over ${Math.round(UPLOAD_MAX_BYTES / 1024)}KB after resize. Try a smaller crop.`
          );
          return;
        }
        const fd = new FormData();
        fd.set("projectId", projectId);
        fd.set("banner", compressed);
        const res = await uploadProjectBannerAction(fd);
        if (res?.error) setError(res.error);
        else {
          setHint("Custom banner saved.");
          router.refresh();
        }
      } catch {
        setError("Could not read that image.");
      } finally {
        setBusy(null);
        if (fileRef.current) fileRef.current.value = "";
      }
    });
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/*"
          className="sr-only"
          onChange={(e) => {
            void onUploadPick(e.target.files);
          }}
        />
        <Button
          type="button"
          variant="secondary"
          disabled={pending}
          className="!text-xs"
          onClick={() => fileRef.current?.click()}
        >
          {busy === "upload"
            ? "Uploading..."
            : hasBanner
              ? "Replace with upload"
              : "Upload custom image"}
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={pending}
          className="!text-xs"
          onClick={() =>
            start(async () => {
              setError(null);
              setHint(null);
              setBusy("imagine");
              try {
                const res = await generateProjectBannerAction(projectId);
                if (res?.error) setError(res.error);
                else router.refresh();
              } finally {
                setBusy(null);
              }
            })
          }
        >
          {busy === "imagine"
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
                setHint(null);
                setBusy("clear");
                try {
                  const res = await clearProjectBannerAction(projectId);
                  if (res?.error) setError(res.error);
                  else router.refresh();
                } finally {
                  setBusy(null);
                }
              })
            }
          >
            {busy === "clear" ? "Removing..." : "Remove banner"}
          </Button>
        )}
      </div>
      <p className="text-[11px] text-stone-500">
        Custom image: JPEG / PNG / WebP, wide 16:9 works best (auto-resized, max ~
        {Math.round(UPLOAD_MAX_BYTES / 1024)}KB).
      </p>
      {hint && <span className="text-[11px] text-emerald-400">{hint}</span>}
      {error && <span className="text-[11px] text-rose-400">{error}</span>}
    </div>
  );
}
