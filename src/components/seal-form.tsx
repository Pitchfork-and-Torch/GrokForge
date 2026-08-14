"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { sealProjectAction } from "@/lib/actions";
import { Button, Input, Label } from "@/components/ui";
import { fireForgeCelebrate } from "@/components/forge-celebrate";

export function SealForm({
  projectId,
  slug,
  defaultTitle,
  defaultVersion = "v1.0.0",
  defaultNote = "",
  previewPaths,
}: {
  projectId: string;
  slug: string;
  defaultTitle: string;
  defaultVersion?: string;
  defaultNote?: string;
  previewPaths: string[];
}) {
  const router = useRouter();
  const [sealNote, setSealNote] = useState(defaultNote);
  const [version, setVersion] = useState(defaultVersion);
  const [packageTitle, setPackageTitle] = useState(defaultTitle);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const noteOk = sealNote.trim().length >= 20;

  const treePreview = useMemo(() => previewPaths.slice(0, 40), [previewPaths]);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const fd = new FormData();
    fd.set("projectId", projectId);
    fd.set("sealNote", sealNote);
    fd.set("version", version);
    fd.set("packageTitle", packageTitle);
    start(async () => {
      const res = await sealProjectAction(fd);
      if (res?.error) {
        setError(res.error);
        return;
      }
      try {
        fireForgeCelebrate("accept");
      } catch {
        /* ok */
      }
      if (res?.shipPath) {
        router.push(res.shipPath);
        router.refresh();
      } else {
        router.push(`/projects/${slug}/ship`);
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div>
        <Label htmlFor="packageTitle">Package title (optional)</Label>
        <Input
          id="packageTitle"
          value={packageTitle}
          onChange={(e) => setPackageTitle(e.target.value)}
          maxLength={160}
          className="mt-1"
        />
      </div>
      <div>
        <Label htmlFor="version">Version tag</Label>
        <Input
          id="version"
          value={version}
          onChange={(e) => setVersion(e.target.value)}
          placeholder="v1.0.0"
          maxLength={32}
          className="mt-1"
        />
        <p className="mt-1 text-[11px] text-stone-600">Default v1.0.0. Re-seals create a new primary package version.</p>
      </div>
      <div>
        <Label htmlFor="sealNote">Seal note / impact statement (required)</Label>
        <textarea
          id="sealNote"
          value={sealNote}
          onChange={(e) => setSealNote(e.target.value)}
          rows={8}
          required
          minLength={20}
          maxLength={8000}
          placeholder="What does this sealed kit unlock for the world? Markdown ok."
          className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-stone-100 placeholder:text-stone-600 focus:border-amber-500/40 focus:outline-none"
        />
        <p className="mt-1 text-[11px] text-stone-600">
          {sealNote.trim().length}/8000 · min 20 characters
          {!noteOk && sealNote.trim().length > 0 ? " (keep going)" : ""}
        </p>
      </div>

      <div className="rounded-xl border border-white/10 bg-black/30 p-3">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-stone-500">
          Package preview
        </p>
        <ul className="mt-2 max-h-48 overflow-auto font-mono text-[11px] leading-relaxed text-stone-400">
          {treePreview.map((p) => (
            <li key={p}>{p}</li>
          ))}
          {previewPaths.length > 40 && (
            <li className="text-stone-600">… +{previewPaths.length - 40} more</li>
          )}
        </ul>
      </div>

      {error && <p className="text-sm text-rose-400">{error}</p>}

      <Button
        type="submit"
        disabled={pending || !noteOk}
        className="!w-full !bg-amber-400 !py-3 !text-base !font-black !text-black shadow-[0_0_32px_rgba(245,158,11,0.4)] hover:!bg-amber-300 disabled:opacity-50 sm:!w-auto sm:!px-8"
      >
        {pending ? "Striking the anvil…" : "Confirm Seal / Strike the Anvil"}
      </Button>
    </form>
  );
}
