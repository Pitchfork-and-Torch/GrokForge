# MatchBurn

TLC reached 13 states and 14 steps. The chart draws 9 states and 14 arrows.

## RemainingNonNegative breaks
The shortest path has 4 steps:
0. pool $6.00, $6.00 left to match, pot $0.00
1. a signed-in user gives to a pot (demo ledger): pool $6.00, $6.00 left to match, pot $0.00 · a demo gift being recorded
2. Stripe delivers a gift to a pot: pool $6.00, $6.00 left to match, pot $0.00 · a Stripe gift and a demo gift being recorded
3. the demo gift is recorded and matched from the pool: pool $6.00, $2.00 left to match, pot $8.00 · a Stripe gift being recorded
4. the gift is recorded and matched from the pool: pool $6.00, $-2.00 left to match, pot $16.00 · match pool overdrawn
