"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  agentVerifyMilestoneAction,
  humanVerifyMilestoneAction,
} from "@/lib/actions";
import { Button } from "@/components/ui";
import { fireForgeCelebrate } from "@/components/forge-celebrate";

export function MilestoneVerifyBar({
  milestoneId,
  humanDone,
  agentDone,
  released,
  agentNote,
  canAct,
}: {
  milestoneId: string;
  humanDone: boolean;
  agentDone: boolean;
  released: boolean;
  agentNote?: string | null;
  canAct: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (released) {
    return (
      <p className="mt-1 text-xs font-medium text-emerald-400">
        Released - dual verification complete
      </p>
    );
  }

  return (
    <div className="mt-2 space-y-2">
      <div className="flex flex-wrap gap-2 text-[10px] font-semibold uppercase tracking-wide">
        <span
          className={
            humanDone
              ? "rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-emerald-300"
              : "rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-stone-500"
          }
        >
          Human {humanDone ? "✓" : "pending"}
        </span>
        <span
          className={
            agentDone
              ? "rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-emerald-300"
              : "rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-stone-500"
          }
        >
          Agent {agentDone ? "✓" : "pending"}
        </span>
      </div>
      {agentNote && (
        <p className="text-[11px] text-stone-500">{agentNote}</p>
      )}
      {canAct && (
        <div className="flex flex-wrap gap-2">
          {!humanDone && (
            <Button
              type="button"
              variant="secondary"
              disabled={pending}
              className="!px-2.5 !py-1 text-xs"
              onClick={() =>
                start(async () => {
                  setError(null);
                  const res = await humanVerifyMilestoneAction(milestoneId);
                  if (res?.error) setError(res.error);
                  else {
                    if (res && "released" in res && res.released) {
                      fireForgeCelebrate("accept");
                    }
                    router.refresh();
                  }
                })
              }
            >
              Human verify
            </Button>
          )}
          {!agentDone && (
            <Button
              type="button"
              disabled={pending}
              className="!px-2.5 !py-1 text-xs"
              onClick={() =>
                start(async () => {
                  setError(null);
                  const res = await agentVerifyMilestoneAction(milestoneId);
                  if (res?.error) setError(res.error);
                  else {
                    if (res && "released" in res && res.released) {
                      fireForgeCelebrate("accept");
                    }
                    router.refresh();
                  }
                })
              }
            >
              Run agent verify
            </Button>
          )}
        </div>
      )}
      {error && <p className="text-xs text-rose-400">{error}</p>}
    </div>
  );
}
