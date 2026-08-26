"use client";

import Link from "next/link";
import { useState } from "react";
import {
  CreatorAcceptButton,
  CreatorBulkAcceptButton,
} from "@/components/task-actions";
import { Badge, Button, Card } from "@/components/ui";

export type QueueItem = {
  id: string;
  taskId: string;
  taskTitle: string;
  handle: string | null;
  createdAt: string;
  peerReviewCount: number;
  peerAvgScore: number | null;
  estimatedTokens: number;
  disputed: boolean;
};

/**
 * Dual-verification queue: peer reviews (Forger+) + creator accept.
 * Soft gate: warn when accepting without peer review on large leaves.
 */
export function DualVerifyQueue({
  projectId,
  projectSlug,
  items,
  requireDualKey = false,
  dualKeyTokenThreshold = 50000,
}: {
  projectId: string;
  projectSlug: string;
  items: QueueItem[];
  requireDualKey?: boolean;
  dualKeyTokenThreshold?: number;
}) {
  const [hideSoftOnly, setHideSoftOnly] = useState(false);
  const shown = hideSoftOnly
    ? items.filter((i) => i.peerReviewCount > 0 || i.disputed)
    : items;

  if (items.length === 0) {
    return (
      <Card className="border-white/10">
        <h3 className="text-sm font-semibold text-white">Dual-verify queue</h3>
        <p className="mt-1 text-xs text-stone-500">
          No pending submissions. Peer reviews (Forger 100+ rep) + your accept =
          dual verification.
        </p>
      </Card>
    );
  }

  return (
    <Card className="space-y-3 border-amber-900/40 bg-amber-500/5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-amber-100">
            Dual-verify queue
          </h3>
          <p className="mt-1 text-xs text-stone-400">
            {items.length} pending.{" "}
            {requireDualKey
              ? `Hard dual-key ON (≥${dualKeyTokenThreshold.toLocaleString()} tok needs peer review).`
              : "Prefer accept after ≥1 peer review on large leaves."}{" "}
            Disputes stay visible until resolved.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="secondary"
            className="text-xs"
            onClick={() => setHideSoftOnly((v) => !v)}
          >
            {hideSoftOnly ? "Show all" : "Peer-reviewed only"}
          </Button>
          <CreatorBulkAcceptButton projectId={projectId} count={items.length} />
        </div>
      </div>

      <ul className="space-y-2">
        {shown.map((item) => {
          const large = item.estimatedTokens >= dualKeyTokenThreshold;
          const dualOk = item.peerReviewCount >= 1;
          const hardBlock = requireDualKey && large && !dualOk;
          return (
            <li
              key={item.id}
              className="rounded-xl border border-white/10 bg-black/30 px-3 py-2"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0 space-y-1">
                  <Link
                    href={`/c/${item.id}`}
                    className="text-sm font-medium text-white hover:text-amber-200"
                  >
                    {item.taskTitle}
                  </Link>
                  <p className="text-[11px] text-stone-500">
                    @{item.handle || "builder"} · {item.createdAt}
                    {item.estimatedTokens > 0
                      ? ` · ~${item.estimatedTokens.toLocaleString()} tok`
                      : ""}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {item.disputed && (
                      <Badge className="border-rose-500/40 bg-rose-500/10 text-rose-200">
                        disputed
                      </Badge>
                    )}
                    {dualOk ? (
                      <Badge className="border-emerald-500/30 bg-emerald-500/10 text-emerald-200">
                        {item.peerReviewCount} peer review
                        {item.peerReviewCount === 1 ? "" : "s"}
                        {item.peerAvgScore != null
                          ? ` · avg ${item.peerAvgScore.toFixed(1)}`
                          : ""}
                      </Badge>
                    ) : (
                      <Badge className="border-white/10 bg-white/5 text-stone-400">
                        no peer review yet
                      </Badge>
                    )}
                    {large && !dualOk && (
                      <Badge
                        className={
                          hardBlock
                            ? "border-rose-500/40 bg-rose-500/10 text-rose-200"
                            : "border-amber-500/40 bg-amber-500/10 text-amber-100"
                        }
                      >
                        {hardBlock
                          ? "dual-key blocked - need peer review"
                          : "large leaf - peer review recommended"}
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link
                    href={`/c/${item.id}`}
                    className="rounded-full border border-white/15 px-3 py-1 text-[11px] text-stone-300 hover:border-amber-400/40"
                  >
                    Receipt
                  </Link>
                  <Link
                    href={`/projects/${projectSlug}#task-${item.taskId}`}
                    className="rounded-full border border-white/15 px-3 py-1 text-[11px] text-stone-300 hover:border-amber-400/40"
                  >
                    Task
                  </Link>
                  {!hardBlock && <CreatorAcceptButton contributionId={item.id} />}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
      {shown.length === 0 && (
        <p className="text-xs text-stone-500">
          No items match this filter. Toggle "Show all" to see unreviewed
          submissions.
        </p>
      )}
    </Card>
  );
}
