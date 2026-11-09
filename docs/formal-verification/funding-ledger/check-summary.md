# verify-funding-ledger check

- repo HEAD: 0327b7e
- TLC: tla2tools 1.7.4 (sha256 936a262061c9...) at /home/ubuntu/.cache/grokforge-formal/tla2tools-1.7.4.jar
- Java: openjdk version "21.0.12.1" 2026-08-18
- workers: auto

## Code shape (6 sentinels)

All sentinel lines are present. The model's steps still have their lines in the code.

## Drift since sync commit

No covered file changed between 4ef25da2b2ccd4643f6f255ced5330de58142a6c and the working tree (HEAD 0327b7e).

## Verdicts

| config | rule | expected | actual | states | result |
|---|---|---|---|---|---|
| Flow | TypeOK | pass | pass | 49 | ok (0.7s) |
| Flow | PaymentCreditedOnce | pass | pass | 49 | ok (0.7s) |
| Flow | RemainingNonNegative | pass | pass | 49 | ok (0.7s) |
| Flow | MatchedWithinPool | pass | pass | 49 | ok (0.7s) |
| Flow | PoolConservation | pass | pass | 49 | ok (0.7s) |
| MatchBurn | TypeOK | pass | pass | 13 | ok (0.7s) |
| MatchBurn | PaymentCreditedOnce | pass | pass | 13 | ok (0.7s) |
| MatchBurn | RemainingNonNegative | finding:G2 | fail | 13 | ok (known finding:G2) (0.7s) |
| MatchBurn | MatchedWithinPool | finding:G2 | fail | 13 | ok (known finding:G2) (0.7s) |
| MatchBurn | PoolConservation | pass | pass | 13 | ok (0.7s) |
| WebhookRetry | TypeOK | pass | pass | 222 | ok (0.7s) |
| WebhookRetry | PaymentCreditedOnce | finding:G1 | fail | 100 | ok (known finding:G1) (0.7s) |
| WebhookRetry | RemainingNonNegative | pass | pass | 222 | ok (0.7s) |
| WebhookRetry | MatchedWithinPool | pass | pass | 222 | ok (0.7s) |
| WebhookRetry | PoolConservation | pass | pass | 222 | ok (0.8s) |

## Shortest paths for rules that break

Steps are the model's action names; the mapping to code is in SKILL.md. Read a path with /statechart to see it as a chart in plain words.

- MatchBurn / RemainingNonNegative (4 steps): DemoPotRead -> PotRead -> PotCommit -> DemoPotCommit
- MatchBurn / MatchedWithinPool (4 steps): PotRead -> DemoPotRead -> PotCommit -> DemoPotCommit
- WebhookRetry / PaymentCreditedOnce (6 steps): PotRead -> PotCommit -> PoolRead -> PoolRead -> PoolCommit -> PoolCommit

