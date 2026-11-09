---------------------------- MODULE TaskLifecycle ----------------------------
(***************************************************************************)
(* GrokForge leaf-task lifecycle, as implemented in                        *)
(*                                                                         *)
(*   src/lib/task-ops.ts           claimTaskForUser, releaseClaimForUser,  *)
(*                                 submitContributionForUser               *)
(*   src/lib/expire-claims.ts      expireStaleClaims                       *)
(*   src/lib/peer-review-ops.ts    peerReviewContributionForUser           *)
(*   src/lib/moderation-ops.ts     moderateContributionForUser             *)
(*   src/lib/expansion-actions.ts  reopenContributionTaskAction            *)
(*   src/lib/project-completion.ts syncProjectCompletionStatus             *)
(*                                                                         *)
(* One leaf task of one project. Every Prisma statement that commits on   *)
(* its own is one step here; every prisma.$transaction is one step here.  *)
(* Reads that a function does before its transaction are a separate step  *)
(* when a later write depends on them, because another request can commit *)
(* between the read and the write.                                         *)
(*                                                                         *)
(* A "session" is one in-flight request handler: a browser action, an     *)
(* Agent API call, a cron tick, or a page load that runs expireStaleClaims.*)
(* Two sessions with the same Owner are the same person acting twice      *)
(* (double-click, retry, UI plus agent loop).                              *)
(***************************************************************************)
EXTENDS Naturals, Sequences, FiniteSets, TLC

CONSTANTS
  Builders,        \* builder user ids (claim, submit, peer review)
  Creator,         \* the project proposer (moderates, reopens)
  Cron,            \* pseudo-user for callers of expireStaleClaims
  Sessions,        \* concurrent request handlers
  Owner,           \* Sessions -> Builders \cup {Creator, Cron}
  Scores,          \* peer-review scores a reviewer may give, subset of 1..5
  MaxClaims,       \* bound on TaskClaim rows explored
  MaxContribs,     \* bound on Contribution rows explored
  MaxReviews,      \* bound on ContributionReview rows explored
  RequireDualKey,  \* project.requireDualKey and the leaf is "large"
  AllowAutoAccept, \* the submitter may be a strong worker (canQualityAutoAccept)
  ReopenEnabled,   \* reopenContributionTaskAction is reachable
  ReleaseEnabled,  \* releaseClaimForUser is reachable
  ExpiryEnabled    \* expireStaleClaims is reachable

ASSUME Scores \subseteq 1..5 /\ Scores # {}
ASSUME \A s \in Sessions : Owner[s] \in Builders \cup {Creator, Cron}

VARIABLES
  taskStatus,    \* Task.status: OPEN | CLAIMED | SUBMITTED | ACCEPTED
  projectStatus, \* Project.status collapsed to ACTIVE | COMPLETED
  claims,        \* TaskClaim rows: Seq of [user, active]
  contribs,      \* Contribution rows: Seq of [user, claim, status, credits]
                 \*   credits = how many times the author was paid the
                 \*   acceptance reputation (+5, or +6 on strong-worker accept)
  reviews,       \* ContributionReview rows: Seq of [contrib, reviewer, score]
  pc,            \* Sessions -> which statement the handler will run next
  local          \* Sessions -> what the handler read before its next write

vars == <<taskStatus, projectStatus, claims, contribs, reviews, pc, local>>

