# ClaimRaces

TLC reached more states than the chart budget of 500, so the chart draws only the bug paths: 5 states and 6 arrows.
With SYMMETRY, TLC keeps one representative for each group of states that it counts as the same. An arrow can lead to the representative rather than to the state that the step reaches.

## ActiveClaimMeansClaimed breaks
The shortest path has 6 steps:
0. Open
1. a builder claims the task: Claimed
2. a builder asks to release the claim: Claimed · release in progress
3. a builder asks to release the claim: Claimed · release in progress
4. the release is written: Open · release in progress
5. a builder claims the task: Claimed · release in progress
6. the release is written: Open · a builder still holds a claim
