# WebhookRetry

TLC reached 222 states and 448 steps. The chart draws 26 states and 48 arrows.
The chart does not draw 167 steps that stay in one chart state.

## PaymentCreditedOnce breaks
The shortest path has 4 steps:
0. pool $0.00, $0.00 left to match, pot $0.00
1. Stripe delivers a match-pool top-up: pool $0.00, $0.00 left to match, pot $0.00 · a pool top-up being recorded
2. Stripe delivers a match-pool top-up: pool $0.00, $0.00 left to match, pot $0.00 · a pool top-up being recorded
3. the top-up is added to the pool: pool $6.00, $6.00 left to match, pot $0.00 · a pool top-up being recorded
4. the top-up is added to the pool: pool $12.00, $12.00 left to match, pot $0.00 · one payment on the ledger twice
