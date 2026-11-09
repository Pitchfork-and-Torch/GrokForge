# Formal verification in GrokForge

This folder holds the record of what has been model-checked, what it found, and
what it does not cover. The checks themselves live in project-local skills under
`.cursor/skills/verify-*/`, so an agent editing covered code finds them.

Batch 1 (this folder's first commits) covers the two highest-ranked subsystems.
The ranking is in [`SUBSYSTEMS.md`](./SUBSYSTEMS.md).

## Covered

| Subsystem | Skill | Tool | Status at sync commit |
|---|---|---|---|
| Leaf-task lifecycle: claim, release, expire, submit, peer review, creator accept/reject, reopen, project completion | [`.cursor/skills/verify-task-lifecycle/SKILL.md`](../../.cursor/skills/verify-task-lifecycle/SKILL.md) | TLA+ model checked with TLC (`tla2tools.jar` 1.7.4, TLC2 2.19) | 11 rules × 8 configs = 88 verdicts. `OneActiveClaimPerTask`, `DualKeyHonored` and `TypeOK` hold everywhere; the intended single-actor flow holds every rule. Six findings against the current code, F1 to F6, in [`task-lifecycle/FINDINGS.md`](./task-lifecycle/FINDINGS.md). |
| Funding ledger: Stripe webhook pot donations and match-pool top-ups, demo donations, matching burn | [`.cursor/skills/verify-funding-ledger/SKILL.md`](../../.cursor/skills/verify-funding-ledger/SKILL.md) | same | 5 rules × 3 configs = 15 verdicts. Pot donations are idempotent under webhook retries (unique `stripeSessionId`); `PoolConservation` and `TypeOK` hold everywhere. Two findings, G1 and G2, in [`funding-ledger/FINDINGS.md`](./funding-ledger/FINDINGS.md). |

Sync commit for both checks: `4ef25da2b2ccd4643f6f255ced5330de58142a6c` (recorded in
each skill's `<!-- sync-commit -->` marker; the runners report drift of covered files
against it).

## Rerun

```sh
node .cursor/skills/verify-task-lifecycle/scripts/check.mjs
node .cursor/skills/verify-funding-ledger/scripts/check.mjs
```

About three minutes on four cores for the first (170 s of TLC in the recorded run),
under a minute for the second. Exit 0 means every verdict matches that skill's
`expected.json` (passes stay passes, known findings stay findings) and the covered
code still has the lines the model describes.
[`task-lifecycle/check-summary.md`](./task-lifecycle/check-summary.md) and
[`funding-ledger/check-summary.md`](./funding-ledger/check-summary.md) are the
tables from the recorded runs.

Tools, pinned: `tla2tools.jar` 1.7.4 with sha256
`936a262061c914694dfd669a543be24573c45d5aa0ff20a8b96b23d01e050e88` (fetched once
into `~/.cache/grokforge-formal/`, or `TLA2TOOLS=...`); Java 11+ (run with OpenJDK
21.0.12.1); Node 18+ for the runner (run with Node 22.23.4). All open source, local,
no accounts.

## Why TLC

The question for this subsystem is whether events can happen in a bad order: a
release landing after a submit, two reviews from one reviewer, a reopen under
someone else's claim. That is a model-checking question over a small model of the
design, and TLA+ with TLC is the default for it. A code-level verifier does not
exist for TypeScript against Postgres, and a property-based test would need a live
database and would still check one interleaving per run. TLC checks every
interleaving within the bounds, with a shortest path for each break, in minutes.

## Charts

Each `<subsystem>/charts/<Config>__<Rule>/` folder has `report.md` (the shortest
path in plain words) and `chart.mmd` (Mermaid). `charts/Flow/` is the whole intended
flow; the others draw only the path to the broken rule. The `negative-control-*`
folders show each check failing on deliberately broken code; transcripts are in
[`task-lifecycle/NEGATIVE-CONTROL.md`](./task-lifecycle/NEGATIVE-CONTROL.md) and
the last section of [`funding-ledger/FINDINGS.md`](./funding-ledger/FINDINGS.md).

The charts were drawn with the pstack `/statechart` skill from single-rule configs
that the runner writes with `--emit DIR`. Read that skill for how to redraw them.

## Not verified

Everything not in the table above, in the order the ranking suggests next:

1. Seal and ship (`seal-ops.ts`, `github-ship-ops.ts`): two concurrent seals and
   the primary-package flag; the project-status side is covered by
   `ProjectTracksTask` in the task-lifecycle check.
2. Milestone dual verification (`actions.ts` `maybeReleaseMilestone`): double
   release ledger row.
3. Project archive/unarchive and `syncProjectCompletionStatus`'s own read/write
   race (modeled as one step today).

Agent API tokens, worker heartbeats and rate limiting were read and judged not to
be state machines worth a model; see `SUBSYSTEMS.md` for why.

## Upkeep

A change to covered code without rerunning the check leaves a pass that describes
code that no longer exists. The skill's "Update the verification when a change is
intended" section is the per-change loop; `/maintain-formal-verification-skill` is
the catch-up loop for changes that skipped it.