(***************************************************************************)
(* Shared views of the database                                            *)
(***************************************************************************)
ActiveClaims     == {i \in DOMAIN claims : claims[i].active}
ActiveClaimsOf(u) == {i \in ActiveClaims : claims[i].user = u}
PendingContribs  == {c \in DOMAIN contribs : contribs[c].status = "PENDING"}
AcceptedContribs == {c \in DOMAIN contribs : contribs[c].status = "ACCEPTED"}
ReviewsOn(c)     == {r \in DOMAIN reviews : reviews[r].contrib = c}
PeerReviewsOn(c) == {r \in ReviewsOn(c) : reviews[r].reviewer # contribs[c].user}
HasReviewed(u, c) == \E r \in ReviewsOn(c) : reviews[r].reviewer = u

Idle == \A s \in Sessions : pc[s] = "idle"

NoLocal == [kind |-> "none"]

RECURSIVE SumScores(_)
SumScores(S) ==
  IF S = {} THEN 0
  ELSE LET r == CHOOSE r \in S : TRUE
       IN reviews[r].score + SumScores(S \ {r})

\* peer-review-ops.ts: Math.round(sum / n), n >= 1
RoundedAvg(c) ==
  LET rs == ReviewsOn(c)
  IN (2 * SumScores(rs) + Cardinality(rs)) \div (2 * Cardinality(rs))

\* project-completion.ts syncProjectCompletionStatus for a one-leaf project:
\* fullyComplete <=> the leaf is ACCEPTED. FUNDED and ACTIVE both read as ACTIVE.
SyncedProject == IF taskStatus = "ACCEPTED" THEN "COMPLETED" ELSE "ACTIVE"

\* task-ops.ts submitContributionForUser: strong-worker auto-accept needs
\* canQualityAutoAccept(reputation), quality.agent, strength >= 70, and
\* !(requireDualKey && large). Reputation and quality are abstracted to a
\* nondeterministic choice; the dual-key block is kept.
AutoAcceptChoices == IF AllowAutoAccept /\ ~RequireDualKey THEN BOOLEAN ELSE {FALSE}

(***************************************************************************)
(* Init                                                                    *)
(***************************************************************************)
Init ==
  /\ taskStatus = "OPEN"
  /\ projectStatus = "ACTIVE"
  /\ claims = <<>>
  /\ contribs = <<>>
  /\ reviews = <<>>
  /\ pc = [s \in Sessions |-> "idle"]
  /\ local = [s \in Sessions |-> NoLocal]

(***************************************************************************)
(* claimTaskForUser (task-ops.ts)                                          *)
(*                                                                         *)
(* The reads before the $transaction (task.status === OPEN, dependsOnJson, *)
(* capacity guard) only decide whether to return an error early. The       *)
(* $transaction re-checks everything it needs: updateMany({id, status:     *)
(* OPEN} -> CLAIMED) must touch one row, then count(active claims) must be *)
(* 0, else TASK_NOT_OPEN rolls everything back. So the whole call is one   *)
(* step whose guard is the transaction's guard. The capacity guard is per  *)
(* project and never binds with one task, so it is left out.               *)
(***************************************************************************)
ClaimCommit(s) ==
  LET u == Owner[s] IN
  /\ u \in Builders
  /\ pc[s] = "idle"
  /\ taskStatus = "OPEN"
  /\ ActiveClaims = {}
  /\ taskStatus' = "CLAIMED"
  /\ claims' = Append(claims, [user |-> u, active |-> TRUE])
  /\ UNCHANGED <<projectStatus, contribs, reviews, pc, local>>

(***************************************************************************)
(* releaseClaimForUser (task-ops.ts)                                       *)
(*                                                                         *)
(* Read step: taskClaim.findFirst({taskId, userId, active: true}) and      *)
(* taskClaim.count(other active). Both happen before the $transaction.     *)
(* Write step: $transaction([claim.update(active: false),                  *)
(* task.update(status: otherActive > 0 ? CLAIMED : OPEN), ledger]). The    *)
(* task.update has no status guard.                                        *)
(***************************************************************************)
ReleaseRead(s) ==
  LET u == Owner[s] IN
  /\ ReleaseEnabled
  /\ u \in Builders
  /\ pc[s] = "idle"
  /\ \E i \in ActiveClaimsOf(u) :
       local' = [local EXCEPT ![s] = [kind |-> "release", claim |-> i,
                                       otherActive |-> Cardinality(ActiveClaims \ {i})]]
  /\ pc' = [pc EXCEPT ![s] = "release"]
  /\ UNCHANGED <<taskStatus, projectStatus, claims, contribs, reviews>>

ReleaseCommit(s) ==
  /\ pc[s] = "release"
  /\ LET l == local[s] IN
       /\ claims' = [claims EXCEPT ![l.claim].active = FALSE]
       /\ taskStatus' = IF l.otherActive > 0 THEN "CLAIMED" ELSE "OPEN"
  /\ pc' = [pc EXCEPT ![s] = "idle"]
  /\ local' = [local EXCEPT ![s] = NoLocal]
  /\ UNCHANGED <<projectStatus, contribs, reviews>>

