# Negative control: the check fails on broken code and passes again after

A check that has never failed proves nothing. Two guards in the real code were each
broken in a scratch edit, the skill was followed as the next agent would follow it,
the break was caught, the scratch edit was discarded, and the baseline was rerun.
Nothing from these edits is in the branch; `git status` was clean in `src/` before
and after.

Both controls were run on 2026-11-08 at commit
`4ef25da2b2ccd4643f6f255ced5330de58142a6c` with the model in this branch.

## Control 1: the dual-key gate in `moderateContributionForUser`

Rule under test: `DualKeyHonored` (holds in every config today).

**Scratch break** in `src/lib/moderation-ops.ts`, line 88:

```diff
-      if (peerCount < 1 && !force) {
+      if (false && peerCount < 1 && !force) {
```

**Step 1, run the check as the skill says** (narrowed to the cell):

```
node .cursor/skills/verify-task-lifecycle/scripts/check.mjs --config DualKey --rule DualKeyHonored
```

Output, shortened:

```
## Code shape (9 sentinels)

The model may no longer describe the code. Re-read the named functions and update
model/TaskLifecycle.tla before trusting the verdicts below:
- src/lib/moderation-ops.ts: no longer contains "if (peerCount < 1 && !force) {"
  -> re-read moderateContributionForUser and model step ModerateRead .. ModerateSync: ...

| DualKey | DualKeyHonored | pass | pass | 172645 | ok (2.7s) |
```

Exit code 2. The verdict table still said pass, because the model still described
the old code; the shape check is what refused to let that pass stand.

**Step 2, update the model to describe the broken code.** `ModerateRead` lost its
dual-key conjunct:

```diff
   /\ \E c \in PendingContribs, decision \in {"accept", "reject"} :
-       /\ decision = "accept" => (~RequireDualKey \/ PeerReviewsOn(c) # {})
        /\ local' = [local EXCEPT ![s] = [kind |-> "moderate", contrib |-> c,
```

Rerun with `--skip-shape`:

```
| DualKey | DualKeyHonored | pass | fail | 104 | REGRESSION: rule held before and breaks now (0.7s) |

- DualKey / DualKeyHonored (5 steps): ClaimCommit -> SubmitRead -> SubmitCommit -> ModerateRead -> ModerateWriteContrib
```

Exit code 1. In the chart's words (`charts/negative-control-1-DualKeyHonored/`):

0. Open
1. a builder claims the task: Claimed
2. a builder sends in work: Claimed · submit in progress
3. the submission is saved: Submitted, in review
4. the creator opens the submission: Submitted, in review · creator decision in progress
5. the creator accepts the submission: Submitted, in review · creator decision in progress

The creator accepted a large leaf on a dual-key project with no peer review, which
is exactly what the removed line prevents.

**Step 3, discard the scratch edit** (`git checkout -- src/lib/moderation-ops.ts`,
restore the conjunct in the model) and rerun:

```
All sentinel lines are present. The model's steps still have their lines in the code.
| DualKey | DualKeyHonored | pass | pass | 172645 | ok (2.6s) |
```

Exit code 0.

## Control 2: the in-transaction claim count in `claimTaskForUser`

Rule under test: `OneActiveClaimPerTask`, the schema's promise. It holds in every
config today, and TLC shows why: the count inside the transaction is what saves it
in the states that F1 leaves behind.

**Scratch break** in `src/lib/task-ops.ts`, line 99 removed:

```diff
       const active = await tx.taskClaim.count({
         where: { taskId: task.id, active: true },
       });
-      if (active !== 0) throw new Error("TASK_NOT_OPEN");
```

**Step 1, run the check:**

```
- src/lib/task-ops.ts: no longer contains "if (active !== 0) throw new Error(\"TASK_NOT_OPEN\");"
  -> re-read claimTaskForUser and model step ClaimCommit: ClaimCommit is one atomic step only
  because the transaction re-checks status OPEN with updateMany and re-counts active claims
```

Exit code 2.

**Step 2, update the model:** `ClaimCommit` loses `/\ ActiveClaims = {}`. Rerun:

```
| ExpiryRace | OneActiveClaimPerTask | pass | fail | 212 | REGRESSION: rule held before and breaks now (0.8s) |

- ExpiryRace / OneActiveClaimPerTask (7 steps): ClaimCommit -> ReleaseRead -> ExpireRead -> ExpireCommit -> ClaimCommit -> ReleaseCommit -> ClaimCommit
```

In the chart's words (`charts/negative-control-2-OneActiveClaimPerTask/`): a builder
asks to release at the deadline, the expiry job expires the claim and reopens the
task, a second builder claims, the late release writes OPEN again (F1c), and a third
claim now succeeds because nothing counts the active claim: two builders hold the
task.

**Step 3, discard** (`git checkout -- src/lib/task-ops.ts`, restore the conjunct)
and rerun:

```
All sentinel lines are present.
| ExpiryRace | OneActiveClaimPerTask | pass | pass | 15509 | ok (1.2s) |
```

Exit code 0.

## What this shows and does not show

It shows that the two guards are load-bearing for the two rules, that the shape
sentinels notice when a guarded line disappears, and that the TLC verdict changes
once the model is made to follow the code. It does not show that every other guard
is load-bearing; a change to a line without a sentinel still needs the next agent to
read the function and update the model by hand, which is what the skill asks for.
