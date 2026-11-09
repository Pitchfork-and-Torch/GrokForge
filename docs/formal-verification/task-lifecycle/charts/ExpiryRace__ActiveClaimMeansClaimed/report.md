# ExpiryRace

TLC reached more states than the chart budget of 500, so the chart draws only the bug paths: 6 states and 6 arrows.

## ActiveClaimMeansClaimed breaks
The shortest path has 6 steps:
0. Open
1. a builder claims the task: Claimed
2. a builder asks to release the claim: Claimed · release in progress
3. the expiry job picks up a stale claim: Claimed · release + expiry in progress
4. the claim is expired: Open · release in progress
5. a builder claims the task: Claimed · release in progress
6. the release is written: Open · a builder still holds a claim
