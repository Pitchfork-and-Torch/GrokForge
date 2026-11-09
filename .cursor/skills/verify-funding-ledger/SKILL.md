---
name: verify-funding-ledger
description: "Model-check GrokForge's project funding writes (Stripe webhook pot donations and match-pool top-ups, demo donations, matching-funds burn) with TLA+/TLC for webhook retries and concurrent gifts. Use before and after any change to src/app/api/stripe/webhook/route.ts, demoDonateAction or fundMatchingPoolAction in src/lib/actions.ts, src/lib/matching-funds.ts, or the Donation/FundPot/Project matching columns in prisma/schema.prisma; or when a ledger shows one payment twice or a match pool below zero."
---

# Verify the funding ledger

<!-- sync-commit: 4ef25da2b2ccd4643f6f255ced5330de58142a6c -->

This skill checks every order in which Stripe webhook deliveries (including the
retries and duplicates Stripe documents) and browser donations can write one
project's pot balance, match pool and ledger. TLC explores every interleaving
within the bounds below and reports the shortest path to each state that breaks a
rule. A pass covers the model under its bounds, not the whole app.

## What it checks

| Rule | Promise | Harm when broken |
|---|---|---|
| `PaymentCreditedOnce` | One Stripe payment puts one CAPITAL row on the ledger and counts once in a pot or in the match pool. | The public ledger and the pool show money paid once as paid twice; later gifts are matched from it. |
| `RemainingNonNegative` | `Project.matchingRemainingCents` never goes below zero. | A pot is credited with matching money nobody pledged. |
| `MatchedWithinPool` | Matching paid out never exceeds the pool pledged. | Same harm, seen on the ledger. |
| `PoolConservation` | Pledged minus remaining equals matching paid out. | The three numbers on the match-pool panel disagree. |
| `TypeOK` | Values have the shape the code writes. | The model is wrong, not the code. |

## Covered code

| Code | Model actions |
|---|---|
| `src/app/api/stripe/webhook/route.ts`, `checkout.session.completed`, default pot branch | `PotRead` (`donation.findUnique`, project read, `computeMatch`), `PotCommit` (the `$transaction`; its `donation.create` hits the unique index on a repeat and the route answers 500, so Stripe retries) |
| same file, `kind === "matching_pool"` branch | `PoolRead` (`ledgerEntry.findFirst` on `meta`), `PoolCommit` (the `$transaction`) |
| `src/lib/actions.ts` `demoDonateAction`, no `STRIPE_SECRET_KEY` | `DemoPotRead` (`computeMatch` on the project read), `DemoPotCommit` (the `$transaction`) |
| `src/lib/actions.ts` `fundMatchingPoolAction`, no `STRIPE_SECRET_KEY` | `DemoPoolCommit` (one `project.update` with increments) |
| `src/lib/matching-funds.ts` `computeMatch` | `ComputeMatch` |
| `prisma/schema.prisma` `Donation.stripeSessionId @unique` | the unique-violation branch of `PotCommit` |

`shape.json` lists the lines the model depends on; the check fails when one is gone.
The Stripe Checkout session creation (with a key set) and the notifications are not
modeled; they do not write the columns the rules read.

## Does my change touch this?

Yes if it edits the webhook route, either demo action, `computeMatch`, the
`Donation`, `FundPot` or `Project.matching*` columns, or adds a new path that writes
`FundPot.balanceCents` or `Project.matchingRemainingCents`.

## Run it

```sh
node .cursor/skills/verify-funding-ledger/scripts/check.mjs
```

Needs Java 11+ and network once to fetch TLC. Takes under a minute. Same options and
exit codes as the task-lifecycle runner: `--config`, `--rule`, `--workers`, `--out`,
`--emit DIR` (single-rule configs for charting), `--skip-shape`, `--skip-drift`.

| Config | What happens | Why it exists |
|---|---|---|
| `Flow` | one pot gift delivered twice, one pool top-up delivered once, empty pool | the common case; every rule holds; the unique index absorbs the duplicate |
| `WebhookRetry` | one pot gift and one pool top-up, each delivered twice | duplicate delivery of a pool top-up (G1) |
| `MatchBurn` | two gifts of 400 cents, one Stripe and one demo, pool of 600 at 1:1 | concurrent gifts both matched against the same remainder (G2) |

## Read the result

Rows read `ok`, `ok (known finding:Gn)`, `REGRESSION`, `CHANGED`, `NEW` or `ERROR`,
with the same meaning as in `verify-task-lifecycle`. Known findings are G1 and G2 in
`docs/formal-verification/funding-ledger/FINDINGS.md`. To draw a path, run `--emit`
and give the single-rule `.cfg` with `model/view.mjs` to the pstack `/statechart`
skill; read that skill for how. Charts are in
`docs/formal-verification/funding-ledger/charts/`.

## Tell a real bug from a modeling error

For each step of a path, open the statement in the table above. A `*Read` followed
by another delivery's `*Commit` before this delivery's `*Commit` means two handlers
overlapped; Vercel runs webhook deliveries and server actions in parallel, so that
is allowed. Stripe states that the same event can be delivered more than once; a
path with two deliveries of one payment is that case. A path the code cannot take
means the model is wrong: fix the model, not the rule.

## Update the verification when a change is intended

Same loop as `verify-task-lifecycle`: read the changed function, map each
`await prisma.*` to an action (one `$transaction` is one action), edit
`model/FundingLedger.tla`, `shape.json` and `expected.json`, break the fix on a
scratch copy to see the rule fail, then move the `sync-commit` marker.

## Bounds and assumptions

- One project, one pot, at most two payments and four deliveries per config.
- Amounts are the cents in each `.cfg`; `RatioBps` is 10000 (1:1). `computeMatch` is
  modeled exactly for non-negative integers.
- A delivery whose insert hits the unique index goes back to idle and re-reads, as
  Stripe retries a 500. The model does not bound retries; the donation set only
  grows, so the state space is finite.
- `matchingEnabled` starts as `MatchingEnabled` and is set true by a pool top-up, as
  in the code. `clampRatioBps` is not modeled.
- Donor reputation, notifications, `FundPot.label`, `publicName` and `message` are
  not modeled.
- Not run against a database; findings were replayed by reading the code.

## Tooling

Same as `verify-task-lifecycle`: `tla2tools.jar` 1.7.4 (sha256
`936a262061c914694dfd669a543be24573c45d5aa0ff20a8b96b23d01e050e88`), Java 11+
(run with OpenJDK 21.0.12.1), Node 18+ (run with 22.23.4).
