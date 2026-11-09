# StaleSubmit

TLC reached more states than the chart budget of 500, so the chart draws only the bug paths: 6 states and 6 arrows.

## ActiveClaimMeansClaimed breaks
The shortest path has 6 steps:
0. Open
1. a builder claims the task: Claimed
2. a builder sends in work: Claimed · submit in progress
3. the expiry job picks up a stale claim: Claimed · submit + expiry in progress
4. the claim is expired: Open · submit in progress
5. a builder claims the task: Claimed · submit in progress
6. the submission is saved: Submitted, in review · a builder still holds a claim
