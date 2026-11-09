# Implicit state machines in GrokForge, ranked

Inventory made by reading the code at commit `4ef25da2b2ccd4643f6f255ced5330de58142a6c`
(main, 2026-10-03), not from metadata or docs. A subsystem is listed when the code
moves rows between named states, and the order of concurrent requests can change
the outcome. Rank is by user harm when the order goes wrong, then by how much
concurrency and retry the subsystem actually sees.

The funding and task-authorization lead from the task description was checked and
set aside: the money paths are lower volume and mostly guarded by a unique index,
and token scopes are a lookup, not a state machine. The leaf-task lifecycle is where
unattended agent loops, cron, page loads and humans all write the same rows.

| Rank | Subsystem | States and writers | Concurrency and retries | Harm when ordering goes wrong | This batch |
|---|---|---|---|---|---|
| 1 | **Leaf-task lifecycle**: `Task.status` (OPEN, CLAIMED, SUBMITTED, ACCEPTED), `TaskClaim.active`, `Contribution.status` (PENDING, ACCEPTED, REJECTED), `ContributionReview`, `User.reputation`, `Project.status` derived. Writers: `src/lib/task-ops.ts`, `expire-claims.ts`, `peer-review-ops.ts`, `moderation-ops.ts`, `expansion-actions.ts`, `project-completion.ts` | Agent loops (`/api/v1/agent/worker`, MCP `claim_work`/`submit_work`, `scripts/local-agent-worker.mjs`) poll and claim unattended; `expireStaleClaims` runs from cron and from every load of `/tasks` and `/projects/[slug]`; peer reviewers and the creator act on the same submission; cockpit buttons and bulk-accept retry. Only `claimTaskForUser` uses a conditional update inside its transaction; `peerReviewContributionForUser` and `moderateContributionForUser` use no transaction at all; `releaseClaimForUser` and `reopenContributionTaskAction` write `Task.status` with no guard. | A builder's finished work refused ("Task is no longer claimed by you"); two builders on one leaf; reputation paid twice, which unlocks peer review (100) and strong-worker auto-accept (400); a project shown and sealable as COMPLETED with an open leaf; two accepted deliverables for one leaf in the sealed package. | **Verified.** `.cursor/skills/verify-task-lifecycle`, findings F1 to F6 in `task-lifecycle/FINDINGS.md`. |
| 2 | **Funding and matching pool**: `Donation` (+ unique `stripeSessionId`), `FundPot.balanceCents`, `Project.matchingRemainingCents`, `LedgerEntry` CAPITAL rows. Writers: `src/app/api/stripe/webhook/route.ts`, `demoDonateAction`, `fundMatchingPoolAction` in `src/lib/actions.ts`, `src/lib/matching-funds.ts` | Stripe retries webhooks. Pot donations are idempotent by the unique index on `Donation.stripeSessionId` (a second insert fails and rolls the transaction back). The `matching_pool` branch is idempotent only by a `ledgerEntry.findFirst({ meta: { contains: session.id } })` check before the transaction. `computeMatch` reads `matchingRemainingCents` before the transaction and then `decrement`s it, so two donations in flight can both match against the same remainder. | Match pool credited twice for one payment; `matchingRemainingCents` below zero and a pot showing more matched money than the pool held. Lower volume than tasks; real money shows on a public ledger. | Not verified. Next candidate; see `README.md`. |
| 3 | **Project completion, seal and ship**: `Project.status` (ACTIVE, FUNDED, COMPLETED, ARCHIVED), `Artifact.isPrimary` package rows. Writers: `project-completion.ts`, `seal-ops.ts`, `github-ship-ops.ts`, archive actions | `syncProjectCompletionStatus` is called after accepts but not after reopen; `sealProjectForUser` clears `isPrimary` with `updateMany` then creates a new primary, with no transaction. | Covered in part by rank 1 (`ProjectTracksTask`): a sealable COMPLETED project with open work. Two primary packages after two concurrent seals is cosmetic. | Partly covered by rank 1. Seal not modeled. |
| 4 | **Milestone dual verification**: `Milestone.humanVerifiedAt`, `agentVerifiedAt`, `released`. Writers: `humanVerifyMilestoneAction`, `agentVerifyMilestoneAction`, `maybeReleaseMilestone` in `actions.ts` | Two legs that can finish at the same time; `maybeReleaseMilestone` checks `released` then updates and writes a MILESTONE ledger row with `targetCents`, outside a transaction. | Duplicate release ledger row with an amount. No funds move; `agentVerifyMilestoneAction` can call xAI when `XAI_API_KEY` is set, so it was not exercised. | Not verified. |
| 5 | **Agent API tokens**: `ApiToken.revokedAt`, `expiresAt`, scopes. `src/lib/api-tokens.ts`, `api-v1.ts` | Revoke is a single update; `authenticateBearer` is a lookup plus a throttled `lastUsedAt` write. Founder-only scopes are refused at mint time. | A revoked token keeps working until the request that already passed `authenticateBearer` ends. No multi-step state. | Not applicable: no meaningful state machine beyond one flag. Covered by `src/lib/__tests__/api-tokens.test.ts`. |
| 6 | **Agent worker heartbeat**: `AgentWorkerHeartbeat.status` (idle, busy, error, offline). `src/lib/agent-workers.ts` | One `upsert` per heartbeat; last write wins by design. | Stale status on a dashboard panel. | Not applicable: informational, single-row upsert. |
| 7 | **Rate limiting**: in-memory buckets or Upstash INCR. `src/lib/rate-limit.ts` | Per-instance memory on Vercel means the limit is per warm function, not global. | Limits are softer than the numbers suggest. Not a state machine with invariants users rely on. | Not applicable for model checking; a note, not a finding. |

## Observations outside the model

Found while reading, not checked by TLC, and not changed:

- `POST /api/v1/contributions/:id/review` calls `peerReviewContributionForUser`
  with any valid token. The function has no reputation-tier check; only the UI
  (`src/app/c/[id]/page.tsx`) and `peerReviewContributionAction` in
  `expansion-actions.ts` gate on `tier.canPeerReview`. One review with score 3 or
  more accepts the contribution. This is authorization, not ordering, so it is out
  of scope here, but it widens who can trigger F5.
- `moderation-ops.ts` wraps `contributionReview.create` in a try/catch with the
  comment "unique or race - non-fatal". `prisma/schema.prisma` has no unique index
  on `ContributionReview (contributionId, reviewerId)`, so the catch never fires for
  that reason.
- `TaskStatus.REJECTED` is in the enum and is never written; rejected work reopens
  the task to OPEN. The model has no REJECTED task state for that reason.
