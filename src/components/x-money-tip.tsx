"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Button, Input, Label } from "@/components/ui";
import { recordXMoneyTipAction } from "@/lib/actions";
import { fireForgeCelebrate } from "@/components/forge-celebrate";
import { deeplinkProvider } from "@/lib/x-money";

type ProjectOpt = { id: string; slug: string; title: string };

/**
 * Profile CTA: open X Money / profile send flow + optional ledger attribution.
 * No third-party X Money API - graceful deep-link + fallback.
 */
export function XMoneyTip({
  handle,
  recipientUserId,
  signedIn,
  projects = [],
  tipsReceivedCents = 0,
}: {
  handle: string;
  recipientUserId: string;
  signedIn: boolean;
  projects?: ProjectOpt[];
  tipsReceivedCents?: number;
}) {
  const h = handle.replace(/^@/, "");
  const [amount, setAmount] = useState("5");
  const [projectId, setProjectId] = useState("");
  const [copied, setCopied] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const xProfile = `https://x.com/${encodeURIComponent(h)}`;

  const copyHandle = async () => {
    try {
      await navigator.clipboard.writeText(`@${h}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Copy handle", `@${h}`);
    }
  };

  const openX = () => {
    // Client always uses deeplink adapter; native API is server-side when shipped by X
    const url = deeplinkProvider.buildSendUrl({
      recipientHandle: h,
      amountUsd: Number(amount) || undefined,
    });
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const recordAndOpen = () => {
    if (!signedIn) return;
    const cents = Math.round(Number(amount) * 100);
    start(async () => {
      try {
        const res = await recordXMoneyTipAction({
          recipientUserId,
          amountCents: cents,
          projectId: projectId || undefined,
        });
        if (res?.error) {
          setErr(res.error);
          setMsg(null);
          return;
        }
        setErr(null);
        setMsg("X Money send initiated - thank you for forging the greater good.");
        fireForgeCelebrate("tip");
        openX();
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Could not record tip");
      }
    });
  };

  return (
    <div className="space-y-3 rounded-2xl border border-[color:var(--accent)]/35 bg-[color:var(--accent)]/5 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[color:var(--accent)]">
            Support this builder
          </p>
          <h3 className="text-lg font-semibold text-white">Send X Money</h3>
          <p className="mt-1 text-xs text-stone-500">
            Peer tip via X Money (opens X). Optional project attribution on the public ledger.
            {tipsReceivedCents > 0 && (
              <span className="mt-1 block text-[color:var(--accent-hover)]">
                ~${(tipsReceivedCents / 100).toFixed(0)} in X Money tips recorded here
              </span>
            )}
          </p>
        </div>
      </div>

      {!signedIn ? (
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/login?next=${encodeURIComponent(`/u/${h}`)}`}
            className="inline-flex rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-stone-200 hover:border-[color:var(--accent)]/40"
          >
            Sign in with X to contribute
          </Link>
          <a
            href={xProfile}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex rounded-full border border-[color:var(--accent)]/40 px-4 py-2 text-sm text-[color:var(--accent-hover)] hover:bg-[color:var(--accent)]/10"
          >
            Open @{h} on X
          </a>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>Amount (USD, optional note)</Label>
              <Input
                type="number"
                min={1}
                max={10000}
                step={1}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Attribute to project (optional)</Label>
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-stone-100"
              >
                <option value="">General support</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" disabled={pending} onClick={recordAndOpen}>
              {pending ? "Opening..." : "Send X Money"}
            </Button>
            <Button type="button" variant="secondary" onClick={openX}>
              Open X Money
            </Button>
            <Button type="button" variant="ghost" onClick={copyHandle}>
              {copied ? "Copied @handle" : "Copy @handle"}
            </Button>
          </div>
          <p className="text-[11px] leading-relaxed text-stone-600">
            1) Open X · 2) Use X Money / payments to @{h} · 3) We log a CAPITAL ledger note marked
            &quot;X Money P2P&quot; (self-reported amount for transparency - not a bank transfer
            through GrokForge). Stripe project pots stay separate.
          </p>
        </div>
      )}
      {msg && <p className="text-xs text-emerald-400">{msg}</p>}
      {err && <p className="text-xs text-rose-400">{err}</p>}
    </div>
  );
}
