"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Label } from "@/components/ui";

const MAX_EDGE = 1600;
const JPEG_QUALITY = 0.84;
const MAX_BYTES = 900_000;

async function compressImage(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) return file;
  if (typeof createImageBitmap === "undefined") return file;

  const bitmap = await createImageBitmap(file);
  try {
    let { width, height } = bitmap;
    if (width <= MAX_EDGE && height <= MAX_EDGE && file.size <= MAX_BYTES) {
      return file;
    }
    const scale = Math.min(1, MAX_EDGE / Math.max(width, height));
    width = Math.max(1, Math.round(width * scale));
    height = Math.max(1, Math.round(height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY)
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

/**
 * Banner picker for create/edit forms.
 * - Optional file (JPEG/PNG/WebP, client-compressed)
 * - Auto-Imagine checkbox (create only)
 * - Clear existing (edit)
 */
export function ProjectBannerField({
  mode,
  existingUrl,
  defaultAutoImagine = true,
}: {
  mode: "create" | "edit";
  existingUrl?: string | null;
  defaultAutoImagine?: boolean;
}) {
  const inputId = useId();
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(existingUrl || null);
  const [hasFile, setHasFile] = useState(false);
  const [autoImagine, setAutoImagine] = useState(defaultAutoImagine);
  const [clearExisting, setClearExisting] = useState(false);
  const [hint, setHint] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (preview && preview.startsWith("blob:")) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  async function onPick(list: FileList | null) {
    setHint(null);
    const raw = list?.[0];
    if (!raw) {
      setHasFile(false);
      if (preview?.startsWith("blob:")) URL.revokeObjectURL(preview);
      setPreview(clearExisting ? null : existingUrl || null);
      return;
    }
    if (!raw.type.startsWith("image/")) {
      setHint("Choose a JPEG, PNG, or WebP image.");
      if (fileRef.current) fileRef.current.value = "";
      return;
    }
    try {
      const compressed = await compressImage(raw);
      if (compressed.size > MAX_BYTES) {
        setHint(
          `Still over ${Math.round(MAX_BYTES / 1024)}KB after resize. Try a smaller crop.`
        );
        if (fileRef.current) fileRef.current.value = "";
        return;
      }
      if (fileRef.current) {
        const dt = new DataTransfer();
        dt.items.add(compressed);
        fileRef.current.files = dt.files;
      }
      if (preview?.startsWith("blob:")) URL.revokeObjectURL(preview);
      setPreview(URL.createObjectURL(compressed));
      setHasFile(true);
      setClearExisting(false);
      setAutoImagine(false);
    } catch {
      setHint("Could not read that image.");
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="space-y-3">
      <div>
        <Label htmlFor={inputId}>Custom project image (optional)</Label>
        <p className="mt-1 text-xs text-stone-500">
          Upload your own wide banner (16:9 works best). JPEG / PNG / WebP, max ~
          {Math.round(MAX_BYTES / 1024)}KB after auto-resize. Replaces any auto-generated art.
        </p>
      </div>

      {preview && !clearExisting && (
        <div className="gf-banner-stage">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview}
            alt="Banner preview"
            className="gf-project-thumb-img"
          />
        </div>
      )}

      <input
        ref={fileRef}
        id={inputId}
        name="banner"
        type="file"
        accept="image/jpeg,image/png,image/webp,image/*"
        className="block w-full text-sm text-stone-400 file:mr-3 file:rounded-full file:border-0 file:bg-amber-500/15 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-amber-100 hover:file:bg-amber-500/25"
        onChange={(e) => {
          void onPick(e.target.files);
        }}
      />

      {mode === "create" && !hasFile && (
        <label className="flex cursor-pointer items-start gap-2 text-sm text-stone-300">
          <input
            type="checkbox"
            name="autoImagineBanner"
            value="1"
            checked={autoImagine}
            onChange={(e) => setAutoImagine(e.target.checked)}
            className="mt-1 rounded border-white/20 bg-black/40 text-amber-500"
          />
          <span>
            <span className="font-medium text-stone-200">
              Auto-generate with Grok Imagine
            </span>
            <span className="mt-0.5 block text-xs text-stone-500">
              Uses platform xAI key after publish (no cost to you). You can replace
              or regenerate later.
            </span>
          </span>
        </label>
      )}

      {mode === "edit" && existingUrl && (
        <label className="flex cursor-pointer items-center gap-2 text-sm text-stone-300">
          <input
            type="checkbox"
            name="clearBanner"
            value="1"
            checked={clearExisting}
            onChange={(e) => {
              setClearExisting(e.target.checked);
              if (e.target.checked) {
                setHasFile(false);
                if (fileRef.current) fileRef.current.value = "";
                if (preview?.startsWith("blob:")) URL.revokeObjectURL(preview);
                setPreview(null);
              } else {
                setPreview(existingUrl);
              }
            }}
            className="rounded border-white/20 bg-black/40 text-amber-500"
          />
          Remove current banner
        </label>
      )}

      {hint && <p className="text-xs text-rose-400">{hint}</p>}
    </div>
  );
}
