# Leaf-task lifecycle: what the model checker found

Checked at commit `4ef25da2b2ccd4643f6f255ced5330de58142a6c` with TLC 2.19
(`tla2tools.jar` 1.7.4). Model and runner: `.cursor/skills/verify-task-lifecycle/`.
Rerun: `node .cursor/skills/verify-task-lifecycle/scripts/check.mjs`.

Each finding below is a path TLC found and that was then replayed by reading the
code, statement by statement. Line numbers are at the commit above. No product code
was changed; the rules were not weakened. Nothing here was run against a database,
so each finding is "the code admits this order", shown in the code's own statements,
not "this happened in production".

What holds in every config: `OneActiveClaimPerTask` (the schema's promise that a
task has at most one active claim; `claimTaskForUser` enforces it with a conditional
`updateMany` plus a count inside one transaction), `DualKeyHonored` (the dual-key
gate in `moderateContributionForUser` and the `dualBlocks` check in
`submitContributionForUser`), and `TypeOK`. In the `Flow` config (one builder, one
creator, one request at a time, no expiry, no reopen) every rule holds.

Charts for each path are in `charts/`. Numbers in brackets are the step numbers in
the matching `report.md`.

---

## F1. `releaseClaimForUser` writes a task status it read before its transaction

**Rule broken:** `PendingMeansSubmitted`, `ActiveClaimMeansClaimed`, and through
them `AtMostOnePending`, `AcceptedMeansDone`, `AtMostOneAccepted`,
`ProjectTracksTask`.

**Harm in one sentence:** a release that arrives a moment after a submit, an
expiry, or another release flips the task back to OPEN under whatever is there now:
a pending submission nobody will see as the task's, or another builder's fresh
claim, who then cannot submit.

**Where:** `src/lib/task-ops.ts` `releaseClaimForUser`. The active claim is read
at line 159 (`taskClaim.findFirst`) and `otherActive` at line 165, both before the
`$transaction` at line 173. Inside it, line 178 `task.update` sets
`status: otherActive > 0 ? CLAIMED : OPEN` (line 181) with no `where` on the current
status and no check that the claim is still active.

**Path (a), release races the same builder's submit** (config `ClaimRaces`,
`ReviewRetry`; chart `ClaimRaces__PendingMeansSubmitted`, 5 steps):

1. Builder claims the task: `claimTaskForUser` transaction, lines 90-119. Task
   CLAIMED, claim active.
2. The builder's browser calls release: `releaseClaimForUser` reads the active claim
   (159) and `otherActive = 0` (165).
3. The same builder's agent loop calls submit: `submitContributionForUser` reads the
   task with the active claim (lines 261-272).
4. The submit transaction commits (336-393): task SUBMITTED, contribution PENDING,
   claim inactive.
5. The release transaction commits (173-193): claim already inactive, `task.update`
   sets OPEN. Result: task OPEN, one PENDING contribution. The review queue shows
   the work; the task board offers the leaf to everyone else.

**Path (b), two releases from the same builder** (config `ClaimRaces`,
`ReviewRetry`; chart `ClaimRaces__ActiveClaimMeansClaimed`, 6 steps): two release
requests both read the active claim (159). The first commits and reopens the task.
Another builder claims it (`claimTaskForUser`, task CLAIMED, new claim active). The
second release commits and sets OPEN again. Result: task OPEN while the new builder
holds an active claim. Their later submit fails at line 341 with
"Task is no longer claimed by you"; `claimTaskForUser` for anyone else fails at
line 99 because an active claim exists. The stranded builder can only release.

**Path (c), release races expiry, no retry needed** (config `ExpiryRace`; chart
`ExpiryRace__ActiveClaimMeansClaimed`, 6 steps): the builder clicks release at the
48-hour mark (159, 165). A page load of `/tasks` or the cron runs `expireStaleClaims`
on the same claim (`expire-claims.ts` lines 24-39, 50, 58-85): claim inactive, task
OPEN. Another builder claims. The release transaction commits and sets OPEN. Same
result as (b).

**Cascades** TLC found from the state left by (a): the builder claims again and
submits again, so two PENDING contributions exist for one leaf (`AtMostOnePending`,
8 steps); with strong-worker auto-accept the first submit was ACCEPTED and the
release left an ACCEPTED contribution on an OPEN task, and the project COMPLETED
(`AcceptedMeansDone`, `ProjectTracksTask`, 6 steps); a second accepted submit then
gives two accepted deliverables (`AtMostOneAccepted`, 8 steps).

**How likely:** the window is between line 165 and line 173, two round trips to
Neon. (a) and (b) need the same person acting twice at once: a browser button and an
agent loop, or a double-click. (c) needs only a release near the deadline while a
page load runs expiry. Agent loops re-claim reopened leaves within seconds, which is
what makes (b) and (c) bite.

**Shape of a fix (not applied):** make the task write conditional on the state the
transaction can see, for example `updateMany({ where: { id, status: CLAIMED } })`
guarded by the claim still being active inside the transaction, as
`expireStaleClaims` already does with `stillActive`.