(***************************************************************************)
(* submitContributionForUser (task-ops.ts)                                 *)
(*                                                                         *)
(* Read step: task.findUnique with the caller's active claim (take 1);     *)
(* task.status must be CLAIMED, OPEN or SUBMITTED; secret scan, quality    *)
(* gate and the strong-worker decision. All before the $transaction.       *)
(* Write step: $transaction: updateMany({id, status: CLAIMED} -> nextStatus)*)
(* must touch one row, else TASK_STATUS_CHANGED rolls everything back;     *)
(* contribution.create(claimId, status PENDING or ACCEPTED);               *)
(* taskClaim.updateMany({id: claimId, userId, active: true} -> false);      *)
(* artifact.create; ledger; user.update(reputation + (auto ? 6 : 1)).      *)
(* On auto-accept the call then runs syncProjectCompletionStatus.          *)
(***************************************************************************)
SubmitRead(s) ==
  LET u == Owner[s] IN
  /\ u \in Builders
  /\ pc[s] = "idle"
  /\ taskStatus \in {"CLAIMED", "OPEN", "SUBMITTED"}
  /\ \E i \in ActiveClaimsOf(u), auto \in AutoAcceptChoices :
       local' = [local EXCEPT ![s] = [kind |-> "submit", claim |-> i, auto |-> auto]]
  /\ pc' = [pc EXCEPT ![s] = "submit"]
  /\ UNCHANGED <<taskStatus, projectStatus, claims, contribs, reviews>>

SubmitCommit(s) ==
  /\ pc[s] = "submit"
  /\ LET l == local[s]
         u == Owner[s]
     IN IF taskStatus = "CLAIMED"
        THEN /\ taskStatus' = IF l.auto THEN "ACCEPTED" ELSE "SUBMITTED"
             /\ contribs' = Append(contribs,
                              [user |-> u, claim |-> l.claim,
                               status |-> IF l.auto THEN "ACCEPTED" ELSE "PENDING",
                               credits |-> IF l.auto THEN 1 ELSE 0])
             /\ claims' = [claims EXCEPT ![l.claim].active = FALSE]
             /\ pc' = [pc EXCEPT ![s] = IF l.auto THEN "submit_sync" ELSE "idle"]
        ELSE /\ pc' = [pc EXCEPT ![s] = "idle"]
             /\ UNCHANGED <<taskStatus, contribs, claims>>
  /\ local' = [local EXCEPT ![s] = NoLocal]
  /\ UNCHANGED <<projectStatus, reviews>>

SubmitSync(s) ==
  /\ pc[s] = "submit_sync"
  /\ projectStatus' = SyncedProject
  /\ pc' = [pc EXCEPT ![s] = "idle"]
  /\ UNCHANGED <<taskStatus, claims, contribs, reviews, local>>

(***************************************************************************)
(* expireStaleClaims (expire-claims.ts)                                    *)
(*                                                                         *)
(* Runs from the cron route and from page loads of /tasks and              *)
(* /projects/[slug]. Read step: findMany(active, expiresAt <= now) and, per *)
(* claim, taskClaim.count(other active), before that claim's $transaction. *)
(* Write step: $transaction: claim.update(active: false);                  *)
(* stillActive = count(active); if otherActive = 0 and stillActive = 0:    *)
(* updateMany({id, status: CLAIMED} -> OPEN); ledger.                      *)
(* Time is abstracted: any active claim may be stale. In the code a claim  *)
(* is stale 48 hours after claimedAt, so a path with ExpireRead happens    *)
(* only when the other steps run around the deadline.                      *)
(***************************************************************************)
ExpireRead(s) ==
  /\ ExpiryEnabled
  /\ Owner[s] = Cron
  /\ pc[s] = "idle"
  /\ \E i \in ActiveClaims :
       local' = [local EXCEPT ![s] = [kind |-> "expire", claim |-> i,
                                       otherActive |-> Cardinality(ActiveClaims \ {i})]]
  /\ pc' = [pc EXCEPT ![s] = "expire"]
  /\ UNCHANGED <<taskStatus, projectStatus, claims, contribs, reviews>>

ExpireCommit(s) ==
  /\ pc[s] = "expire"
  /\ LET l == local[s]
         claims2 == [claims EXCEPT ![l.claim].active = FALSE]
         stillActive == Cardinality({i \in DOMAIN claims2 : claims2[i].active})
     IN /\ claims' = claims2
        /\ taskStatus' = IF l.otherActive = 0 /\ stillActive = 0 /\ taskStatus = "CLAIMED"
                         THEN "OPEN" ELSE taskStatus
  /\ pc' = [pc EXCEPT ![s] = "idle"]
  /\ local' = [local EXCEPT ![s] = NoLocal]
  /\ UNCHANGED <<projectStatus, contribs, reviews>>

