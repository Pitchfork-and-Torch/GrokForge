"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  disputeContributionAction,
  peerReviewContributionAction,
  reopenContributionTaskAction,
} from "@/lib/expansion-actions";
import { Button, Input, Label, Textarea } from "@/components/ui";

export function ContributionReviewPanel({
  contributionId,
  canPeerReview,
  canDispute,
  canReopen,
  disputed,
}: {
  contributionId: string;
  canPeerReview: boolean;
  canDispute: boolean;
  canReopen: boolean;
  disputed: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <div className="space-y-4 rounded-xl border border-white/10 bg-black/30 p-4">
      <h3 className="text-sm font-semibold text-white">Quality rails</h3>
      {canPeerReview && (
        <form
          className="space-y-2"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            fd.set("contributionId", contributionId);
            start(async () => {
              const res = await peerReviewContributionAction(fd);
              if (res && "error" in res) setError(res.error ?? "Review failed");
              else {
                setOk("Peer review recorded");
                router.refresh();
              }
            });
          }}
        >
          <p className="text-[11px] text-stone-500">Peer review (Forger+ / founder)</p>
          <div className="flex flex-wrap gap-2">
            <div>
              <Label htmlFor="score">Score 1-5</Label>
              <Input id="score" name="score" type="number" min={1} max={5} defaultValue={4} />
            </div>
            <div className="min-w-[12rem] flex-1">
              <Label htmlFor="notes">Notes</Label>
              <Input id="notes" name="notes" placeholder="Optional notes" />
            </div>
            <Button type="submit" variant="secondary" disabled={pending} className="self-end">
              Submit review
            </Button>
          </div>
        </form>
      )}
      {canDispute && !disputed && (
        <form
          className="space-y-2 border-t border-white/5 pt-3"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            fd.set("contributionId", contributionId);
            start(async () => {
              const res = await disputeContributionAction(fd);
              if (res && "error" in res) setError(res.error ?? "Dispute failed");
              else {
                setOk("Dispute filed");
                router.refresh();
              }
            });
          }}
        >
          <Label htmlFor="dispute">Dispute (public rationale)</Label>
          <Textarea id="dispute" name="note" required minLength={10} className="min-h-[60px]" />
          <Button type="submit" variant="danger" disabled={pending}>
            File dispute
          </Button>
        </form>
      )}
      {disputed && (
        <p className="text-xs text-amber-200">This submission is under dispute.</p>
      )}
      {canReopen && (
        <Button
          type="button"
          variant="secondary"
          disabled={pending}
          onClick={() => {
            const fd = new FormData();
            fd.set("contributionId", contributionId);
            start(async () => {
              const res = await reopenContributionTaskAction(fd);
              if (res && "error" in res) setError(res.error ?? "Reopen failed");
              else {
                setOk("Task reopened for rework");
                router.refresh();
              }
            });
          }}
        >
          Reopen task for rework
        </Button>
      )}
      {error && <p className="text-xs text-rose-400">{error}</p>}
      {ok && <p className="text-xs text-emerald-400">{ok}</p>}
    </div>
  );
}