---

## F2. `submitContributionForUser` accepts a submission on another builder's claim

**Rule broken:** `ActiveClaimMeansClaimed`.

**Harm in one sentence:** a builder whose claim expired mid-submit still lands their
work, and the builder who holds the task now can never submit theirs.

**Where:** `src/lib/task-ops.ts` `submitContributionForUser`. The caller's active
claim is read at lines 261-272. The transaction at 336-393 checks only that the task
is CLAIMED (`updateMany` at 337-341, `where: { id, status: CLAIMED }`). It deactivates
the caller's claim with `updateMany` at 354-357 and never checks how many rows that
touched.

**Path** (config `StaleSubmit`; chart `StaleSubmit__ActiveClaimMeansClaimed`,
6 steps):

1. Builder b1 claims (task CLAIMED, claim c1 active).
2. b1 submits 48 hours later: the read at 261-272 still sees c1 active.
3. `expireStaleClaims` picks up c1 (`expire-claims.ts` 24-39, 50).
4. Its transaction commits (58-85): c1 inactive, task OPEN.
5. Builder b2 claims (task CLAIMED, claim c2 active).
6. b1's submit transaction commits: `updateMany` at 337 finds the task CLAIMED (by
   b2), so `moved.count === 1`; contribution created for b1 against c1; the
   `updateMany` at 354 touches zero rows. Result: task SUBMITTED with b1's work, b2
   holds an active claim on a task that is not CLAIMED.

b2's submit then fails at 341. If b2 releases, F1(a)'s state follows: task OPEN with
b1's PENDING work.

**How likely:** needs the submit to be in flight exactly when the claim turns stale
and a page load or cron runs expiry, and a claim by someone else inside the same
window. Agent loops make the last step fast; the first two need the deadline.

**Shape of a fix (not applied):** inside the transaction, deactivate the claim with
`updateMany({ where: { id: claimId, userId, active: true } })` and abort when
`count !== 1`, the same pattern the function already uses for the task row.

---

## F3. Two concurrent peer reviews by the same reviewer both count

**Rule broken:** `OneReviewPerReviewer`; with both reviews accepting,
`CreditPaidOnce`.

**Harm in one sentence:** a double-click or a retried API call stores two reviews
from one reviewer, pays the reviewer +2 twice, and can pay the author +5 twice.

**Where:** `src/lib/peer-review-ops.ts` `peerReviewContributionForUser`. The
"one review per reviewer" check is `contributionReview.findFirst` at line 47; the
insert is at line 54; nothing is in a transaction, and `prisma/schema.prisma` has no
unique index on `ContributionReview (contributionId, reviewerId)`.

**Path** (config `ReviewRetry`, `ClaimRaces`; chart
`ReviewRetry__OneReviewPerReviewer`, 7 steps): after a claim and a submit, two
requests from reviewer b2 both pass line 39 (PENDING), line 42 (not the author) and
line 47 (no earlier review), then both insert at line 54. Each then continues: +2 at
line 63, `findMany` at 78 sees both rows, each writes the verdict at 86 and 94, and
each pays +5 at line 100 when accepted (`ClaimRaces__CreditPaidOnce`, 15 steps).

**How likely:** any double submit of the review form, or an agent that retries on a
slow response, since `/api/v1/contributions/:id/review` is open to every token
holder.

**Shape of a fix (not applied):** a unique index on
`ContributionReview (contributionId, reviewerId)` makes the second insert fail;
`shape.json` records that this index is absent so the model is updated when it
appears.

---

## F4. Two concurrent creator decisions on one submission both apply

**Rule broken:** `CreditPaidOnce`.

**Harm in one sentence:** a double-clicked Accept, or a bulk-accept overlapping a
single accept, pays the author +5 twice, writes two ledger rows and two creator
reviews.

**Where:** `src/lib/moderation-ops.ts` `moderateContributionForUser`. The PENDING
check is line 55; the writes are `contribution.update` at 96, `task.update` at 104,
reputation +5 at 112, `contributionReview.create` at 118, and
`syncProjectCompletionStatus` at 164. No transaction, no `where` on the current
status.

**Path** (config `ReviewRetry`; chart `ReviewRetry__CreditPaidOnce`, 11 steps):
two creator requests both read the contribution as PENDING (55). Each runs 96, 104
and 112. The author's reputation goes up by 10.

**How likely:** a double-click in the cockpit or on `/c/[id]`, or
`bulkAcceptPendingForUser` (which loops over this function, line 292) running while
the creator clicks Accept on one item.

**Shape of a fix (not applied):** make the first write conditional:
`contribution.updateMany({ where: { id, status: "PENDING" } })` and stop when it
touches zero rows, then the rest.

---

## F5. A peer review and a creator decision on the same submission overlap

**Rule broken:** `AcceptedMeansDone`, `CreditPaidOnce`, `AtMostOneAccepted`,
`ActiveClaimMeansClaimed`, `PendingMeansSubmitted`, `AtMostOnePending`,
`ProjectTracksTask`.

