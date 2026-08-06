"use client";

import { useState, useTransition } from "react";
import { demoDonateAction } from "@/lib/actions";
import { Button, Input, Label, Textarea } from "@/components/ui";
import { FUND_TYPE_LABELS } from "@/lib/utils";

type Pot = {
  id: string;
  label: string;
  type: string;
  balanceCents: number;
};

export function DonateForm({
  projectId,
  pots,
}: {
  projectId: string;
  pots: Pot[];
}) {
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [pending, start] = useTransition();
  const stripeLive = false; // server decides; copy explains both paths

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        start(async () => {
          const res = await demoDonateAction(fd);
          if (res?.error) {
            setError(res.error);
            setOk(false);
          } else {
            setError(null);
            setOk(true);
          }
        });
      }}
    >
      <input type="hidden" name="projectId" value={projectId} />
      <div>
        <Label>Fund pot</Label>
        <select
          name="potId"
          className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-zinc-100"
          defaultValue={pots[0]?.id}
          required
        >
          {pots.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label} ({FUND_TYPE_LABELS[p.type] || p.type})
            </option>
          ))}
        </select>
      </div>
      <div>
        <Label>Amount (USD)</Label>
        <Input name="amountUsd" type="number" min={1} step={1} defaultValue={10} required />
      </div>
      <div>
        <Label>Public message</Label>
        <Textarea name="message" placeholder="Optional note on the public ledger" className="min-h-[60px]" />
      </div>
      <p className="text-xs text-zinc-500">
        Without Stripe keys, donations record instantly as transparent demo capital.
        With <code className="text-zinc-400">STRIPE_SECRET_KEY</code>, Checkout opens instead.
        X Money P2P is a planned hook (handle-based) for later.
      </p>
      <Button type="submit" disabled={pending || pots.length === 0}>
        {pending ? "Processing..." : stripeLive ? "Donate via Stripe" : "Donate (demo ledger)"}
      </Button>
      {error && <p className="text-xs text-rose-400">{error}</p>}
      {ok && <p className="text-xs text-emerald-400">Donation recorded on the public ledger.</p>}
    </form>
  );
}
