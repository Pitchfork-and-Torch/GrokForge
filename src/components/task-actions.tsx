"use client";

import { useState, useTransition } from "react";
import { claimTaskAction, submitContributionAction, reviewContributionAction } from "@/lib/actions";
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
            const res = await claimTaskAction(taskId);
            if (res?.error) setError(res.error);
            else setError(null);
          })
        }
      >
        {pending ? "Claiming..." : "Claim task"}
      </Button>
      {error && <p className="mt-1 text-xs text-rose-400">{error}</p>}
    </div>
  );
}

export function SubmitForm({ taskId }: { taskId: string }) {
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [pending, start] = useTransition();

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        start(async () => {
          const res = await submitContributionAction(fd);
          if (res?.error) {
            setError(res.error);
            setOk(false);
          } else {
            setError(null);
            setOk(true);
            e.currentTarget.reset();
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
          className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-zinc-100"
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
      {ok && <p className="text-xs text-emerald-400">Submitted to peer-review queue.</p>}
    </form>
  );
}

export function ReviewForm({ contributionId }: { contributionId: string }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <form
      className="flex flex-wrap items-end gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const score = Number(fd.get("score"));
        const notes = String(fd.get("notes") || "");
        start(async () => {
          const res = await reviewContributionAction(contributionId, score, notes);
          if (res?.error) setError(res.error);
          else setError(null);
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
        Review
      </Button>
      {error && <p className="w-full text-xs text-rose-400">{error}</p>}
    </form>
  );
}
