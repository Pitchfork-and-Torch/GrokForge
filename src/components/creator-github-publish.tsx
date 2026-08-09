"use client";

import { useState, useTransition } from "react";
import { linkArtifactAction } from "@/lib/actions";
import { Button, Input, Label } from "@/components/ui";

/**
 * Phase 2 creator self-serve: link a GitHub repo they pushed manually
 * (ZIP + GITHUB.md path). Auto-push still founder/admin only.
 */
export function CreatorGitHubPublish({
  projectId,
  slug,
  existingUrl,
  isCreator,
}: {
  projectId: string;
  slug: string;
  existingUrl?: string | null;
  isCreator: boolean;
}) {
  const [url, setUrl] = useState(existingUrl || "");
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [pending, start] = useTransition();

  if (!isCreator) return null;

  return (
    <div className="rounded-xl border border-white/10 bg-black/30 p-4 space-y-3">
      <h3 className="text-sm font-semibold text-white">Creator: publish to your GitHub</h3>
      <ol className="list-decimal space-y-1 pl-5 text-xs text-stone-400">
        <li>
          Download the GitHub-ready ZIP from this ship page (includes README,
          CONTRIBUTORS, NOTICE, GITHUB.md).
        </li>
        <li>
          Create a public repo under your account, push the unzipped tree (see
          GITHUB.md).
        </li>
        <li>
          Set the repo homepage to{" "}
          <code className="text-stone-500">
            https://grokforge.app/projects/{slug}/ship
          </code>
          , add topics <code className="text-stone-500">grokforge</code> and{" "}
          <code className="text-stone-500">forged-on-grokforge</code>.
        </li>
        <li>Paste the repo URL below so the ship page and gallery show Open on GitHub.</li>
      </ol>
      {existingUrl ? (
        <a
          href={existingUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block text-sm font-semibold text-emerald-300 hover:underline"
        >
          {existingUrl}
        </a>
      ) : null}
      <div>
        <Label htmlFor="ghUrl">GitHub repo URL</Label>
        <Input
          id="ghUrl"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://github.com/you/your-sealed-kit"
          className="mt-1"
        />
      </div>
      {error && <p className="text-sm text-rose-400">{error}</p>}
      {ok && (
        <p className="text-sm text-emerald-300">Linked. Credits stay in the package.</p>
      )}
      <Button
        type="button"
        variant="secondary"
        disabled={pending || !url.trim()}
        onClick={() => {
          setError(null);
          setOk(false);
          const fd = new FormData();
          fd.set("projectId", projectId);
          fd.set("url", url.trim());
          fd.set("title", "Published on GitHub");
          fd.set("license", "MIT");
          start(async () => {
            const res = await linkArtifactAction(fd);
            if (res?.error) setError(res.error);
            else setOk(true);
          });
        }}
      >
        {pending ? "Linking…" : existingUrl ? "Update GitHub link" : "Link GitHub repo"}
      </Button>
    </div>
  );
}
