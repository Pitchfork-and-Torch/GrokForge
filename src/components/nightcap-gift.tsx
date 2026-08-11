"use client";

import { useState, useTransition } from "react";
import { nightcapGiftAction } from "@/lib/actions";
import { Button, Input, Label, Textarea } from "@/components/ui";

type ProjectOpt = { id: string; title: string; slug: string };

export function NightcapGift({
  projects,
  signedIn,
  poolAvailable,
}: {
  projects: ProjectOpt[];
  signedIn: boolean;
  /** Server-rendered platform available for first paint */
  poolAvailable?: number | null;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [pool, setPool] = useState<number | null>(poolAvailable ?? null);
  const [pending, start] = useTransition();

  return (
    <div
      id="nightcap"
      className="scroll-mt-24 rounded-2xl border border-amber-900/40 bg-gradient-to-br from-[#121212] to-amber-950/20 p-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold text-white">Nightcap gift</h2>
            <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-200">
              Real pool credit
            </span>
            {pool != null && (
              <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold tabular-nums text-emerald-200">
                Platform pool: {pool.toLocaleString()} available
              </span>
            )}
          </div>
          <p className="mt-1 max-w-xl text-sm text-stone-400">
            Gift leftover daily capacity into the <strong className="font-medium text-stone-300">public nightcap pool</strong>.
            Gifts credit a real on-platform balance (platform ops or a project). Live tally above
            updates in real time. Never stores SuperGrok / xAI API keys - capacity units only.
          </p>
        </div>
        {signedIn ? (
          <Button type="button" variant="secondary" onClick={() => setOpen((v) => !v)}>
            {open ? "Close" : "Give a nightcap"}
          </Button>
        ) : (
          <a
            href="/login?next=/#nightcap"
            className="inline-flex rounded-full border border-amber-500/40 bg-amber-500/15 px-3 py-1.5 text-xs font-semibold text-amber-100"
          >
            Sign in to gift
          </a>
        )}
      </div>

      {signedIn && open && (
        <form
          className="mt-4 space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            start(async () => {
              setError(null);
              setOk(null);
              const res = await nightcapGiftAction(fd);
              if (res?.error) setError(res.error);
              else if (res?.ok) {
                const avail = res.pool?.platformAvailable;
                if (typeof avail === "number") setPool(avail);
                setOk(
                  `Credited ${res.estimatedTokens?.toLocaleString()} capacity tokens to the pool. Network available: ${
                    res.pool?.networkAvailable?.toLocaleString?.() ?? "updated"
                  }.`
                );
                (e.target as HTMLFormElement).reset();
                try {
                  const { fireForgeCelebrate } = await import(
                    "@/components/forge-celebrate"
                  );
                  fireForgeCelebrate("tip");
                } catch {
                  /* ignore */
                }
              }
            });
          }}
        >
          <div>
            <Label>Capacity tokens to gift</Label>
            <Input
              name="estimatedTokens"
              type="number"
              min={100}
              step={100}
              defaultValue={5000}
              required
            />
            <p className="mt-1 text-[11px] text-stone-600">
              These credit the public pool immediately (100–5,000,000 per gift).
            </p>
          </div>
          <div>
            <Label>Destination pool</Label>
            <select
              name="target"
              className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm"
              defaultValue="PLATFORM"
            >
              <option value="PLATFORM">
                Platform nightcap pool - forge ops capacity
              </option>
              {projects.map((p) => (
                <option key={p.id} value={`PROJECT:${p.id}`}>
                  Project pool: {p.title}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label>Note (optional)</Label>
            <Textarea name="note" className="min-h-[60px]" placeholder="For the builders..." />
          </div>
          <Button type="submit" disabled={pending}>
            {pending ? "Crediting pool..." : "Credit nightcap pool"}
          </Button>
          {error && <p className="text-xs text-rose-400">{error}</p>}
          {ok && <p className="text-xs text-emerald-400">{ok}</p>}
        </form>
      )}
    </div>
  );
}
