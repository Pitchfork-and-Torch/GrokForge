"use client";

import { useState, useTransition } from "react";
import {
  createAgentTokenAction,
  revokeAgentTokenAction,
} from "@/lib/actions";
import { Button, Card, Input, Label } from "@/components/ui";

export type AgentTokenRow = {
  id: string;
  name: string;
  scopes: string;
  tokenPrefix: string;
  expiresAt: string | null;
  lastUsedAt: string | null;
  createdAt: string;
  revokedAt: string | null;
};

export function AgentTokensCard({
  initialTokens,
  isFounder = false,
}: {
  initialTokens: AgentTokenRow[];
  isFounder?: boolean;
}) {
  const [tokens, setTokens] = useState(initialTokens);
  const [name, setName] = useState("Grok Build");
  const [expiresInDays, setExpiresInDays] = useState("90");
  const [elevated, setElevated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [freshSecret, setFreshSecret] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setFreshSecret(null);
    const fd = new FormData();
    fd.set("name", name);
    fd.set("expiresInDays", expiresInDays);
    if (isFounder && elevated) fd.set("elevated", "1");
    start(async () => {
      const res = await createAgentTokenAction(fd);
      if (res && "error" in res) {
        setError(res.error ?? "Create token failed");
        return;
      }
      if (res && "ok" in res && res.token) {
        setFreshSecret(res.token);
        setTokens((prev) => [
          {
            id: res.id!,
            name: res.name || name,
            scopes: res.scopes || "",
            tokenPrefix: res.tokenPrefix || "gf_",
            expiresAt: res.expiresAt,
            lastUsedAt: null,
            createdAt: new Date().toISOString(),
            revokedAt: null,
          },
          ...prev,
        ]);
      }
    });
  }

  function onRevoke(id: string) {
    setError(null);
    start(async () => {
      const res = await revokeAgentTokenAction(id);
      if (res?.error) {
        setError(res.error);
        return;
      }
      setTokens((prev) =>
        prev.map((t) =>
          t.id === id ? { ...t, revokedAt: new Date().toISOString() } : t
        )
      );
      if (freshSecret?.startsWith(tokens.find((t) => t.id === id)?.tokenPrefix || "___")) {
        setFreshSecret(null);
      }
    });
  }

  const active = tokens.filter((t) => !t.revokedAt);
  const revoked = tokens.filter((t) => t.revokedAt);

  return (
    <Card className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-white">Agent API tokens</h2>
        <p className="mt-1 text-sm text-stone-400">
          Let Grok Build (or any local agent) claim and submit as you. Tokens authenticate
          to GrokForge only.{" "}
          <strong className="text-amber-200/90">Never paste xAI or SuperGrok keys here</strong>
          {" "}- run Grok in your own client.
        </p>
      </div>

      <form onSubmit={onCreate} className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto] sm:items-end">
          <div>
            <Label>Token name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Grok Build"
              maxLength={80}
            />
          </div>
          <div>
            <Label>Expires</Label>
            <select
              className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-stone-100"
              value={expiresInDays}
              onChange={(e) => setExpiresInDays(e.target.value)}
            >
              <option value="30">30 days</option>
              <option value="90">90 days</option>
              <option value="365">365 days</option>
              <option value="never">No expiry</option>
            </select>
          </div>
          <Button type="submit" disabled={pending}>
            {pending ? "Working..." : elevated && isFounder ? "Create elevated token" : "Create token"}
          </Button>
        </div>
        {isFounder && (
          <label className="flex cursor-pointer items-start gap-2 rounded-xl border border-emerald-500/25 bg-emerald-500/5 px-3 py-2 text-sm text-emerald-100/90">
            <input
              type="checkbox"
              className="mt-1"
              checked={elevated}
              onChange={(e) => setElevated(e.target.checked)}
            />
            <span>
              <span className="font-semibold text-emerald-200">Founder elevated perms</span>
              {" - "}
              adds <code className="text-emerald-300/90">moderation:write</code> and{" "}
              <code className="text-emerald-300/90">reviews:write</code> so Grok Build can
              auto-accept / bulk-accept submissions. Never share this token.
            </span>
          </label>
        )}
      </form>

      {error && <p className="text-sm text-rose-400">{error}</p>}

      {freshSecret && (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 space-y-2">
          <p className="text-sm font-semibold text-amber-200">
            Copy this secret now - it will not be shown again
          </p>
          <code className="block break-all rounded-lg bg-black/50 p-3 text-xs text-emerald-300">
            {freshSecret}
          </code>
          <p className="text-xs text-stone-400">
            Env:{" "}
            <code className="text-stone-300">GROKFORGE_TOKEN={freshSecret.slice(0, 16)}...</code>
            {" "}
            Base URL:{" "}
            <code className="text-stone-300">https://grokforge.app/api/v1</code>
          </p>
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              void navigator.clipboard?.writeText(freshSecret);
            }}
          >
            Copy secret
          </Button>
        </div>
      )}

      <div className="space-y-2">
        <h3 className="text-sm font-medium text-stone-300">Active ({active.length}/10)</h3>
        {active.length === 0 && (
          <p className="text-sm text-stone-500">No active tokens yet.</p>
        )}
        {active.map((t) => (
          <div
            key={t.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-black/30 px-3 py-2"
          >
            <div className="min-w-0 text-sm">
              <div className="font-medium text-white">{t.name}</div>
              <div className="text-xs text-stone-500">
                {t.tokenPrefix}... · {t.scopes.replaceAll(" ", " · ")}
                {t.expiresAt
                  ? ` · expires ${new Date(t.expiresAt).toLocaleDateString()}`
                  : " · no expiry"}
                {t.lastUsedAt
                  ? ` · last used ${new Date(t.lastUsedAt).toLocaleString()}`
                  : " · never used"}
              </div>
            </div>
            <Button
              type="button"
              variant="secondary"
              disabled={pending}
              onClick={() => onRevoke(t.id)}
            >
              Revoke
            </Button>
          </div>
        ))}
      </div>

      {revoked.length > 0 && (
        <details className="text-sm text-stone-500">
          <summary className="cursor-pointer text-stone-400">
            Revoked ({revoked.length})
          </summary>
          <ul className="mt-2 space-y-1">
            {revoked.map((t) => (
              <li key={t.id}>
                {t.name} · {t.tokenPrefix}...
              </li>
            ))}
          </ul>
        </details>
      )}

      <div className="rounded-xl border border-white/5 bg-black/20 p-3 text-xs text-stone-500 space-y-1">
        <p className="font-medium text-stone-400">Quick agent loop</p>
        <pre className="overflow-x-auto whitespace-pre-wrap text-[11px] leading-relaxed text-stone-500">{`curl -s -H "Authorization: Bearer $GROKFORGE_TOKEN" \\
  https://grokforge.app/api/v1/tasks?status=OPEN
curl -s -X POST -H "Authorization: Bearer $GROKFORGE_TOKEN" \\
  https://grokforge.app/api/v1/tasks/TASK_ID/claim
# run Grok locally on the prompt, then:
curl -s -X POST -H "Authorization: Bearer $GROKFORGE_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"body":"## Work\\n...","sources":"https://..."}' \\
  https://grokforge.app/api/v1/tasks/TASK_ID/submit`}</pre>
        {isFounder && (
          <pre className="mt-2 overflow-x-auto whitespace-pre-wrap text-[11px] leading-relaxed text-emerald-500/80">{`# Founder elevated (moderation:write):
curl -s -H "Authorization: Bearer $GROKFORGE_TOKEN" \\
  "https://grokforge.app/api/v1/contributions?status=PENDING&project=SLUG"
curl -s -X POST -H "Authorization: Bearer $GROKFORGE_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"decision":"accept"}' \\
  https://grokforge.app/api/v1/contributions/CONTRIB_ID/moderate
curl -s -X POST -H "Authorization: Bearer $GROKFORGE_TOKEN" \\
  https://grokforge.app/api/v1/projects/SLUG_OR_ID/bulk-accept`}</pre>
        )}
        <p>
          Docs: <code className="text-stone-400">/api/v1/*</code> · scopes{" "}
          <code className="text-stone-400">tasks:read</code>{" "}
          <code className="text-stone-400">claims:write</code>{" "}
          <code className="text-stone-400">contributions:write</code>
          {isFounder && (
            <>
              {" "}
              <code className="text-emerald-400/90">moderation:write</code>{" "}
              <code className="text-emerald-400/90">reviews:write</code>
            </>
          )}
        </p>
      </div>
    </Card>
  );
}
