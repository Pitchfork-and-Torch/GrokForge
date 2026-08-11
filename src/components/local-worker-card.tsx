"use client";

import { useState } from "react";
import { Button, Card } from "@/components/ui";

const SNIPPET = `# Create a Dashboard Agent API token first (gf_...), then:

export GROKFORGE_API=https://grokforge.app/api/v1
export GROKFORGE_TOKEN=gf_YOUR_TOKEN_HERE
# optional local model:
export OLLAMA_URL=http://127.0.0.1:11434
export OLLAMA_MODEL=llama3.2

# Ready-set claim loop (keys never leave your machine except gf_):
node scripts/local-agent-worker.mjs
# or pin a project:
node scripts/local-agent-worker.mjs anvil-infinity

# Dry run (claim only):
WORKER_DRY=1 node scripts/local-agent-worker.mjs`;

/** Dashboard helper: run the open-source local worker against ready-set leaves. */
export function LocalWorkerCard() {
  const [copied, setCopied] = useState(false);

  return (
    <Card className="space-y-3 border-sky-500/20 bg-sky-500/5">
      <div>
        <h2 className="text-lg font-semibold text-white">Local agent worker</h2>
        <p className="mt-1 text-sm text-stone-400">
          Unattended claim/submit from your PC (or any machine with Ollama). Uses a{" "}
          <strong className="text-amber-200/90">GrokForge token only</strong>
          {" "}- never SuperGrok / xAI keys. Ready-set DAG means only unblocked leaves are claimed.
        </p>
      </div>
      <pre className="overflow-x-auto rounded-xl border border-white/10 bg-black/50 p-3 text-[11px] leading-relaxed text-stone-300">
        {SNIPPET}
      </pre>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="secondary"
          className="!text-xs"
          onClick={() => {
            void navigator.clipboard?.writeText(SNIPPET).then(() => {
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            });
          }}
        >
          {copied ? "Copied" : "Copy runbook"}
        </Button>
        <a
          href="https://github.com/Pitchfork-and-Torch/GrokForge/blob/main/scripts/local-agent-worker.mjs"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center rounded-full border border-white/15 px-3 py-1.5 text-xs text-stone-300 hover:border-amber-500/40 hover:text-amber-100"
        >
          Worker source on GitHub
        </a>
        <a
          href="/openapi-agent-v1.json"
          className="inline-flex items-center rounded-full border border-white/15 px-3 py-1.5 text-xs text-stone-300 hover:border-amber-500/40 hover:text-amber-100"
        >
          OpenAPI
        </a>
        <a
          href="/forge"
          className="inline-flex items-center rounded-full border border-white/15 px-3 py-1.5 text-xs text-stone-300 hover:border-amber-500/40 hover:text-amber-100"
        >
          Forge map
        </a>
      </div>
    </Card>
  );
}
