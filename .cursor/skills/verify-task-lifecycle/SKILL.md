---
name: verify-task-lifecycle
description: "Model-check GrokForge's leaf-task lifecycle (claim, release, expire, submit, peer review, creator accept/reject, reopen, project completion) with TLA+/TLC. Use before and after any change to src/lib/task-ops.ts, expire-claims.ts, peer-review-ops.ts, moderation-ops.ts, expansion-actions.ts, project-completion.ts, or the Task/TaskClaim/Contribution/ContributionReview models in prisma/schema.prisma; or when a report says two builders worked the same leaf, a submission was refused as 'no longer claimed', reputation doubled, or a project stayed COMPLETED with open work."
---

# Verify the leaf-task lifecycle

<!-- sync-commit: 4ef25da2b2ccd4643f6f255ced5330de58142a6c -->

This skill checks every order in which concurrent requests can hit one leaf task:
a builder claiming, releasing or submitting (browser or Agent API), the claim-expiry
job (cron and page loads), a peer reviewer, and the project creator accepting,
rejecting or reopening. TLC explores every interleaving within the bounds below and
reports the shortest path to each state that breaks a rule.

A pass covers the model under its bounds. It is not a proof about the whole app.

## What it checks

Each rule is one sentence the code promises, and the harm when it breaks. The
rules live in `model/TaskLifecycle.tla` under "Rules".

| Rule | Promise | Harm when broken |
|---|---|---|
| `OneActiveClaimPerTask` | One active `TaskClaim` per task (schema comment on `TaskClaim`). | Two builders do the same work. |
| `ActiveClaimMeansClaimed` | Between requests, a task has an active claim exactly when its status is `CLAIMED`. | A builder's submit is refused with "Task is no longer claimed by you", or a task shows `CLAIMED` with nobody holding it. |
| `PendingMeansSubmitted` | Between requests, a `PENDING` contribution exists exactly when the task is `SUBMITTED`. | Work waits in the review queue while the leaf is open and someone re-does it. |
| `AtMostOnePending` | One submission waits per task. | Two deliverables compete for one leaf. |
| `AcceptedMeansDone` | Between requests, an `ACCEPTED` contribution exists exactly when the task is `ACCEPTED`. | A leaf counts as done with no deliverable, or accepted work sits on an open leaf. |
| `AtMostOneAccepted` | One accepted deliverable per leaf. | The sealed package and the ledger carry two deliverables for one leaf. |
| `CreditPaidOnce` | The acceptance reputation (+5, or +6 on strong-worker accept) is paid once per contribution. | Reputation inflates past the Forger (100) and Anvil (400) gates. |
| `OneReviewPerReviewer` | One `ContributionReview` per reviewer per contribution (comment in `peer-review-ops.ts`). | A reviewer's score counts twice; the reviewer is paid +2 twice. |
| `ProjectTracksTask` | Between requests, the project is `COMPLETED` exactly when every claimable leaf is `ACCEPTED`. | A project with open work shows as complete and can be sealed and shipped. |
| `DualKeyHonored` | With `requireDualKey` on a large leaf, nothing is accepted without a review by someone other than the author. | One person signs off alone on work the project said needs two. |
| `TypeOK` | Every row has the shape the code writes. | The model is wrong, not the code. |

Rules that start with `Idle =>` in the model hold only between requests. They do
not judge the middle of a multi-statement handler.

## Covered code

Every action in the model is one statement that commits on its own, or one
`prisma.$transaction`. A read that happens before a write in the same function is
its own step when another request can commit in between.

