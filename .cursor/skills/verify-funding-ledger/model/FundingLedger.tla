---------------------------- MODULE FundingLedger ----------------------------
(***************************************************************************)
(* GrokForge funding writes for one project, as implemented in             *)
(*                                                                         *)
(*   src/app/api/stripe/webhook/route.ts  POST (checkout.session.completed)*)
(*     - kind "matching_pool": ledgerEntry.findFirst(meta contains id),    *)
(*       then $transaction([project.update(+pool, +remaining), ledger])    *)
(*     - default "pot_donation": donation.findUnique(stripeSessionId),     *)
(*       computeMatch, then $transaction(donation.create, pot +amount,     *)
(*       ledger, [remaining -match, pot +match, ledger])                   *)
(*   src/lib/actions.ts demoDonateAction (no Stripe key): computeMatch,    *)
(*       then the same $transaction with a fresh stripeSessionId            *)
(*   src/lib/actions.ts fundMatchingPoolAction (no Stripe key):            *)
(*       project.update(+pool, +remaining), then ledger                     *)
(*   src/lib/matching-funds.ts computeMatch                                *)
(*   prisma/schema.prisma Donation.stripeSessionId @unique                 *)
(*                                                                         *)
(* A "delivery" is one request handler: one Stripe webhook delivery (Stripe *)
(* may deliver the same event more than once), or one browser action.     *)
(* Every statement that commits on its own is one step; every              *)
(* prisma.$transaction is one step; a read that a later write depends on   *)
(* is its own step.                                                        *)
(***************************************************************************)
EXTENDS Integers, FiniteSets, TLC

CONSTANTS
  Payments,        \* payment ids: Stripe checkout sessions, or demo actions
  Kind,            \* Payments -> {"pot", "pool", "demo_pot", "demo_pool"}
  Amount,          \* Payments -> Nat (cents)
  Deliveries,      \* request handlers
  Payment,         \* Deliveries -> Payments: which payment a handler carries
  MatchingEnabled, \* project.matchingEnabled at start
  RatioBps,        \* project.matchingRatioBps (10000 = 1:1)
  InitialPool      \* project.matchingPoolCents = matchingRemainingCents at start

ASSUME \A p \in Payments : Kind[p] \in {"pot", "pool", "demo_pot", "demo_pool"}
ASSUME \A d \in Deliveries : Payment[d] \in Payments

VARIABLES
  enabled,     \* Project.matchingEnabled
  pool,        \* Project.matchingPoolCents
  remaining,   \* Project.matchingRemainingCents
  potBalance,  \* FundPot.balanceCents of the one pot
  donations,   \* Payments with a Donation row (stripeSessionId is unique)
  credits,     \* Payments -> how many CAPITAL ledger rows credit this payment
  matched,     \* sum of matching-funds ledger rows (cents)
  pc,          \* Deliveries -> next statement
  local        \* Deliveries -> what the handler read before its transaction

vars == <<enabled, pool, remaining, potBalance, donations, credits, matched, pc, local>>

Done == {d \in Deliveries : pc[d] = "done"}

\* matching-funds.ts computeMatch, with donationCents and remaining already
\* non-negative integers (Math.floor of positive values is the value).
ComputeMatch(amountCents, remain, isEnabled) ==
  LET r == IF remain < 0 THEN 0 ELSE remain
      ideal == (amountCents * RatioBps) \div 10000
  IN IF ~isEnabled \/ amountCents < 1 \/ r < 1 \/ RatioBps < 1 THEN 0
     ELSE IF ideal < r THEN ideal ELSE r

Init ==
  /\ enabled = MatchingEnabled
  /\ pool = InitialPool
  /\ remaining = InitialPool
  /\ potBalance = 0
  /\ donations = {}
  /\ credits = [p \in Payments |-> 0]
  /\ matched = 0
  /\ pc = [d \in Deliveries |-> "idle"]
  /\ local = [d \in Deliveries |-> 0]