(***************************************************************************)
(* peerReviewContributionForUser (peer-review-ops.ts)                      *)
(*                                                                         *)
(* No transaction. Each statement commits on its own, in this order:       *)
(*   read: contribution must be PENDING, reviewer is not the author,       *)
(*         contributionReview.findFirst(reviewer) must be null             *)
(*   contributionReview.create; user.update(reviewer +2)                   *)
(*   contributionReview.findMany; avg = Math.round(mean); accepted = avg>=3 *)
(*   contribution.update(score, status: accepted ? ACCEPTED : REJECTED)    *)
(*   task.update(status: accepted ? ACCEPTED : OPEN)                       *)
(*   if accepted: user.update(author +5)                                   *)
(*   syncProjectCompletionStatus; ledger; notifications                    *)
(* Neither update checks the current status.                               *)
(***************************************************************************)
PeerReviewRead(s) ==
  LET u == Owner[s] IN
  /\ u \in Builders
  /\ pc[s] = "idle"
  /\ \E c \in PendingContribs, score \in Scores :
       /\ contribs[c].user # u
       /\ ~HasReviewed(u, c)
       /\ local' = [local EXCEPT ![s] = [kind |-> "review", contrib |-> c,
                                          score |-> score, accepted |-> FALSE]]
  /\ pc' = [pc EXCEPT ![s] = "pr_create"]
  /\ UNCHANGED <<taskStatus, projectStatus, claims, contribs, reviews>>

PeerReviewCreate(s) ==
  /\ pc[s] = "pr_create"
  /\ reviews' = Append(reviews, [contrib |-> local[s].contrib,
                                 reviewer |-> Owner[s], score |-> local[s].score])
  /\ pc' = [pc EXCEPT ![s] = "pr_avg"]
  /\ UNCHANGED <<taskStatus, projectStatus, claims, contribs, local>>

PeerReviewAvg(s) ==
  /\ pc[s] = "pr_avg"
  /\ local' = [local EXCEPT ![s].accepted = RoundedAvg(local[s].contrib) >= 3]
  /\ pc' = [pc EXCEPT ![s] = "pr_contrib"]
  /\ UNCHANGED <<taskStatus, projectStatus, claims, contribs, reviews>>

PeerReviewWriteContrib(s) ==
  /\ pc[s] = "pr_contrib"
  /\ contribs' = [contribs EXCEPT ![local[s].contrib].status =
                    IF local[s].accepted THEN "ACCEPTED" ELSE "REJECTED"]
  /\ pc' = [pc EXCEPT ![s] = "pr_task"]
  /\ UNCHANGED <<taskStatus, projectStatus, claims, reviews, local>>

PeerReviewWriteTask(s) ==
  /\ pc[s] = "pr_task"
  /\ taskStatus' = IF local[s].accepted THEN "ACCEPTED" ELSE "OPEN"
  /\ pc' = [pc EXCEPT ![s] = "pr_credit"]
  /\ UNCHANGED <<projectStatus, claims, contribs, reviews, local>>

PeerReviewCredit(s) ==
  /\ pc[s] = "pr_credit"
  /\ contribs' = IF local[s].accepted
                 THEN [contribs EXCEPT ![local[s].contrib].credits = @ + 1]
                 ELSE contribs
  /\ pc' = [pc EXCEPT ![s] = "pr_sync"]
  /\ UNCHANGED <<taskStatus, projectStatus, claims, reviews, local>>

PeerReviewSync(s) ==
  /\ pc[s] = "pr_sync"
  /\ projectStatus' = SyncedProject
  /\ pc' = [pc EXCEPT ![s] = "idle"]
  /\ local' = [local EXCEPT ![s] = NoLocal]
  /\ UNCHANGED <<taskStatus, claims, contribs, reviews>>

(***************************************************************************)
(* moderateContributionForUser (moderation-ops.ts)                         *)
(*                                                                         *)
(* No transaction. Each statement commits on its own, in this order:       *)
(*   read: contribution with reviews must be PENDING; caller is creator    *)
(*         (or founder override); on accept with requireDualKey and a      *)
(*         large leaf, at least one review by a non-author must exist      *)
(*   contribution.update(status: accepted ? ACCEPTED : REJECTED, score)    *)
(*   task.update(status: accepted ? ACCEPTED : OPEN)                       *)
(*   if accepted: user.update(author +5)                                   *)
(*   if author is not the caller: contributionReview.create(caller, score) *)
(*   ledger; notification; syncProjectCompletionStatus                     *)
(* Neither update checks the current status. bulkAcceptPendingForUser is a *)
(* loop over this function and is not modeled on its own.                  *)
(***************************************************************************)
ModerateRead(s) ==
  /\ Owner[s] = Creator
  /\ pc[s] = "idle"
  /\ \E c \in PendingContribs, decision \in {"accept", "reject"} :
       /\ decision = "accept" => (~RequireDualKey \/ PeerReviewsOn(c) # {})
       /\ local' = [local EXCEPT ![s] = [kind |-> "moderate", contrib |-> c,
                                          accepted |-> decision = "accept"]]
  /\ pc' = [pc EXCEPT ![s] = "mod_contrib"]
  /\ UNCHANGED <<taskStatus, projectStatus, claims, contribs, reviews>>

