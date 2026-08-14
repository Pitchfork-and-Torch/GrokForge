"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { linkArtifactAction } from "@/lib/actions";
import { Button, Input, Label } from "@/components/ui";

export function LinkArtifactForm({
  projectId,
  defaultLicense = "MIT",
}: {
  projectId: string;
  defaultLicense?: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [pending, start] = useTransition();

  return (
    <form
      className="mt-3 space-y-2 rounded-xl border border-white/10 bg-black/30 p-3"
      onSubmit={(e) => {
        e.preventDefault();
        const form = e.currentTarget;
        const fd = new FormData(form);
        start(async () => {
          setError(null);
          setOk(false);
          const res = await linkArtifactAction(fd);
          if (res && "error" in res) setError(res.error ?? "Link failed");
          else {
            setOk(true);
            try {
              form.reset();
            } catch {
              /* ignore */
            }
            router.refresh();
          }
        });
      }}
    >
      <input type="hidden" name="projectId" value={projectId} />
      <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-400">
        Link artifact
      </p>
      <p className="text-[11px] text-stone-500">
        Paste a GitHub repo, PR, commit, or any public URL. Open license by default.
      </p>
      <div>
        <Label>URL (GitHub preferred)</Label>
        <Input
          name="url"
          required
          placeholder="https://github.com/org/repo or /pull/12"
          className="mt-1"
        />
      </div>
      <div>
        <Label>Title (optional)</Label>
        <Input name="title" placeholder="Auto from GitHub if blank" className="mt-1" />
      </div>
      <div>
        <Label>License</Label>
        <Input name="license" defaultValue={defaultLicense} className="mt-1" />
      </div>
      <Button type="submit" disabled={pending} className="!text-xs">
        {pending ? "Linking..." : "Link artifact"}
      </Button>
      {error && <p className="text-xs text-rose-400">{error}</p>}
      {ok && <p className="text-xs text-emerald-400">Artifact linked on the public project.</p>}
    </form>
  );
}
