# Flow

TLC reached 48 states and 74 steps. The chart draws 19 states and 28 arrows.
The chart does not draw 15 steps that stay in one chart state.

## PaymentCreditedOnce breaks
The shortest path has 4 steps:
0. pool $0.00, $0.00 left to match, pot $0.00
1. Stripe delivers a gift to a pot: pool $0.00, $0.00 left to match, pot $0.00 · a Stripe gift being recorded
2. Stripe delivers a gift to a pot: pool $0.00, $0.00 left to match, pot $0.00 · a Stripe gift being recorded
3. the gift is recorded: pool $0.00, $0.00 left to match, pot $4.00 · a Stripe gift being recorded
4. the gift is recorded: pool $0.00, $0.00 left to match, pot $8.00 · one payment on the ledger twice
