"use client";

import { useState, useTransition } from "react";
import { nightcapGiftAction } from "@/lib/actions";
import { Button, Input, Label, Textarea } from "@/components/ui";

type ProjectOpt = { id: string; title: string; slug: string };

/**
 * Nightcap: optional goodwill signal of leftover capacity.
 * Not spendable tokens - ledger + badges only. Do not show as Live Forge inventory.
 */
export function NightcapGift({
  projects,
  signedIn,
}: {
  projects: ProjectOpt[];
  signedIn: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (!signedIn) return null;

  return (
    <div
      id="nightcap"
      className="scroll-mt-24 rounded-2xl border border-white/10 bg-black/30 p-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold text-white">Nightcap gift</h2>
            <span className="rounded-full border border-white/15 bg-white/5 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-stone-400">
              Optional · not spendable
            </span>
          </div>
          <p className="mt-1 max-w-xl text-sm text-stone-400">
            Optionally report leftover daily capacity as a goodwill note to the
            forge or a project. This is <strong className="font-medium text-stone-300">not</strong>{" "}
            SuperGrok quota, not API credits, and not a spendable token balance -
            it only hits the public ledger and badge progress. No keys stored.
          </p>
        </div>
        <Button type="button" variant="secondary" onClick={() => setOpen((v) => !v)}>
          {open ? "Close" : "Leave a nightcap"}
        </Button>
      </div>

      {open && (
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
                setOk(
                  `Recorded ~${res.estimatedTokens?.toLocaleString()} as a capacity gift note. Not a spendable balance.`
                );
                (e.target as HTMLFormElement).reset();
              }
            });
          }}
        >
          <div>
            <Label>Estimated leftover capacity (note only)</Label>
            <Input
              name="estimatedTokens"
              type="number"
              min={100}
              step={100}
              defaultValue={5000}
              required
            />
          </div>
          <div>
            <Label>Destination</Label>
            <select
              name="target"
              className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm"
              defaultValue="PLATFORM"
            >
              <option value="PLATFORM">Platform - forge ops note</option>
              {projects.map((p) => (
                <option key={p.id} value={`PROJECT:${p.id}`}>
                  Project note: {p.title}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label>Note (optional)</Label>
            <Textarea name="note" className="min-h-[60px]" placeholder="For the builders..." />
          </div>
          <Button type="submit" disabled={pending}>
            {pending ? "Recording..." : "Record capacity gift note"}
          </Button>
          {error && <p className="text-xs text-rose-400">{error}</p>}
          {ok && <p className="text-xs text-emerald-400">{ok}</p>}
        </form>
      )}
    </div>
  );
}