(***************************************************************************)
(* Pot donation through the webhook (route.ts, default branch)             *)
(*                                                                         *)
(* Read step: donation.findUnique({ stripeSessionId }) -> if found, answer *)
(* { received: true } and stop. Else read the pot and the project's         *)
(* matching fields and computeMatch. Write step: $transaction. The          *)
(* donation.create inside it hits the unique index when another delivery   *)
(* of the same session committed first; Prisma throws, the transaction     *)
(* rolls back, the route answers 500 and Stripe retries later (idle again). *)
(***************************************************************************)
PotRead(d) ==
  LET p == Payment[d] IN
  /\ Kind[p] = "pot"
  /\ pc[d] = "idle"
  /\ IF p \in donations
     THEN /\ pc' = [pc EXCEPT ![d] = "done"]
          /\ UNCHANGED local
     ELSE /\ local' = [local EXCEPT ![d] = ComputeMatch(Amount[p], remaining, enabled)]
          /\ pc' = [pc EXCEPT ![d] = "pot_commit"]
  /\ UNCHANGED <<enabled, pool, remaining, potBalance, donations, credits, matched>>

PotCommit(d) ==
  LET p == Payment[d]
      m == local[d]
  IN
  /\ pc[d] = "pot_commit"
  /\ IF p \in donations
     THEN /\ pc' = [pc EXCEPT ![d] = "idle"]    \* unique violation: rollback, 500, retry
          /\ UNCHANGED <<donations, potBalance, credits, remaining, matched>>
     ELSE /\ donations' = donations \cup {p}
          /\ potBalance' = potBalance + Amount[p] + m
          /\ credits' = [credits EXCEPT ![p] = @ + 1]
          /\ remaining' = remaining - m
          /\ matched' = matched + m
          /\ pc' = [pc EXCEPT ![d] = "done"]
  /\ UNCHANGED <<enabled, pool, local>>

(***************************************************************************)
(* Demo pot donation (actions.ts demoDonateAction, no STRIPE_SECRET_KEY)   *)
(*                                                                         *)
(* Same shape without the idempotency read: the stripeSessionId is a fresh *)
(* demo_... string, so the unique index never fires. computeMatch reads    *)
(* the project before the $transaction.                                    *)
(***************************************************************************)
DemoPotRead(d) ==
  LET p == Payment[d] IN
  /\ Kind[p] = "demo_pot"
  /\ pc[d] = "idle"
  /\ local' = [local EXCEPT ![d] = ComputeMatch(Amount[p], remaining, enabled)]
  /\ pc' = [pc EXCEPT ![d] = "demo_pot_commit"]
  /\ UNCHANGED <<enabled, pool, remaining, potBalance, donations, credits, matched>>

DemoPotCommit(d) ==
  LET p == Payment[d]
      m == local[d]
  IN
  /\ pc[d] = "demo_pot_commit"
  /\ donations' = donations \cup {p}
  /\ potBalance' = potBalance + Amount[p] + m
  /\ credits' = [credits EXCEPT ![p] = @ + 1]
  /\ remaining' = remaining - m
  /\ matched' = matched + m
  /\ pc' = [pc EXCEPT ![d] = "done"]
  /\ UNCHANGED <<enabled, pool, local>>

(***************************************************************************)
(* Matching-pool top-up through the webhook (route.ts, kind matching_pool) *)
(*                                                                         *)
(* Read step: ledgerEntry.findFirst({ projectId, meta: { contains:         *)
(* session.id } }) -> if found, answer duplicate and stop. Write step:      *)
(* $transaction([project.update(matchingEnabled: true, pool +a,            *)
(* remaining +a), ledger(meta stripeSessionId), donor +2]). Nothing in the  *)
(* write is unique, so the write never fails on a repeat.                  *)
(***************************************************************************)
PoolRead(d) ==
  LET p == Payment[d] IN
  /\ Kind[p] = "pool"
  /\ pc[d] = "idle"
  /\ pc' = [pc EXCEPT ![d] = IF credits[p] > 0 THEN "done" ELSE "pool_commit"]
  /\ UNCHANGED <<enabled, pool, remaining, potBalance, donations, credits, matched, local>>

PoolCommit(d) ==
  LET p == Payment[d] IN
  /\ pc[d] = "pool_commit"
  /\ enabled' = TRUE
  /\ pool' = pool + Amount[p]
  /\ remaining' = remaining + Amount[p]
  /\ credits' = [credits EXCEPT ![p] = @ + 1]
  /\ pc' = [pc EXCEPT ![d] = "done"]
  /\ UNCHANGED <<potBalance, donations, matched, local>>

(***************************************************************************)
(* Demo matching-pool top-up (actions.ts fundMatchingPoolAction, no key)   *)
(*                                                                         *)
(* project.update with increments, then ledgerEntry.create. Two statements *)
(* and no transaction, but increments commute and nothing reads between    *)
(* them, so one step.                                                      *)
(***************************************************************************)
DemoPoolCommit(d) ==
  LET p == Payment[d] IN
  /\ Kind[p] = "demo_pool"
  /\ pc[d] = "idle"
  /\ enabled' = TRUE
  /\ pool' = pool + Amount[p]
  /\ remaining' = remaining + Amount[p]
  /\ credits' = [credits EXCEPT ![p] = @ + 1]
  /\ pc' = [pc EXCEPT ![d] = "done"]
  /\ UNCHANGED <<potBalance, donations, matched, local>>

Next ==
  \E d \in Deliveries :
    \/ PotRead(d) \/ PotCommit(d)
    \/ DemoPotRead(d) \/ DemoPotCommit(d)
    \/ PoolRead(d) \/ PoolCommit(d)
    \/ DemoPoolCommit(d)

Spec == Init /\ [][Next]_vars

(***************************************************************************)
(* Rules                                                                   *)
(***************************************************************************)
TypeOK ==
  /\ enabled \in BOOLEAN
  /\ pool \in Nat /\ potBalance \in Nat /\ matched \in Nat
  /\ remaining \in Int
  /\ donations \subseteq Payments
  /\ \A p \in Payments : credits[p] \in Nat

\* One Stripe payment puts one CAPITAL row on the public ledger and is counted
\* once in a pot or in the match pool. Harm if broken: the ledger and the pool
\* show money that was paid once as paid twice; later gifts get matched from it.
PaymentCreditedOnce == \A p \in Payments : credits[p] <= 1

\* The match pool never goes below zero. Harm if broken: a pot is credited with
\* matching money that nobody pledged.
RemainingNonNegative == remaining >= 0

\* Matching paid out never exceeds the pool pledged. Same harm, seen from the
\* ledger: the matching rows add up to more than the pool rows.
MatchedWithinPool == matched <= pool

\* The pool accounting is consistent: what was pledged minus what is left is
\* what was paid out as matching.
PoolConservation == pool - remaining = matched

=============================================================================
