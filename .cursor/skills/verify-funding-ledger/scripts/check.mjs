#!/usr/bin/env node
// Runs the TLA+ model of the project funding ledger against every rule, one TLC
// run per (config, rule), and compares each verdict with expected.json.
//
//   node .cursor/skills/verify-funding-ledger/scripts/check.mjs [options]
//
//   --config NAME   only this config (repeatable). Default: every *.cfg in model/.
//   --rule NAME     only this rule (repeatable). Default: every INVARIANT in the cfg.
//   --workers N     TLC worker threads. Default: auto. Use 1 for a stable trace.
//   --out DIR       where to write TLC output and summary.md. Must be new or empty.
//                   Default: a new folder under $TMPDIR/grokforge-verify/.
//   --emit DIR      also write one single-rule .cfg per (config, rule) into DIR,
//                   with the .tla files, for a chart tool to read.
//   --skip-shape    do not check that the covered code still has the lines the
//                   model describes.
//   --skip-drift    do not list covered files changed since the sync commit.
//
// Exit code: 0 when every verdict matches expected.json and the shape check
// passes; 1 when a verdict differs (a regression, or a finding that no longer
// reproduces); 2 when the shape check fails or TLC could not run.
//
// No dependencies. Needs Java 11+ and network once, to fetch the pinned TLC jar.

import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const TLC_VERSION = "1.7.4";
const TLC_URL = `https://github.com/tlaplus/tlaplus/releases/download/v${TLC_VERSION}/tla2tools.jar`;
const TLC_SHA256 = "936a262061c914694dfd669a543be24573c45d5aa0ff20a8b96b23d01e050e88";

const here = path.dirname(fileURLToPath(import.meta.url));
const skillDir = path.resolve(here, "..");
const modelDir = path.join(skillDir, "model");
const repoRoot = path.resolve(skillDir, "..", "..", "..");

const args = process.argv.slice(2);
const opt = { configs: [], rules: [], workers: "auto", out: null, emit: null, skipShape: false, skipDrift: false };
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  const next = () => {
    if (i + 1 >= args.length) fail(2, `${a} needs a value`);
    return args[++i];
  };
  if (a === "--config") opt.configs.push(next());
  else if (a === "--rule") opt.rules.push(next());
  else if (a === "--workers") opt.workers = next();
  else if (a === "--out") opt.out = next();
  else if (a === "--emit") opt.emit = next();
  else if (a === "--skip-shape") opt.skipShape = true;
  else if (a === "--skip-drift") opt.skipDrift = true;
  else if (a === "-h" || a === "--help") {
    console.log(fs.readFileSync(fileURLToPath(import.meta.url), "utf8").split("\n").filter((l) => l.startsWith("//")).map((l) => l.slice(3)).join("\n"));
    process.exit(0);
  } else fail(2, `Unknown option ${a}`);
}

function fail(code, msg) {
  console.error(msg);
  process.exit(code);
}

const run = (cmd, cmdArgs, cwd = repoRoot) =>
  spawnSync(cmd, cmdArgs, { cwd, encoding: "utf8", maxBuffer: 1 << 28 });

