"use client";

import Link from "next/link";
import { Badge, Card } from "@/components/ui";
import { ReviewForm } from "@/components/task-actions";

export type ReviewQueueItem = {
  id: string;
  taskTitle: string;
  projectSlug: string;
  projectTitle: string;
  authorHandle: string | null;
  createdAt: string;
  agent: boolean;
  bodyPreview: string;
  peerReviewCount: number;
};

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
          after agents submit.
        </p>
      </Card>
    );
  }

  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item.id}>
          <Card className="space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap gap-1.5">
                  {item.agent && (
                    <Badge className="border-sky-500/40 bg-sky-500/10 text-sky-100">
                      agent
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
              <div className="border-t border-white/10 pt-3">
                <p className="mb-2 text-[11px] text-stone-500">
                  Score 1-5 · average ≥3 accepts · you earn +2 rep for each review
                </p>
                <ReviewForm contributionId={item.id} />
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
      ))}
    </ul>
  );
}
