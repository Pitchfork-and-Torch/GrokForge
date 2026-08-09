"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { publishToGitHubAction } from "@/lib/actions";
import { Button } from "@/components/ui";

export function PublishGitHubButton({
  projectId,
  defaultRepoName,
  existingUrl,
  configured,
  canPublish,
}: {
  projectId: string;
  defaultRepoName: string;
  existingUrl?: string | null;
  configured: boolean;
  canPublish: boolean;
}) {
  const router = useRouter();
  const [repoName, setRepoName] = useState(defaultRepoName);
  const [error, setError] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(existingUrl || null);
  const [pending, start] = useTransition();

  if (!canPublish) {
    return (
      <div className="rounded-xl border border-white/10 bg-black/30 p-4 space-y-2">
        <h3 className="text-sm font-semibold text-white">Ship to GitHub</h3>
        <p className="text-xs text-stone-500">
          Founder/admin can publish this sealed package to the GrokForge org with
          full credits. Anyone can download the GitHub-ready ZIP and push manually
          (see GITHUB.md inside the archive).
        </p>
        {existingUrl ? (
          <a
            href={existingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex text-sm font-semibold text-amber-300 hover:underline"
          >
            Open published repo →
          </a>
        ) : null}
      </div>
    );
  }

  if (!configured) {
    return (
      <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 space-y-2">
        <h3 className="text-sm font-semibold text-amber-100">Ship to GitHub</h3>
        <p className="text-xs text-stone-400">
          Server token not configured. Set{" "}
          <code className="text-amber-200/90">GITHUB_PUBLISH_TOKEN</code> and{" "}
          <code className="text-amber-200/90">GITHUB_PUBLISH_ORG</code> on Vercel,
          then re-deploy. Until then, use Download ZIP + GITHUB.md for manual push.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/5 p-4 space-y-3">
      <div>
        <h3 className="text-sm font-semibold text-emerald-100">Ship to GitHub</h3>
        <p className="mt-1 text-xs text-stone-400">
          Creates or updates a public org repo with README, CONTRIBUTORS, NOTICE,
          topics, and homepage pointing at this ship page.
        </p>
      </div>
      <label className="block text-xs text-stone-500">
        Repo name
        <input
          value={repoName}
          onChange={(e) => setRepoName(e.target.value)}
          maxLength={100}
          className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 font-mono text-sm text-stone-100 focus:border-emerald-500/40 focus:outline-none"
        />
      </label>
      {error && <p className="text-sm text-rose-400">{error}</p>}
      {resultUrl && (
        <a
          href={resultUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block text-sm font-semibold text-emerald-300 hover:underline"
        >
          {resultUrl}
        </a>
      )}
      <Button
        type="button"
        disabled={pending || !repoName.trim()}
        className="!bg-emerald-500 !font-bold !text-black hover:!bg-emerald-400 disabled:opacity-50"
        onClick={() => {
          setError(null);
          const fd = new FormData();
          fd.set("projectId", projectId);
          fd.set("repoName", repoName.trim());
          start(async () => {
            const res = await publishToGitHubAction(fd);
            if (res?.error) {
              setError(res.error);
              return;
            }
            if (res?.htmlUrl) {
              setResultUrl(res.htmlUrl);
              router.refresh();
            }
          });
        }}
      >
        {pending
          ? "Publishing…"
          : resultUrl
            ? "Re-publish / update on GitHub"
            : "Publish to GitHub"}
      </Button>
    </div>
  );
}