ModerateWriteContrib(s) ==
  /\ pc[s] = "mod_contrib"
  /\ contribs' = [contribs EXCEPT ![local[s].contrib].status =
                    IF local[s].accepted THEN "ACCEPTED" ELSE "REJECTED"]
  /\ pc' = [pc EXCEPT ![s] = "mod_task"]
  /\ UNCHANGED <<taskStatus, projectStatus, claims, reviews, local>>

ModerateWriteTask(s) ==
  /\ pc[s] = "mod_task"
  /\ taskStatus' = IF local[s].accepted THEN "ACCEPTED" ELSE "OPEN"
  /\ pc' = [pc EXCEPT ![s] = "mod_credit"]
  /\ UNCHANGED <<projectStatus, claims, contribs, reviews, local>>

ModerateCredit(s) ==
  /\ pc[s] = "mod_credit"
  /\ contribs' = IF local[s].accepted
                 THEN [contribs EXCEPT ![local[s].contrib].credits = @ + 1]
                 ELSE contribs
  /\ pc' = [pc EXCEPT ![s] = "mod_review"]
  /\ UNCHANGED <<taskStatus, projectStatus, claims, reviews, local>>

ModerateReview(s) ==
  /\ pc[s] = "mod_review"
  /\ reviews' = IF contribs[local[s].contrib].user # Owner[s]
                THEN Append(reviews, [contrib |-> local[s].contrib,
                                      reviewer |-> Owner[s],
                                      score |-> IF local[s].accepted THEN 5 ELSE 2])
                ELSE reviews
  /\ pc' = [pc EXCEPT ![s] = "mod_sync"]
  /\ UNCHANGED <<taskStatus, projectStatus, claims, contribs, local>>

ModerateSync(s) ==
  /\ pc[s] = "mod_sync"
  /\ projectStatus' = SyncedProject
  /\ pc' = [pc EXCEPT ![s] = "idle"]
  /\ local' = [local EXCEPT ![s] = NoLocal]
  /\ UNCHANGED <<taskStatus, claims, contribs, reviews>>

