"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  claimTaskAction,
  cancelClaimAction,
  submitContributionAction,
  reviewContributionAction,
  creatorModerateContributionAction,
} from "@/lib/actions";
import { Button, Textarea, Label, Input } from "@/components/ui";

export function ClaimButton({ taskId }: { taskId: string }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <div>
      <Button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            try {
              const res = await claimTaskAction(taskId);
              if (res?.error) setError(res.error);
              else {
                setError(null);
                try {
                  const { fireForgeCelebrate } = await import(
                    "@/components/forge-celebrate"
                  );
                  fireForgeCelebrate("claim");
                } catch {
                  /* ignore */
                }
              }
            } catch (err) {
              setError(err instanceof Error ? err.message : "Claim failed");
            }
          })
        }
      >
        {pending ? "Claiming..." : "Claim task"}
      </Button>
      {error && <p className="mt-1 text-xs text-rose-400">{error}</p>}
    </div>
  );
}

export function CancelClaimButton({ taskId }: { taskId: string }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <div>
      <Button
        type="button"
        variant="secondary"
        disabled={pending}
        onClick={() =>
          start(async () => {
            try {
              const res = await cancelClaimAction(taskId);
              if (res?.error) setError(res.error);
              else setError(null);
            } catch (err) {
              setError(err instanceof Error ? err.message : "Release failed");
            }
          })
        }
      >
        {pending ? "Releasing..." : "Release claim"}
      </Button>
      {error && <p className="mt-1 text-xs text-rose-400">{error}</p>}
    </div>
  );
}

export function SubmitForm({ taskId }: { taskId: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [receiptId, setReceiptId] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        const form = e.currentTarget;
        const fd = new FormData(form);
        start(async () => {
          try {
            const res = await submitContributionAction(fd);
            if (res?.error) {
              setError(res.error);
              setOk(false);
              setReceiptId(null);
              return;
            }
            setError(null);
            setOk(true);
            const id =
              res && "contributionId" in res && typeof res.contributionId === "string"
                ? res.contributionId
                : null;
            setReceiptId(id);
            try {
              const { fireForgeCelebrate } = await import(
                "@/components/forge-celebrate"
              );
              fireForgeCelebrate("accept");
            } catch {
              /* ignore */
            }
            // Form may unmount after revalidatePath - never touch e.currentTarget async
            try {
              form.reset();
            } catch {
              /* ignore */
            }
            if (id) {
              // Navigate to receipt so user sees success clearly
              router.push(`/c/${id}`);
            }
          } catch (err) {
            setError(
              err instanceof Error
                ? err.message
                : "Submit failed - if this persists, your draft may still be in the browser."
            );
            setOk(false);
          }
        });
      }}
    >
      <input type="hidden" name="taskId" value={taskId} />
      <div>
        <Label>Output (markdown / JSON / code)</Label>
        <Textarea
          name="body"
          required
          minLength={20}
          placeholder="Paste your Grok (or manual) output here. Include structure that meets acceptance criteria."
        />
      </div>
      <div>
        <Label>Sources</Label>
        <Input name="sources" placeholder="URLs, papers, datasets..." />
      </div>
      <div>
        <Label>Content type</Label>
        <select
          name="contentType"
          className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-stone-100"
          defaultValue="markdown"
        >
          <option value="markdown">markdown</option>
          <option value="json">json</option>
          <option value="code">code</option>
        </select>
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Submitting..." : "Submit contribution"}
      </Button>
      {error && <p className="text-xs text-rose-400">{error}</p>}
      {ok && (
        <p className="text-xs text-emerald-400">
          Submitted to peer-review queue.
          {receiptId && (
            <>
              {" "}
              <a href={`/c/${receiptId}`} className="font-semibold text-amber-300 underline">
                Open public receipt
              </a>
            </>
          )}
        </p>
      )}
    </form>
  );
}

