"use client";

import Link from "next/link";
import { Badge, Card } from "@/components/ui";
import {
  CreatorModerationBar,
  ReviewForm,
} from "@/components/task-actions";

export type ReviewQueueItem = {
  id: string;
  taskTitle: string;
  projectSlug: string;
  projectTitle: string;
  authorHandle: string | null;
  createdAt: string;
  /** ISO timestamp for age badges */
  createdAtIso?: string;
  agent: boolean;
  bodyPreview: string;
  peerReviewCount: number;
  /** Viewer can creator-accept this item */
  canCreatorModerate?: boolean;
  /** Submission is by the signed-in viewer (no self peer-review) */
  isOwn?: boolean;
  /** Show peer review form */
  canPeerReview?: boolean;
};

function ageLabel(iso?: string): { text: string; stale: boolean } | null {
  if (!iso) return null;
  const ms = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(ms) || ms < 0) return null;
  const hours = Math.floor(ms / (60 * 60 * 1000));
  if (hours < 1) return { text: "<1h", stale: false };
  if (hours < 24) return { text: `${hours}h`, stale: hours >= 12 };
  const days = Math.floor(hours / 24);
  return { text: `${days}d`, stale: true };
}

/** Network-wide pending review list with one-tap peer review. */
export function ReviewQueueList({
  items,
  signedIn,
}: {
  items: ReviewQueueItem[];
  signedIn: boolean;
}) {
  if (items.length === 0) {
    return (
      <Card>
        <p className="text-sm text-stone-400">
          No pending submissions need review right now. Claim a leaf or check back
          after agents submit. Empty queue = ready-set + workers unblocked.
        </p>
      </Card>
    );
  }

  return (
    <ul className="space-y-3">
      {items.map((item) => {
        const age = ageLabel(item.createdAtIso);
        return (
          <li key={item.id}>
            <Card
              className={`space-y-3 ${
                age?.stale ? "border-amber-500/30 bg-amber-500/5" : ""
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap gap-1.5">
                    {item.isOwn && (
                      <Badge className="border-violet-500/40 bg-violet-500/10 text-violet-100">
                        yours
                      </Badge>
                    )}
                    {item.agent && (
                      <Badge className="border-sky-500/40 bg-sky-500/10 text-sky-100">
                        agent
                      </Badge>
                    )}
                    {age && (
                      <Badge
                        className={
                          age.stale
                            ? "border-rose-500/40 bg-rose-500/10 text-rose-100"
                            : "border-white/10 bg-white/5 text-stone-400"
                        }
                      >
                        age {age.text}
                        {age.stale ? " · unblock ready-set" : ""}
                      </Badge>
                    )}
                    <Badge className="border-white/10 bg-white/5 text-stone-400">
                      {item.peerReviewCount} peer review
                      {item.peerReviewCount === 1 ? "" : "s"}
                    </Badge>
                  </div>
                  <h2 className="mt-2 text-lg font-semibold text-white">
                    <Link
                      href={`/c/${item.id}`}
                      className="hover:text-amber-200"
                    >
                      {item.taskTitle}
                    </Link>
                  </h2>
                  <p className="mt-1 text-xs text-stone-500">
                    <Link
                      href={`/projects/${item.projectSlug}`}
                      className="text-amber-400/90 hover:underline"
                    >
                      {item.projectTitle}
                    </Link>
                    {item.authorHandle ? ` · @${item.authorHandle}` : ""} ·{" "}
                    {item.createdAt}
                  </p>
                </div>
                <Link
                  href={`/c/${item.id}`}
                  className="text-xs text-amber-300 hover:underline"
                >
                  Full receipt
                </Link>
              </div>
              <pre className="max-h-28 overflow-auto rounded-lg border border-white/10 bg-black/40 p-2 text-[11px] text-stone-400 whitespace-pre-wrap">
                {item.bodyPreview}
              </pre>
              {signedIn ? (
                <div className="space-y-3 border-t border-white/10 pt-3">
                  {item.canPeerReview !== false && !item.isOwn ? (
                    <>
                      <p className="text-[11px] text-stone-500">
                        One-tap scores · average ≥3 accepts · +2 rep per review ·
                        accepts unlock ready-set for workers
                      </p>
                      <ReviewForm contributionId={item.id} />
                    </>
                  ) : item.isOwn ? (
                    <p className="text-xs text-stone-400">
                      This is your submission - you cannot peer-review it.
                      {item.canCreatorModerate
                        ? " As project creator you can accept or request changes below (or invite a second builder)."
                        : " Waiting for a peer reviewer or the project creator."}
                    </p>
                  ) : null}
                  {item.canCreatorModerate && (
                    <CreatorModerationBar contributionId={item.id} />
                  )}
                </div>
              ) : (
                <p className="text-xs text-stone-500">
                  <Link href="/login" className="text-amber-400 hover:underline">
                    Sign in with X
                  </Link>{" "}
                  to peer-review.
                </p>
              )}
            </Card>
          </li>
        );
      })}
    </ul>
  );
}
