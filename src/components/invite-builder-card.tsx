"use client";

import { useState } from "react";
import { Button, Card } from "@/components/ui";
import { secondBuilderInviteIntent } from "@/components/share-project-button";

/**
 * Second-builder onboarding + invite/share (Network Gravity).
 * Copy invite link or open X intent for a co-builder.
 */
export function InviteBuilderCard({
  title,
  slug,
  siteUrl = "https://grokforge.app",
  proposerHandle,
  pendingReviews = 0,
  openLeaves = 0,
  compact = false,
}: {
  title: string;
  slug: string;
  siteUrl?: string;
  proposerHandle?: string | null;
  pendingReviews?: number;
  openLeaves?: number;
  compact?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const base = siteUrl.replace(/\/$/, "");
  const inviteUrl = `${base}/projects/${slug}?invite=1`;
  const intent = secondBuilderInviteIntent({
    title,
    slug,
    siteUrl: base,
    proposerHandle,
    pendingReviews,
    openLeaves,
  });

  function copy() {
    void navigator.clipboard?.writeText(inviteUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  if (compact) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="secondary" onClick={copy}>
          {copied ? "Invite link copied" : "Copy invite link"}
        </Button>
        <a href={intent} target="_blank" rel="noopener noreferrer">
          <Button type="button" variant="ghost" className="!text-xs">
            Invite on X
          </Button>
        </a>
      </div>
    );
  }

  return (
    <Card className="space-y-3 border-violet-500/25 bg-violet-500/5">
      <div>
        <h3 className="text-sm font-semibold text-violet-100">
          Invite a second builder
        </h3>
        <p className="mt-1 text-xs text-stone-400">
          Solo forges stall on review. Share this invite so a co-builder can
          claim ready leaves, peer-review, or clear dual-key gates.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="secondary" onClick={copy}>
          {copied ? "Copied" : "Copy invite link"}
        </Button>
        <a href={intent} target="_blank" rel="noopener noreferrer">
          <Button type="button">Invite on X</Button>
        </a>
        <a href={`/tasks?review=1`}>
          <Button type="button" variant="ghost" className="!text-xs">
            Help review network
          </Button>
        </a>
      </div>
      <pre className="overflow-x-auto rounded-lg border border-white/10 bg-black/50 px-3 py-2 font-mono text-[11px] text-stone-400">
        {inviteUrl}
      </pre>
    </Card>
  );
}

/** Banner when landing via ?invite=1 */
export function InviteLandingBanner({
  title,
  signedIn,
}: {
  title: string;
  signedIn: boolean;
}) {
  return (
    <div
      className="rounded-2xl border border-violet-500/40 bg-violet-500/10 p-4"
      role="status"
    >
      <p className="text-[10px] font-semibold uppercase tracking-widest text-violet-200">
        You are invited
      </p>
      <h2 className="mt-1 text-lg font-semibold text-white">
        Join as a second builder on {title}
      </h2>
      <p className="mt-1 text-sm text-stone-400">
        Claim a ready leaf, peer-review a pending submit, or watch the project.
        Your X handle becomes the public ledger identity.
      </p>
      <div className="mt-3 flex flex-wrap gap-2 text-xs">
        {!signedIn && (
          <a
            href="/login"
            className="rounded-full bg-violet-400 px-3.5 py-1.5 font-bold text-black"
          >
            Sign in with X
          </a>
        )}
        <a
          href="/tasks?ready=1"
          className="rounded-full border border-white/15 px-3.5 py-1.5 font-semibold text-stone-200"
        >
          Ready leaves
        </a>
        <a
          href="/tasks?review=1"
          className="rounded-full border border-white/15 px-3.5 py-1.5 font-semibold text-stone-200"
        >
          Review queue
        </a>
      </div>
    </div>
  );
}