**Harm in one sentence:** the last writer wins on the contribution and on the task
separately, so the verdict can flip after reputation was paid, a rejected submission
can turn into a second accepted deliverable, and a builder who re-claimed the leaf
after the reject is stranded.

**Where:** `peer-review-ops.ts` lines 39-110 and `moderation-ops.ts` lines 55-164,
both as above. The peer-review path has a network call between its idempotency check
and its verdict writes: `notifyUser` at line 69 posts to `NOTIFY_WEBHOOK_URL` when it
is set, so the window is not two database round trips but a webhook's latency.

**Path for two accepted deliverables** (config `ReviewVsModerate`; chart
`ReviewVsModerate__AtMostOneAccepted`, 18 steps):

1. b1 claims and submits c1 (PENDING, task SUBMITTED).
2. Reviewer b2 opens c1 (peer-review-ops 39-52), saves a review with score 5 (54),
   computes `avg = 5`, `accepted = true` (78-85).
3. The creator opens c1 and rejects: PENDING check passes (55).
4. The creator's reject writes c1 REJECTED (96).
5. The peer review writes c1 ACCEPTED (86), overwriting the reject.
6. The creator's reject writes the task OPEN (104).
7. b1 claims again and submits c2 (PENDING). Task SUBMITTED.
8. The peer review's remaining statements run (task write at 94 sets ACCEPTED, +5 at
   100); the creator's `contributionReview.create` and sync run.
9. The creator opens c2 and accepts: c2 ACCEPTED (96). Now c1 and c2 are both
   ACCEPTED on one leaf; `sealProjectForUser` and the skill pack include both.

**Shorter variants:** creator accepts (task ACCEPTED, +5 paid) while a peer review
with score 1 is in flight; the review then writes c1 REJECTED and task OPEN: the
author keeps the +5 on a rejected submission and the project flips back
(`CreditPaidOnce`, 13 steps). Or the review reopens the task, b1 re-claims, and the
creator's late `task.update` sets ACCEPTED under b1's active claim
(`ActiveClaimMeansClaimed`, 17 steps).

**How likely:** a peer reviewer and the creator looking at the same new submission
is the normal case on an active project; the window is the whole peer-review
handler, including a webhook call.

**Shape of a fix (not applied):** one conditional first write per decision path
(`updateMany` on `status: "PENDING"`), and the task write in the same transaction.

---

## F6. `reopenContributionTaskAction` ignores the current task state and skips completion sync

**Rule broken:** `ActiveClaimMeansClaimed`, `ProjectTracksTask`,
`PendingMeansSubmitted`, `AtMostOnePending`, `AcceptedMeansDone`,
`AtMostOneAccepted`.

**Harm in one sentence:** the creator's Reopen button sets the task OPEN whatever
is going on, which strands a builder who holds the claim, and leaves a project
COMPLETED and sealable with an open leaf. No race is needed.

**Where:** `src/lib/expansion-actions.ts` `reopenContributionTaskAction`. The
transaction at 256-277 sets the contribution REJECTED (257-263, any prior status) and
the task OPEN (264-267, any prior status). `syncProjectCompletionStatus` is not
called. The UI shows Reopen to the creator on every contribution page
(`src/app/c/[id]/page.tsx`, `canReopen` at line 110 checks only identity).

**Path for a stranded builder** (config `Reopen`; chart
`Reopen__ActiveClaimMeansClaimed`, 6 steps): b1 submits c1; the creator reopens c1
(task OPEN); b2 claims (task CLAIMED, claim active); the creator reopens c1 again
(or any other contribution of the task): task OPEN while b2's claim is active. b2's
submit fails at `task-ops.ts` 341.

**Path for a sealable project with open work** (chart `Reopen__ProjectTracksTask`,
10 steps): b1 submits c1; the creator accepts (task ACCEPTED, project COMPLETED at
`project-completion.ts` 136-155); the creator reopens c1: task OPEN, project still
COMPLETED. `sealProjectForUser` (`seal-ops.ts` line 209) passes because
`project.status === "COMPLETED"`, and the ship page lists the project as complete.

**How likely:** sequential and reachable from the UI; it depends only on the
creator pressing Reopen at those moments.

**Shape of a fix (not applied):** guard the task write on the statuses reopen is
meant for (SUBMITTED or ACCEPTED with no active claim), and call
`syncProjectCompletionStatus` after the transaction, as every other verdict path
does.

---

## Negative control

The check has been seen to fail on a broken variant of the code it guards, then
pass again once the break was removed. Transcript in `NEGATIVE-CONTROL.md`.

## Not covered

See "Bounds and assumptions" in `.cursor/skills/verify-task-lifecycle/SKILL.md`.
In short: one leaf, one project, no parent tasks or `dependsOnJson`, bounded rows
(3 claims, 2 contributions, 3 reviews), scores 1 or 5, time abstracted so any claim
may expire, `syncProjectCompletionStatus` as one step, no founder override, no
`bulkAcceptPendingForUser` loop as its own actor, no database run.
