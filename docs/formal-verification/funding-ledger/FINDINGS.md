# Funding ledger: what the model checker found

Checked at commit `4ef25da2b2ccd4643f6f255ced5330de58142a6c` with TLC 2.19
(`tla2tools.jar` 1.7.4). Model and runner: `.cursor/skills/verify-funding-ledger/`.
Rerun: `node .cursor/skills/verify-funding-ledger/scripts/check.mjs`.

Three configs, five rules, 15 verdicts; table in `check-summary.md`. Paths were
replayed by reading the code; nothing ran against a database or Stripe. No product
code was changed and no rule was weakened.

What holds: `PaymentCreditedOnce` for pot donations in every config, because
`Donation.stripeSessionId` is unique and the whole transaction rolls back on a
repeat (`Flow` config, chart `charts/Flow/`); `PoolConservation` everywhere;
`TypeOK` everywhere. Line numbers are at the commit above.

---

## G1. A match-pool top-up delivered twice by Stripe is credited twice

**Rule broken:** `PaymentCreditedOnce` (config `WebhookRetry`, chart
`charts/WebhookRetry__PaymentCreditedOnce/`, 4 steps).

**Harm in one sentence:** one Stripe payment adds its amount to
`matchingPoolCents` and `matchingRemainingCents` twice and leaves two CAPITAL rows
on the public ledger, so later gifts are matched from money that was never paid.

**Where:** `src/app/api/stripe/webhook/route.ts`, `kind === "matching_pool"`
branch. The idempotency check is `ledgerEntry.findFirst({ projectId, meta: {
contains: session.id } })` at lines 51-56, before the `$transaction` at 72-102.
Nothing in that transaction is unique: `project.update` increments (73-80) and
`ledgerEntry.create` (81-93) both succeed on a repeat.

**Path:**

1. Stripe delivers `checkout.session.completed` for the top-up; the handler runs
   `findFirst` (51-56): no row yet.
2. Stripe delivers the same event again (a retry after a slow response, or a
   duplicate; Stripe documents both); the second handler runs `findFirst`: still no
   row, because the first transaction has not committed.
3. The first transaction commits: pool and remaining +600, one ledger row.
4. The second transaction commits: pool and remaining +1200 in total, two ledger
   rows for one `session.id`.

The pot branch of the same handler does not have this problem: `donation.create`
at 149-161 carries the unique `stripeSessionId`, the second insert throws, the
transaction rolls back, the route answers 500, and Stripe's retry then finds the
row at 119-121 and answers duplicate. That is the behaviour `Flow` draws.

**Shape of a fix (not applied):** record the top-up in a row with a unique key on
the session id (a `Donation` with a synthetic pot, or a dedicated table), or write
the ledger row first with a unique `meta`/session column, inside the transaction.

---

## G2. Two gifts in flight are both matched against the same remainder

**Rule broken:** `RemainingNonNegative`, `MatchedWithinPool` (config `MatchBurn`,
chart `charts/MatchBurn__RemainingNonNegative/`, 4 steps).

**Harm in one sentence:** `matchingRemainingCents` goes below zero and the pot is
credited with more matching money than the pool ever held, on the public ledger.

**Where:** both donation paths compute the match from a read made before the
transaction and then `decrement` by that number inside it:

- webhook pot branch: `project.findUnique` at 124-135 reads
  `matchingRemainingCents`; `computeMatch` at 141-146; the transaction at 148-209
  does `matchingRemainingCents: { decrement: match.matchCents }` at 185 with no
  guard that the column still holds at least that much.
- `demoDonateAction` in `src/lib/actions.ts`: read at 1042-1053, `computeMatch` at
  1057-1062, `decrement` at 1097.

`computeMatch` (`src/lib/matching-funds.ts` 33-51) clamps the remainder it is
given to zero and caps the match at that remainder, so each call alone is right;
the race is between the read and the write.

**Path** (pool 600 cents at 1:1, two gifts of 400):

1. A signed-in user gives 400 through the demo path: `computeMatch` sees 600 left,
   match 400.
2. Stripe delivers a 400 gift: `computeMatch` sees 600 left, match 400.
3. The demo transaction commits: remaining 200, pot 800.
4. The webhook transaction commits: remaining -200, pot 1600, matched 800 against
   a pool of 600.

The same path exists with two Stripe gifts, or two demo gifts.

**How likely:** two donations to one project within the same second, while a match
pool is nearly spent. Rare on today's volume; the ledger is public and permanent.

**Shape of a fix (not applied):** compute and apply the match inside the
transaction against the current row, for example a conditional
`updateMany({ where: { id, matchingRemainingCents: { gte: match } } })` that aborts
and recomputes when it touches zero rows, or a raw `GREATEST(0, ...)` update that
returns the amount actually matched.

---

## Negative control

The unique index on `Donation.stripeSessionId` was removed in a scratch edit of
`prisma/schema.prisma`. The runner's shape check refused the verdicts
("no longer contains `stripeSessionId String?  @unique`", exit 2). With the model
updated to match (the unique-violation branch of `PotCommit` removed),
`Flow / PaymentCreditedOnce` went from pass to `REGRESSION` with the path
PotRead → PotRead → PotCommit → PotCommit: one Stripe gift recorded twice, pot $8.00
for a $4.00 payment (`charts/negative-control-PaymentCreditedOnce/`). The scratch
edit and the model edit were discarded; the baseline run was 15 of 15 verdicts as
expected, exit 0.

## Not covered

One project, one pot, two payments, four deliveries, ratio 1:1, amounts as in the
configs; no Checkout session creation, no notifications, no donor reputation; no
database or Stripe run. See the skill's "Bounds and assumptions".