// ---------------------------------------------------------------- tooling
function sha256(file) {
  return createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

async function ensureTlc() {
  const javaBin = process.env.JAVA || "java";
  const jv = run(javaBin, ["-version"]);
  if (jv.status !== 0) fail(2, `Cannot run ${javaBin}. Install Java 11 or later, or set JAVA.`);
  const m = /version "(\d+)(?:\.(\d+))?/.exec(jv.stderr + jv.stdout);
  const major = m ? Number(m[1]) === 1 ? Number(m[2]) : Number(m[1]) : 0;
  if (major < 11) fail(2, `Java 11 or later is required; found: ${(jv.stderr + jv.stdout).split("\n")[0]}`);

  let jar = process.env.TLA2TOOLS;
  if (!jar) {
    const cache = process.env.GROKFORGE_TLC_DIR || path.join(os.homedir(), ".cache", "grokforge-formal");
    jar = path.join(cache, `tla2tools-${TLC_VERSION}.jar`);
    if (!fs.existsSync(jar) || sha256(jar) !== TLC_SHA256) {
      fs.mkdirSync(cache, { recursive: true });
      console.log(`Fetching TLC ${TLC_VERSION} from ${TLC_URL}`);
      const res = await fetch(TLC_URL);
      if (!res.ok) fail(2, `Download failed: ${res.status} ${res.statusText}`);
      const buf = Buffer.from(await res.arrayBuffer());
      const sum = createHash("sha256").update(buf).digest("hex");
      if (sum !== TLC_SHA256) fail(2, `tla2tools.jar checksum mismatch: ${sum} (expected ${TLC_SHA256}). Not using it.`);
      fs.writeFileSync(jar, buf);
    }
  } else if (!fs.existsSync(jar)) fail(2, `TLA2TOOLS points at ${jar}, which does not exist.`);
  return { java: javaBin, jar, javaVersion: (jv.stderr + jv.stdout).split("\n")[0] };
}

// ------------------------------------------------------------ code shape
function checkShape() {
  const sentinels = JSON.parse(fs.readFileSync(path.join(skillDir, "shape.json"), "utf8"));
  const problems = [];
  for (const s of sentinels) {
    const file = path.join(repoRoot, s.file);
    if (!fs.existsSync(file)) {
      problems.push(`${s.file}: file is gone (model step ${s.model})`);
      continue;
    }
    const text = fs.readFileSync(file, "utf8");
    for (const needle of s.mustContain ?? [])
      if (!text.includes(needle)) problems.push(`${s.file}: no longer contains ${JSON.stringify(needle)} -> re-read ${s.function} and model step ${s.model}: ${s.why}`);
    for (const needle of s.mustNotContain ?? [])
      if (text.includes(needle)) problems.push(`${s.file}: now contains ${JSON.stringify(needle)} -> re-read ${s.function} and model step ${s.model}: ${s.why}`);
  }
  return { count: sentinels.length, problems };
}

// ------------------------------------------------------------------ drift
function checkDrift() {
  const skill = fs.readFileSync(path.join(skillDir, "SKILL.md"), "utf8");
  const m = /<!--\s*sync-commit:\s*([0-9a-f]{7,40})\s*-->/.exec(skill);
  if (!m) return { sync: null, note: "SKILL.md has no <!-- sync-commit: ... --> marker." };
  const sync = m[1];
  const sentinels = JSON.parse(fs.readFileSync(path.join(skillDir, "shape.json"), "utf8"));
  const files = [...new Set(sentinels.map((s) => s.file))];
  const known = run("git", ["cat-file", "-e", `${sync}^{commit}`]);
  if (known.status !== 0) return { sync, note: `Sync commit ${sync} is not in this clone (shallow clone?). Fetch it to see drift.` };
  const diff = run("git", ["diff", "--stat", sync, "--", ...files]);
  const head = run("git", ["rev-parse", "--short", "HEAD"]).stdout.trim();
  return { sync, head, changed: diff.stdout.trim(), files };
}

// -------------------------------------------------------------------- TLC
function readRules(cfgText) {
  const idx = cfgText.search(/^INVARIANTS?\b/m);
  if (idx < 0) return { head: cfgText, rules: [] };
  const head = cfgText.slice(0, idx);
  const tail = cfgText.slice(idx).replace(/^INVARIANTS?\b/, "");
  const rules = tail.split(/\s+/).map((s) => s.trim()).filter(Boolean);
  return { head, rules };
}

function verdictOf(status) {
  if (status === 0) return "pass";
  if (status === 11 || status === 12 || status === 13) return "fail";
  return "error";
}

function traceActions(out) {
  const acts = [];
  for (const m of out.matchAll(/^State \d+: <([A-Za-z0-9_]+) /gm)) acts.push(m[1]);
  return acts;
}

function statesOf(out) {
  const m = /([\d,]+) distinct states found/.exec(out);
  return m ? m[1] : "?";
}

async function main() {
  const tlc = await ensureTlc();
  const expected = JSON.parse(fs.readFileSync(path.join(skillDir, "expected.json"), "utf8"));

  let outDir = opt.out;
  if (!outDir) {
    fs.mkdirSync(path.join(os.tmpdir(), "grokforge-verify"), { recursive: true });
    outDir = fs.mkdtempSync(path.join(os.tmpdir(), "grokforge-verify", "run-"));
  } else {
    fs.mkdirSync(outDir, { recursive: true });
    if (fs.readdirSync(outDir).length) fail(2, `${outDir} is not empty. Pass --out with a new folder.`);
  }
  const work = fs.mkdtempSync(path.join(os.tmpdir(), "grokforge-tlc-"));
  for (const f of fs.readdirSync(modelDir)) if (/\.tla$/.test(f)) fs.copyFileSync(path.join(modelDir, f), path.join(work, f));
  if (opt.emit) {
    fs.mkdirSync(opt.emit, { recursive: true });
    for (const f of fs.readdirSync(modelDir)) if (/\.(tla|mjs)$/.test(f)) fs.copyFileSync(path.join(modelDir, f), path.join(opt.emit, f));
  }

  const lines = [];
  const log = (s = "") => {
    console.log(s);
    lines.push(s);
  };

  log(`# verify-funding-ledger check`);
  log();
  log(`- repo HEAD: ${run("git", ["rev-parse", "--short", "HEAD"]).stdout.trim()}`);
  log(`- TLC: tla2tools ${TLC_VERSION} (sha256 ${TLC_SHA256.slice(0, 12)}...) at ${tlc.jar}`);
  log(`- Java: ${tlc.javaVersion}`);
  log(`- workers: ${opt.workers}`);
  log();

  let exitCode = 0;

  if (!opt.skipShape) {
    const shape = checkShape();
    log(`## Code shape (${shape.count} sentinels)`);
    log();
    if (shape.problems.length === 0) log("All sentinel lines are present. The model's steps still have their lines in the code.");
    else {
      exitCode = 2;
      log("The model may no longer describe the code. Re-read the named functions and update model/FundingLedger.tla before trusting the verdicts below:");
      for (const p of shape.problems) log(`- ${p}`);
    }
    log();
  }

  if (!opt.skipDrift) {
    const d = checkDrift();
    log(`## Drift since sync commit`);
    log();
    if (d.note) log(d.note);
    else if (!d.changed) log(`No covered file changed between ${d.sync} and the working tree (HEAD ${d.head}).`);
    else {
      log(`Covered files changed between ${d.sync} and the working tree (HEAD ${d.head}). Read the diff before trusting a pass:`);
      log("```");
      log(d.changed);
      log("```");
    }
    log();
  }

  log(`## Verdicts`);
  log();
  log(`| config | rule | expected | actual | states | result |`);
  log(`|---|---|---|---|---|---|`);

  const cfgFiles = fs.readdirSync(modelDir).filter((f) => f.endsWith(".cfg")).sort();
  const results = [];
  for (const cfgFile of cfgFiles) {
    const config = cfgFile.replace(/\.cfg$/, "");
    if (opt.configs.length && !opt.configs.includes(config)) continue;
    const cfgText = fs.readFileSync(path.join(modelDir, cfgFile), "utf8");
    const { head, rules } = readRules(cfgText);
    for (const rule of rules) {
      if (opt.rules.length && !opt.rules.includes(rule)) continue;
      const single = `${head.trimEnd()}\nINVARIANT ${rule}\n`;
      const cfgPath = path.join(work, `${config}__${rule}.cfg`);
      fs.writeFileSync(cfgPath, single);
      if (opt.emit) fs.writeFileSync(path.join(opt.emit, `${config}__${rule}.cfg`), single);
      const meta = path.join(work, `meta-${config}-${rule}`);
      const t0 = Date.now();
      const r = run(
        tlc.java,
        ["-XX:+UseParallelGC", "-cp", tlc.jar, "tlc2.TLC", "-workers", String(opt.workers), "-fp", "0", "-metadir", meta, "-config", cfgPath, path.join(work, `${config}.tla`)],
        work,
      );
      const out = (r.stdout || "") + (r.stderr || "");
      const secs = ((Date.now() - t0) / 1000).toFixed(1);
      fs.mkdirSync(path.join(outDir, config), { recursive: true });
      fs.writeFileSync(path.join(outDir, config, `${rule}.tlc.out`), out);
      const actual = verdictOf(r.status);
      const exp = expected[config]?.[rule] ?? "unknown";
      const expKind = exp.startsWith("finding") ? "fail" : exp;
      let result;
      if (actual === "error") result = "ERROR: TLC did not finish; read the .tlc.out";
      else if (expKind === "unknown") result = "NEW: not in expected.json";
      else if (actual === expKind) result = actual === "pass" ? "ok" : `ok (known ${exp})`;
      else if (actual === "fail") result = "REGRESSION: rule held before and breaks now";
      else result = `CHANGED: ${exp} no longer reproduces; confirm the fix in code, then update expected.json`;
      if (!result.startsWith("ok")) exitCode = exitCode === 2 ? 2 : 1;
      const trace = actual === "fail" ? traceActions(out).slice(1) : [];
      results.push({ config, rule, expected: exp, actual, states: statesOf(out), secs, result, trace });
      log(`| ${config} | ${rule} | ${exp} | ${actual} | ${statesOf(out)} | ${result} (${secs}s) |`);
    }
  }
  log();

  const fails = results.filter((r) => r.actual === "fail");
  if (fails.length) {
    log(`## Shortest paths for rules that break`);
    log();
    log("Steps are the model's action names; the mapping to code is in SKILL.md. Read a path with /statechart to see it as a chart in plain words.");
    log();
    for (const r of fails) log(`- ${r.config} / ${r.rule} (${r.trace.length} steps): ${r.trace.join(" -> ")}`);
    log();
  }

  log(`Outputs: ${outDir}`);
  if (opt.emit) log(`Single-rule configs for charting: ${opt.emit}`);
  fs.writeFileSync(path.join(outDir, "summary.md"), lines.join("\n") + "\n");
  fs.writeFileSync(path.join(outDir, "summary.json"), JSON.stringify({ results }, null, 2));
  fs.rmSync(work, { recursive: true, force: true });
  process.exit(exitCode);
}

main().catch((e) => fail(2, e?.stack || String(e)));
