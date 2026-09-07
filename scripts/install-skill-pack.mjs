#!/usr/bin/env node
/**
 * Install a GrokForge sealed skill pack into local agent skills.
 *
 *   node scripts/install-skill-pack.mjs anvil-infinity
 *   node scripts/install-skill-pack.mjs anvil-infinity --dir %USERPROFILE%\.grok\skills
 *
 * Never requires SuperGrok keys. Public GET skill-pack endpoint.
 */
import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { homedir } from "node:os";

const slug = process.argv[2];
if (!slug) {
  console.error("Usage: node scripts/install-skill-pack.mjs <project-slug> [--dir path]");
  process.exit(2);
}

let destRoot = join(homedir(), ".grok", "skills");
const dirFlag = process.argv.indexOf("--dir");
if (dirFlag >= 0 && process.argv[dirFlag + 1]) {
  destRoot = process.argv[dirFlag + 1];
}

const base =
  process.env.GROKFORGE_SITE ||
  process.env.NEXTAUTH_URL ||
  "https://grokforge.app";
const url = `${base.replace(/\/$/, "")}/api/projects/${encodeURIComponent(slug)}/skill-pack`;

const res = await fetch(url);
if (!res.ok) {
  console.error("HTTP", res.status, await res.text());
  process.exit(1);
}
const data = await res.json();
if (!data.files?.length) {
  console.error("No files in skill pack");
  process.exit(1);
}

let written = 0;
for (const f of data.files) {
  const rel = String(f.path || "").replace(/^\/+/, "").replace(/\.\./g, "");
  if (!rel) continue;
  const abs = join(destRoot, rel);
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(abs, f.content ?? "", "utf8");
  written += 1;
  console.log("wrote", abs);
}

const site = base.replace(/\/$/, "");
const nextLeaf = `${site}/projects/${encodeURIComponent(slug)}#ready-set`;
const readyBoard = `${site}/tasks?ready=1`;
const workerHint = `node scripts/local-agent-worker.mjs ${slug}`;

console.log(
  JSON.stringify(
    {
      ok: true,
      slug,
      destRoot,
      written,
      installHint: data.installHint,
      // Kit gravity: install → first leaf
      nextSteps: {
        claimFirstLeaf: nextLeaf,
        readySetBoard: readyBoard,
        runWorker: workerHint,
        note: "After install, claim a ready leaf or run the local worker with a GrokForge PAT (never SuperGrok keys).",
      },
    },
    null,
    2
  )
);
console.log("");
console.log("[kit-gravity] Next: open ready-set and claim a leaf");
console.log("  ", nextLeaf);
console.log("  ", readyBoard);
console.log("  ", workerHint);