| Code | Model actions |
|---|---|
| `src/lib/task-ops.ts` `claimTaskForUser` | `ClaimCommit` (the `$transaction`; the reads before it only choose an error message) |
| `src/lib/task-ops.ts` `releaseClaimForUser` | `ReleaseRead` (the `findFirst` and `count` before the transaction), `ReleaseCommit` (the `$transaction`) |
| `src/lib/task-ops.ts` `submitContributionForUser` | `SubmitRead` (the `findUnique` with the caller's active claim, quality gate, strong-worker decision), `SubmitCommit` (the `$transaction`), `SubmitSync` (`syncProjectCompletionStatus` on auto-accept) |
| `src/lib/expire-claims.ts` `expireStaleClaims` | `ExpireRead` (the `findMany` and per-claim `count`), `ExpireCommit` (the per-claim `$transaction`) |
| `src/lib/peer-review-ops.ts` `peerReviewContributionForUser` | `PeerReviewRead`, `PeerReviewCreate`, `PeerReviewAvg`, `PeerReviewWriteContrib`, `PeerReviewWriteTask`, `PeerReviewCredit`, `PeerReviewSync`, in the order of the statements |
| `src/lib/moderation-ops.ts` `moderateContributionForUser` | `ModerateRead`, `ModerateWriteContrib`, `ModerateWriteTask`, `ModerateCredit`, `ModerateReview`, `ModerateSync` |
| `src/lib/expansion-actions.ts` `reopenContributionTaskAction` | `Reopen` (the `$transaction`) |
| `src/lib/project-completion.ts` `syncProjectCompletionStatus` | `SyncedProject`, used by the three `*Sync` actions |
| `prisma/schema.prisma` `TaskClaim`, `Contribution`, `ContributionReview` | the shape of `claims`, `contribs`, `reviews`; the absence of a unique index on `(contributionId, reviewerId)` |

`shape.json` lists the lines in these functions that the model depends on. The
check fails when one is gone, so that a stale model is not mistaken for a proof.

Callers (`src/lib/actions.ts`, `src/app/api/v1/**`, `packages/mcp-server`) are not
modeled. They call the functions above; a new caller that writes `Task.status`,
`TaskClaim.active` or `Contribution.status` directly is new covered code and needs a
model action.

## Does my change touch this?

Yes, if it edits any file in the table above, adds or removes an `await` on
`prisma.*` inside one of those functions, moves a statement into or out of a
`$transaction`, changes a `where` clause that guards a status, changes what
`syncProjectCompletionStatus` decides, or adds an index or constraint to the
covered models. Also yes for a new code path that writes those columns.

## Run it

```sh
node .cursor/skills/verify-task-lifecycle/scripts/check.mjs
```

Needs Java 11+ (`java` on PATH, or `JAVA=/path/to/java`) and network on first run
to fetch TLC. Takes about three minutes on four cores. It prints a table with one
row per (config, rule), writes TLC output and `summary.md` to a new folder under
the system temp dir (or `--out DIR`), and exits 0 only when every verdict matches
`expected.json` and the code-shape sentinels are present.

Useful options: `--config Flow` or `--rule CreditPaidOnce` to narrow; `--workers 1`
for a stable trace; `--emit DIR` to write one single-rule `.cfg` per cell with the
`.tla` files and `view.mjs`, for charting; `--help` for the rest.

Configs in `model/` and what each one lets happen:

| Config | Actors and toggles | Why it exists |
|---|---|---|
| `Flow` | one builder, the creator, one request each; no expiry, no reopen | the intended path; passes; draws as a whole chart |
| `StaleSubmit` | b1, b2, the expiry job; no release | isolates a submission landing on another builder's claim (F2) |
| `ExpiryRace` | b1, b2, the expiry job | release, expiry and a second claim crossing without any retry (F1) |
| `ClaimRaces` | b1 with two requests in flight, b2, the expiry job | builder retries on top of the above; peer review by the other builder (F1, F3) |
| `ReviewRetry` | b1 submits once; b2 and the creator each have two requests in flight; one contribution | double review, double accept (F3, F4) |
| `ReviewVsModerate` | b1, b2, the creator, one request each, two contributions | a peer review and a creator decision overlapping (F5) |
| `Reopen` | as above, plus `reopenContributionTaskAction` | reopen with no status guard and no completion sync (F6) |
| `DualKey` | as `ReviewVsModerate` with `requireDualKey` on a large leaf | the dual-key gate holds (`DualKeyHonored` passes) |

## Read the result

Each row is `ok`, `ok (known finding:Fn)`, `REGRESSION`, `CHANGED`, `NEW` or `ERROR`.

- `ok (known finding:Fn)`: the current code breaks this rule and
  `docs/formal-verification/task-lifecycle/FINDINGS.md` already tells that path in
  the code's words. Leave it.
- `REGRESSION`: a rule that held now breaks. Replay the path (below). If every step
  can happen in the code, your change introduced a bug. Do not change the rule.
- `CHANGED`: a known finding no longer reproduces. Either you fixed it, or the model
  no longer describes the code. Confirm in the code which, then update
  `expected.json` and `FINDINGS.md`.
- `NEW`: a cell not in `expected.json`. Add it after you have judged it.
- `ERROR`: TLC did not finish. Read the `.tlc.out` in the output folder. A parse
  error is in the model; an out-of-memory is a bound set too high.

To see a path as a chart in plain words, run `--emit DIR` and give the single-rule
`.cfg` for that cell, with `model/view.mjs` as the view, to the pstack `/statechart`
skill. Read `/statechart` for how to call it; its options change between releases.
The checked-in charts are under `docs/formal-verification/task-lifecycle/charts/`.

## Tell a real bug from a modeling error

Take the path from `summary.md`. For each step, open the statement it names in the
table above and ask: can this statement run at this point, with the database in the
state the previous steps left? Specifically:

1. A `*Read` step followed later by a `*Commit` or `*Write*` step of the same
   session means another request committed between the function's read and its
   write. Check that no lock or transaction in the code covers both. In the covered
   functions, only the statements inside `prisma.$transaction(...)` are atomic; a
   `prisma.x.update` outside one commits on its own.
2. A path with `ExpireRead` needs the claim to be 48 hours old at that moment. The
   model lets any active claim be stale, so the path is real only when the other
   steps can happen around the deadline. Agent loops and page loads make that
   plausible; say so when you report it.
3. Two sessions with the same owner (`b1a`/`b1b`, `b2a`/`b2b`, `cr1`/`cr2`) are one
   person acting twice: a double-click, a retried API call, or a browser action
   racing an agent loop. If the UI or the API blocks that, the path still holds for
   the API and scripts.
4. A path that the code cannot take means the model is wrong. Fix the model to
   match the code, never the other way round, and record the fix here.

## Update the verification when a change is intended

1. Read the changed function top to bottom. For each `await prisma.*`, decide which
   model action it belongs to. One `$transaction` is one action. A new statement
   outside a transaction is a new action, or an extra write inside an existing one
   only if nothing else can commit between them in the code.
2. Edit `model/TaskLifecycle.tla`: change the action's guard or effect, add or remove
   `pc` steps, and keep `Next` a disjunction of every action so TLC names steps.
3. Edit `shape.json` so each sentinel is a line that still exists and still means
   what the action does. Add a sentinel for a new guard.
4. If the change was meant to fix a finding, run the check. The cell should read
   `CHANGED`. Replay once more to confirm the fix is in the code, not in the model,
   then set the cell to `pass` in `expected.json` and move the finding to a "fixed"
   section in `FINDINGS.md` with the commit.
5. Break the fix on a scratch copy (comment out the new guard) and run the narrowed
   check (`--config X --rule Y`) to see the rule fail. A check that never failed on
   the new code is not yet known to cover it. Revert the scratch change.
6. Only then move the `sync-commit` marker at the top of this file to the commit you
   checked. If a cell is `ERROR` or you could not replay, do not move it, and say so.
7. Regenerate the charts for changed paths and replace them under
   `docs/formal-verification/task-lifecycle/charts/`.

Run `/maintain-formal-verification-skill` for changes that skipped this skill.

## Bounds and assumptions

- One leaf task of one project. Parent tasks, `dependsOnJson` blockers, the
  per-project claim cap (`claimSoftCap`) and `bulkAcceptPendingForUser` (a loop over
  `moderateContributionForUser`) are not modeled.
- Rows explored: at most 3 `TaskClaim`, 2 `Contribution`, 3 `ContributionReview`
  per config (`MaxClaims`, `MaxContribs`, `MaxReviews` in each `.cfg`). TLC checks
  the rules in a state at the bound but does not explore past it.
- Peer-review scores are 1 or 5 (`Scores`). `Math.round(avg) >= 3` is modeled
  exactly for those values.
- Reputation and deliverable quality are abstracted: `AllowAutoAccept` lets the
  strong-worker branch be taken or not; `RequireDualKey` stands for
  `project.requireDualKey && estimatedTokens >= dualKeyTokenThreshold`.
- Time is abstracted: any active claim may expire at any step.
- `syncProjectCompletionStatus` is one step, though it reads then writes. Its own
  read/write race is not covered. `FUNDED` and `ACTIVE` are both `ACTIVE`.
- Postgres runs at `READ COMMITTED`, as Prisma's `$transaction` does here: a
  conditional `updateMany` re-evaluates its `where` after a row lock, which is what
  makes `ClaimCommit` and the guard in `SubmitCommit` single steps.
- Notifications, ledger rows, artifacts, `revalidatePath` and webhooks are not
  modeled; they do not change the columns the rules read.
- The founder override and `force dual` note are not modeled.
- Nothing here runs against a database. Each finding was replayed by reading the
  code; `FINDINGS.md` cites the statements.

## Known findings

Six findings, F1 to F6, in `docs/formal-verification/task-lifecycle/FINDINGS.md`.
`expected.json` records which cells they explain. They stay findings until the code
changes; do not weaken a rule or a model guard to clear one.

## Tooling

- TLC from `tla2tools.jar` 1.7.4 (TLC2 2.19), sha256
  `936a262061c914694dfd669a543be24573c45d5aa0ff20a8b96b23d01e050e88`, fetched once
  into `~/.cache/grokforge-formal/` (or `GROKFORGE_TLC_DIR`), or `TLA2TOOLS=/path/to/jar`.
- Java 11 or later. Confirmed with OpenJDK 21.0.12.1.
- Node 18 or later for the runner. Confirmed with Node 22.23.4.
- Charts: pstack `/statechart` (TLC with one worker, Mermaid output), read with its
  own skill.
