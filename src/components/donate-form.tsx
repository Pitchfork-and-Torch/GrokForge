"use client";

import { useRef, useState, useTransition } from "react";
import { demoDonateAction } from "@/lib/actions";
import { Button, Input, Label, Textarea } from "@/components/ui";
import { FUND_TYPE_LABELS } from "@/lib/utils";

type Pot = {
  id: string;
  label: string;
  type: string;
  balanceCents: number;
};

const PRESETS = [5, 10, 25, 50] as const;

export function DonateForm({
  projectId,
  pots,
  stripeConfigured = false,
}: {
  projectId: string;
  pots: Pot[];
  stripeConfigured?: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [amount, setAmount] = useState(10);
  const [pending, start] = useTransition();
  const amountRef = useRef<HTMLInputElement>(null);

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        start(async () => {
          setOk(false);
          const res = await demoDonateAction(fd);
          // Stripe path redirects; if we return, demo path or error
          if (res && "error" in res) {
            setError(res.error ?? "Donate failed");
            setOk(false);
          } else if (res && "ok" in res && res.ok) {
            setError(null);
            setOk(true);
            try {
              const { fireForgeCelebrate } = await import(
                "@/components/forge-celebrate"
              );
              fireForgeCelebrate("donate");
            } catch {
              /* ignore */
            }
          }
        });
      }}
    >
      <input type="hidden" name="projectId" value={projectId} />
      <div>
        <Label>Fund pot</Label>
        <select
          name="potId"
          className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-stone-100"
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
        <div className="mb-2 flex flex-wrap gap-1.5">
          {PRESETS.map((n) => (
            <button
              key={n}
              type="button"
              className={
                amount === n
                  ? "rounded-full bg-amber-500 px-2.5 py-1 text-xs font-bold text-black"
                  : "rounded-full border border-white/10 bg-black/30 px-2.5 py-1 text-xs text-stone-300 hover:border-amber-500/40"
              }
              onClick={() => {
                setAmount(n);
                if (amountRef.current) amountRef.current.value = String(n);
              }}
            >
              ${n}
            </button>
          ))}
        </div>
        <Input
          ref={amountRef}
          name="amountUsd"
          type="number"
          min={1}
          step={1}
          defaultValue={10}
          required
          onChange={(e) => setAmount(Number(e.target.value) || 0)}
        />
      </div>
      <div>
        <Label>Public message</Label>
        <Textarea
          name="message"
          placeholder="Optional note on the public ledger"
          className="min-h-[60px]"
        />
      </div>
      <p className="text-xs text-stone-500">
        {stripeConfigured ? (
          <>
            <span className="font-semibold text-amber-200/90">Stripe Checkout live.</span>{" "}
            You will be redirected to pay securely. The public ledger updates after payment
            confirms (webhook).
          </>
        ) : (
          <>
            Transparent <strong className="text-stone-400">demo capital</strong> is recorded
            instantly on the public ledger (no card charge). Set{" "}
            <code className="text-stone-400">STRIPE_SECRET_KEY</code> + webhook for real
            Checkout.
          </>
        )}
      </p>
      <Button type="submit" disabled={pending || pots.length === 0 || amount < 1}>
        {pending
          ? "Processing..."
          : stripeConfigured
            ? `Donate $${amount || "…"} via Stripe`
            : `Donate $${amount || "…"} (demo ledger)`}
      </Button>
      {error && <p className="text-xs text-rose-400">{error}</p>}
      {ok && (
        <p className="text-xs text-emerald-400">
          Donation recorded on the public ledger. Impact score updates on the leaderboard.
        </p>
      )}
    </form>
  );
}
