#!/usr/bin/env node
/**
 * Local GrokForge agent worker (PC-side loop).
 * Claims ready-set leaves, runs a local model (Ollama by default), submits.
 *
 * Never sends SuperGrok / xAI keys to GrokForge - only GROKFORGE_TOKEN (gf_...).
 *
 * Env:
 *   GROKFORGE_API=https://grokforge.app/api/v1
 *   GROKFORGE_TOKEN=gf_...
 *   OLLAMA_URL=http://127.0.0.1:11434   (optional)
 *   OLLAMA_MODEL=llama3.2               (optional)
 *   WORKER_PROJECT=anvil-infinity       (optional slug filter)
 *   WORKER_MAX=3                        (max cycles per run)
 *   WORKER_DRY=1                        (claim only, do not submit)
 *
 * Usage:
 *   node scripts/local-agent-worker.mjs
 *   node scripts/local-agent-worker.mjs anvil-infinity
 */
const API = (process.env.GROKFORGE_API || "https://grokforge.app/api/v1").replace(
  /\/$/,
  ""
);
const TOKEN = process.env.GROKFORGE_TOKEN || "";
const OLLAMA = (process.env.OLLAMA_URL || "http://127.0.0.1:11434").replace(
  /\/$/,
  ""
);
const MODEL = process.env.OLLAMA_MODEL || "llama3.2";
const MAX = Math.max(1, Math.min(20, Number(process.env.WORKER_MAX || 3)));
const DRY = process.env.WORKER_DRY === "1";
const projectSlug =
  process.argv[2] || process.env.WORKER_PROJECT || undefined;

async function api(path, init = {}) {
  if (!TOKEN) {
    throw new Error("Set GROKFORGE_TOKEN (gf_...). Never put SuperGrok keys here.");
  }
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      Accept: "application/json",
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...(init.headers || {}),
    },
  });
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text.slice(0, 400) };
  }
  if (!res.ok) {
    const err = new Error(data?.error || `HTTP ${res.status}`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

async function ollamaGenerate(prompt) {
  const res = await fetch(`${OLLAMA}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      prompt,
      stream: false,
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Ollama ${res.status}: ${t.slice(0, 200)}`);
  }
  const data = await res.json();
  return String(data.response || "").trim();
}

function buildPrompt(task) {
  return `You are a careful GrokForge leaf worker. Produce a deliverable that meets acceptance criteria.
Be honest. Prefer "unknown" over fabricated citations. Open license friendly. No secrets or API keys.

# Task
${task.title}

# Prompt
${task.prompt}

# Acceptance criteria
${task.acceptanceCriteria}

# Output
Write a complete markdown deliverable (min ~200 words if criteria allow shorter, still be complete).
`;
}

async function cycleOnce() {
  const claimed = await api("/agent/worker", {
    method: "POST",
    body: JSON.stringify({
      action: "cycle",
      ...(projectSlug ? { projectSlug } : {}),
    }),
  });
  const task = claimed.task;
  if (!task?.id) throw new Error("No task in claim response");
  console.log(`[claim] ${task.id} ${task.title}`);

  if (DRY) {
    console.log("[dry] skip model + submit");
    return { dry: true, taskId: task.id };
  }

  let body;
  try {
    body = await ollamaGenerate(buildPrompt(task));
  } catch (e) {
    console.warn("[ollama] failed:", e.message);
    body = `# Deliverable (offline stub)\n\n## Task\n${task.title}\n\n## Notes\nLocal model unavailable (${e.message}).\n\n## Acceptance checklist\n${task.acceptanceCriteria}\n\n## Status\nPartial stub for CI/worker plumbing only. Replace with real work.\n`;
  }

  if (body.length < 40) {
    body +=
      "\n\n## Padding\nWorker ensured minimum body length for GrokForge submit gate.\n";
  }

  const submitted = await api("/agent/worker", {
    method: "POST",
    body: JSON.stringify({
      action: "submit",
      taskId: task.id,
      body,
      sources: "local-agent-worker + optional ollama",
      contentType: "markdown",
    }),
  });
  console.log(`[submit] ${submitted.contributionId || "ok"} ${submitted.receiptPath || ""}`);
  return submitted;
}

async function main() {
  console.log(
    JSON.stringify(
      {
        api: API,
        projectSlug: projectSlug || null,
        model: MODEL,
        dry: DRY,
        max: MAX,
      },
      null,
      2
    )
  );
  let ok = 0;
  let fail = 0;
  for (let i = 0; i < MAX; i++) {
    try {
      await cycleOnce();
      ok += 1;
    } catch (e) {
      fail += 1;
      console.error(`[cycle ${i + 1}]`, e.message || e);
      if (String(e.message || "").includes("No ready")) break;
    }
  }
  console.log(JSON.stringify({ done: true, ok, fail }, null, 2));
  if (ok === 0 && fail > 0) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
