"use client";

import { useState, useTransition } from "react";
import { Button, Card, Label } from "@/components/ui";
import { saveWorkerWebhookAction } from "@/lib/actions";

export function WorkerWebhookCard({
  initialUrl,
}: {
  initialUrl?: string | null;
}) {
  const [url, setUrl] = useState(initialUrl || "");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <Card className="space-y-3">
      <div>
        <h2 className="text-lg font-semibold text-white">Leaf-ready webhook</h2>
        <p className="mt-1 text-sm text-stone-400">
          Optional HTTPS endpoint for{" "}
          <code className="text-stone-300">leaf.ready</code> and{" "}
          <code className="text-stone-300">skill_pack.ready</code> events. Wake your
          worker when deps unlock or a project seals. No model keys in the payload.
        </p>
      </div>
      <div>
        <Label>Webhook URL</Label>
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://your-host/hooks/grokforge"
          className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 font-mono text-xs text-stone-100"
        />
      </div>
      <Button
        type="button"
        variant="secondary"
        disabled={pending}
        onClick={() =>
          start(async () => {
            setMsg(null);
            setErr(null);
            const res = await saveWorkerWebhookAction(url);
            if (res?.error) setErr(res.error);
            else setMsg(url.trim() ? "Webhook saved." : "Webhook cleared.");
          })
        }
      >
        {pending ? "Saving..." : "Save webhook"}
      </Button>
      {msg && <p className="text-xs text-emerald-400">{msg}</p>}
      {err && <p className="text-xs text-rose-400">{err}</p>}
    </Card>
  );
}
