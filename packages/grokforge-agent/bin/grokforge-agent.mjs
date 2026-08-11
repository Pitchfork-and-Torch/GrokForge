#!/usr/bin/env node
/**
 * Minimal GrokForge Agent CLI: list / claim / submit (keys stay local).
 *
 *   export GROKFORGE_API=https://grokforge.app/api/v1
 *   export GROKFORGE_TOKEN=gf_...
 *   node scripts/grokforge-agent.mjs list
 *   node scripts/grokforge-agent.mjs claim <taskId>
 *   node scripts/grokforge-agent.mjs submit <taskId> path/to/body.md
 */
const API = (process.env.GROKFORGE_API || "https://grokforge.app/api/v1").replace(
  /\/$/,
  ""
);
const TOKEN = process.env.GROKFORGE_TOKEN || "";

async function api(path, init = {}) {
  if (!TOKEN) {
    console.error("Set GROKFORGE_TOKEN (GrokForge PAT gf_...). Never send xAI keys.");
    process.exit(2);
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
    data = { raw: text.slice(0, 500) };
  }
  if (!res.ok) {
    console.error("HTTP", res.status, data);
    process.exit(1);
  }
  return data;
}

async function main() {
  const [cmd, a, b] = process.argv.slice(2);
  if (!cmd || cmd === "help") {
    console.log(`Usage:
  me
  list
  work [projectSlug]   # ready-set claim via /api/v1/agent/work
  claim <taskId>
  submit <taskId> <file.md>`);
    process.exit(0);
  }
  if (cmd === "me") {
    console.log(JSON.stringify(await api("/me"), null, 2));
    return;
  }
  if (cmd === "list") {
    const data = await api("/tasks?status=OPEN");
    const tasks = Array.isArray(data) ? data : data.tasks || data.items || [];
    for (const t of tasks.slice(0, 40)) {
      console.log(
        [t.id, t.title || t.name, t.projectSlug || t.project?.slug || ""]
          .filter(Boolean)
          .join("\t")
      );
    }
    return;
  }
  if (cmd === "work") {
    // Ready-set Agent Runtime: POST /agent/work
    const projectSlug = a; // optional
    try {
      const pack = await api("/agent/work", {
        method: "POST",
        body: JSON.stringify(projectSlug ? { projectSlug } : {}),
      });
      console.log(JSON.stringify(pack, null, 2));
      return;
    } catch (e) {
      console.error("agent/work failed, falling back:", e.message || e);
    }
    const data = await api("/tasks?status=OPEN");
    const tasks = Array.isArray(data) ? data : data.tasks || data.items || [];
    const task = tasks[0];
    if (!task?.id) {
      console.error("No OPEN tasks");
      process.exit(1);
    }
    const claimed = await api(`/tasks/${task.id}/claim`, { method: "POST" });
    console.log(
      JSON.stringify(
        {
          claimed,
          taskId: task.id,
          title: task.title,
          next: "Run local Grok on prompt+acceptanceCriteria, then: submit <taskId> body.md",
        },
        null,
        2
      )
    );
    return;
  }
  if (cmd === "claim") {
    if (!a) throw new Error("claim needs taskId");
    console.log(JSON.stringify(await api(`/tasks/${a}/claim`, { method: "POST" }), null, 2));
    return;
  }
  if (cmd === "submit") {
    if (!a || !b) throw new Error("submit needs taskId and file path");
    const fs = await import("node:fs");
    const body = fs.readFileSync(b, "utf8");
    console.log(
      JSON.stringify(
        await api(`/tasks/${a}/submit`, {
          method: "POST",
          body: JSON.stringify({
            body,
            contentType: "markdown",
            sources: "",
          }),
        }),
        null,
        2
      )
    );
    return;
  }
  console.error("Unknown command", cmd);
  process.exit(1);
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
