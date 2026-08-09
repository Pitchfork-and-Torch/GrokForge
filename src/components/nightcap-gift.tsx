"use client";

import { useState, useTransition } from "react";
import { nightcapGiftAction } from "@/lib/actions";
import { Button, Input, Label, Textarea } from "@/components/ui";

type ProjectOpt = { id: string; title: string; slug: string };

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
      className="scroll-mt-24 rounded-2xl border border-amber-900/40 bg-gradient-to-br from-[#121212] to-amber-950/20 p-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold text-white">Nightcap gift</h2>
            <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-200">
              Leftover tokens
            </span>
          </div>
          <p className="mt-1 max-w-xl text-sm text-stone-400">
            Still have daily token capacity left? Report an estimate and gift it to keep the
            forge warm - or to a project. No API keys stored. Transparent, rest-aligned giving.
          </p>
        </div>
        <Button type="button" variant="secondary" onClick={() => setOpen((v) => !v)}>
          {open ? "Close" : "Give a nightcap"}
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
                  `Gifted ~${res.estimatedTokens?.toLocaleString()} tokens. Bee/Hive progress updated.`
                );
                (e.target as HTMLFormElement).reset();
              }
            });
          }}
        >
          <div>
            <Label>Estimated tokens remaining</Label>
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
              <option value="PLATFORM">Platform ops - keep the forge running</option>
              {projects.map((p) => (
                <option key={p.id} value={`PROJECT:${p.id}`}>
                  Project: {p.title}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label>Note (optional)</Label>
            <Textarea name="note" className="min-h-[60px]" placeholder="For the builders..." />
          </div>
          <Button
            type="submit"
            disabled={pending}
            onClick={() => {
              /* celebrate after successful server action via form - best-effort on next paint */
              try {
                void import("@/components/forge-celebrate").then((m) =>
                  m.fireForgeCelebrate("tip")
                );
              } catch {
                /* ignore */
              }
            }}
          >
            {pending ? "Recording..." : "Gift leftover capacity"}
          </Button>
          {error && <p className="text-xs text-rose-400">{error}</p>}
          {ok && <p className="text-xs text-emerald-400">{ok}</p>}
        </form>
      )}
    </div>
  );
}