export function ReviewForm({ contributionId }: { contributionId: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <form
      className="flex flex-wrap items-end gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        const form = e.currentTarget;
        const fd = new FormData(form);
        const score = Number(fd.get("score"));
        const notes = String(fd.get("notes") || "");
        start(async () => {
          try {
            const res = await reviewContributionAction(contributionId, score, notes);
            if (res?.error) {
              setError(res.error);
              return;
            }
            setError(null);
            router.refresh();
          } catch (err) {
            setError(err instanceof Error ? err.message : "Review failed");
          }
        });
      }}
    >
      <div>
        <Label>Score 1-5</Label>
        <Input name="score" type="number" min={1} max={5} defaultValue={4} className="w-20" />
      </div>
      <div className="min-w-[180px] flex-1">
        <Label>Notes</Label>
        <Input name="notes" placeholder="Optional review notes" />
      </div>
      <Button type="submit" variant="secondary" disabled={pending}>
        Peer review
      </Button>
      {error && <p className="w-full text-xs text-rose-400">{error}</p>}
    </form>
  );
}

/** Project creator accept/reject - works for any pending submission on their project. */
export function CreatorModerationBar({ contributionId }: { contributionId: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const run = (decision: "accept" | "reject") => {
    start(async () => {
      try {
        const res = await creatorModerateContributionAction(contributionId, decision);
        if (res?.error) {
          setError(res.error);
          return;
        }
        setError(null);
        if (decision === "accept") {
          try {
            const { fireForgeCelebrate } = await import("@/components/forge-celebrate");
            fireForgeCelebrate("accept");
          } catch {
            /* ignore */
          }
        }
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Moderation failed");
      }
    });
  };

  return (
    <div className="mt-2 space-y-2 rounded-xl border border-amber-900/40 bg-amber-500/5 p-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-400">
        Creator moderation
      </p>
      <p className="text-xs text-stone-500">
        Accept to count this work on the leaderboard. Reject reopens the task for another pass.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button type="button" disabled={pending} onClick={() => run("accept")}>
          {pending ? "..." : "Accept submission"}
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={pending}
          onClick={() => run("reject")}
        >
          Request changes
        </Button>
      </div>
      {error && <p className="text-xs text-rose-400">{error}</p>}
    </div>
  );
}

/** Dashboard / project queue: compact accept for one pending row. */
export function CreatorAcceptButton({ contributionId }: { contributionId: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <div className="inline-flex flex-col items-end gap-1">
      <div className="flex flex-wrap gap-1.5">
        <Button
          type="button"
          disabled={pending}
          className="!px-2.5 !py-1 text-xs"
          onClick={() =>
            start(async () => {
              try {
                const res = await creatorModerateContributionAction(
                  contributionId,
                  "accept"
                );
                if (res?.error) setError(res.error);
                else {
                  setError(null);
                  router.refresh();
                }
              } catch (err) {
                setError(err instanceof Error ? err.message : "Accept failed");
              }
            })
          }
        >
          {pending ? "..." : "Accept"}
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={pending}
          className="!px-2.5 !py-1 text-xs"
          onClick={() =>
            start(async () => {
              try {
                const res = await creatorModerateContributionAction(
                  contributionId,
                  "reject"
                );
                if (res?.error) setError(res.error);
                else {
                  setError(null);
                  router.refresh();
                }
              } catch (err) {
                setError(err instanceof Error ? err.message : "Reject failed");
              }
            })
          }
        >
          Changes
        </Button>
      </div>
      {error && <p className="text-[10px] text-rose-400">{error}</p>}
    </div>
  );
}

/** Accept every pending submission on a project (creator only; dual-key skips reported). */
export function CreatorBulkAcceptButton({
  projectId,
  count,
}: {
  projectId: string;
  count: number;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (count < 2) return null;

  return (
    <div>
      <Button
        type="button"
        variant="secondary"
        disabled={pending}
        onClick={() =>
          start(async () => {
            try {
              setOk(null);
              const { creatorBulkAcceptPendingAction } = await import(
                "@/lib/actions"
              );
              const res = await creatorBulkAcceptPendingAction(projectId);
              if (res?.error) {
                setError(res.error);
                setOk(null);
              } else {
                setError(null);
                const skipped = res.skipped ?? 0;
                setOk(
                  skipped > 0
                    ? `Accepted ${res.accepted}; skipped ${skipped} (dual-key/gates)`
                    : `Accepted ${res.accepted}`
                );
                router.refresh();
              }
            } catch (err) {
              setError(err instanceof Error ? err.message : "Bulk accept failed");
            }
          })
        }
      >
        {pending ? "Accepting..." : `Accept all ${count} pending`}
      </Button>
      {error && <p className="mt-1 text-xs text-rose-400">{error}</p>}
      {ok && <p className="mt-1 text-xs text-emerald-400">{ok}</p>}
    </div>
  );
}