(***************************************************************************)
(* reopenContributionTaskAction (expansion-actions.ts)                     *)
(*                                                                         *)
(* One $transaction: contribution.update(status: REJECTED, reopenedAt);    *)
(* task.update(status: OPEN); ledger. No guard on the contribution's or    *)
(* the task's current status, and no syncProjectCompletionStatus after.    *)
(***************************************************************************)
Reopen(s) ==
  /\ ReopenEnabled
  /\ Owner[s] = Creator
  /\ pc[s] = "idle"
  /\ \E c \in DOMAIN contribs :
       contribs' = [contribs EXCEPT ![c].status = "REJECTED"]
  /\ taskStatus' = "OPEN"
  /\ UNCHANGED <<projectStatus, claims, reviews, pc, local>>

(***************************************************************************)
(* Next                                                                    *)
(***************************************************************************)
Next ==
  \E s \in Sessions :
    \/ ClaimCommit(s)
    \/ ReleaseRead(s) \/ ReleaseCommit(s)
    \/ SubmitRead(s) \/ SubmitCommit(s) \/ SubmitSync(s)
    \/ ExpireRead(s) \/ ExpireCommit(s)
    \/ PeerReviewRead(s) \/ PeerReviewCreate(s) \/ PeerReviewAvg(s)
    \/ PeerReviewWriteContrib(s) \/ PeerReviewWriteTask(s)
    \/ PeerReviewCredit(s) \/ PeerReviewSync(s)
    \/ ModerateRead(s) \/ ModerateWriteContrib(s) \/ ModerateWriteTask(s)
    \/ ModerateCredit(s) \/ ModerateReview(s) \/ ModerateSync(s)
    \/ Reopen(s)

Spec == Init /\ [][Next]_vars

\* Bound on rows explored. TLC still checks the rules in a state past the
\* bound; it does not explore that state's successors.
StateBound ==
  /\ Len(claims) <= MaxClaims
  /\ Len(contribs) <= MaxContribs
  /\ Len(reviews) <= MaxReviews

(***************************************************************************)
(* Rules                                                                   *)
(*                                                                         *)
(* Rules that start with "Idle =>" are checked only when no request is in  *)
(* flight: they describe what the database promises between requests, not *)
(* the middle of a multi-statement handler.                                *)
(***************************************************************************)
TypeOK ==
  /\ taskStatus \in {"OPEN", "CLAIMED", "SUBMITTED", "ACCEPTED"}
  /\ projectStatus \in {"ACTIVE", "COMPLETED"}
  /\ \A i \in DOMAIN claims : claims[i].user \in Builders /\ claims[i].active \in BOOLEAN
  /\ \A c \in DOMAIN contribs :
       /\ contribs[c].user \in Builders
       /\ contribs[c].claim \in DOMAIN claims
       /\ contribs[c].status \in {"PENDING", "ACCEPTED", "REJECTED"}
       /\ contribs[c].credits \in Nat
  /\ \A r \in DOMAIN reviews :
       /\ reviews[r].contrib \in DOMAIN contribs
       /\ reviews[r].reviewer \in Builders \cup {Creator}
       /\ reviews[r].score \in 1..5

\* prisma/schema.prisma on TaskClaim: "One active claim per task is enforced
\* in claimTaskForUser." Harm if broken: two builders do the same work.
OneActiveClaimPerTask == Cardinality(ActiveClaims) <= 1

\* A builder who holds an active claim can submit it: the task is CLAIMED,
\* which is what submitContributionForUser's transaction requires. And a
\* CLAIMED task has a holder. Harm if broken: a builder finishes work and
\* submit answers "Task is no longer claimed by you", or a task shows
\* CLAIMED forever with nobody able to release it.
ActiveClaimMeansClaimed == Idle => ((ActiveClaims # {}) <=> taskStatus = "CLAIMED")

\* Work waiting for review parks the task as SUBMITTED, and a SUBMITTED task
\* has work waiting. Harm if broken: a pending submission sits in the queue
\* while the task is OPEN and someone else re-does it, or a task is stuck
\* SUBMITTED with nothing to review.
PendingMeansSubmitted == Idle => ((PendingContribs # {}) <=> taskStatus = "SUBMITTED")

\* One submission at a time per task.
AtMostOnePending == Cardinality(PendingContribs) <= 1

\* An ACCEPTED task has accepted work, and accepted work means the task is
\* done. Harm if broken: a leaf counts as done with no deliverable, or a
\* deliverable is accepted while the leaf is open for someone else.
AcceptedMeansDone == Idle => ((AcceptedContribs # {}) <=> taskStatus = "ACCEPTED")

\* A leaf ships one deliverable. Harm if broken: the sealed package and the
\* ledger carry two accepted deliverables for one leaf.
AtMostOneAccepted == Cardinality(AcceptedContribs) <= 1

\* The acceptance reputation (+5, +6 on strong-worker accept) is paid once per
\* contribution. Reputation gates peer review (Forger, 100) and strong-worker
\* auto-accept (Anvil, 400). Harm if broken: a retried accept inflates
\* reputation and unlocks privileges early.
CreditPaidOnce == \A c \in DOMAIN contribs : contribs[c].credits <= 1

\* peer-review-ops.ts: "One review per reviewer per contribution (idempotent)".
\* Harm if broken: one reviewer's score counts twice in the average and the
\* reviewer is paid +2 twice.
OneReviewPerReviewer ==
  \A r1, r2 \in DOMAIN reviews :
    r1 # r2 => ~(reviews[r1].contrib = reviews[r2].contrib
                 /\ reviews[r1].reviewer = reviews[r2].reviewer)

\* project-completion.ts: a project is COMPLETED exactly when all claimable
\* leaves are ACCEPTED. Harm if broken: a project with open work shows as
\* complete and sealProjectForUser lets the creator seal and ship it.
ProjectTracksTask == Idle => (projectStatus = "COMPLETED" <=> taskStatus = "ACCEPTED")

\* moderation-ops.ts dual-key gate and task-ops.ts dualBlocks: when the project
\* requires dual key on a large leaf, no deliverable is accepted without a
\* review by someone other than its author. Harm if broken: one person signs
\* off alone on work the project said needs two.
DualKeyHonored == RequireDualKey => \A c \in AcceptedContribs : PeerReviewsOn(c) # {}

=============================================================================
