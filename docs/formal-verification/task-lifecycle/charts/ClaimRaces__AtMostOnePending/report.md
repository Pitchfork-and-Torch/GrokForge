# ClaimRaces

TLC reached more states than the chart budget of 500, so the chart draws only the bug paths: 9 states and 8 arrows.
With SYMMETRY, TLC keeps one representative for each group of states that it counts as the same. An arrow can lead to the representative rather than to the state that the step reaches.

## AtMostOnePending breaks
The shortest path has 8 steps:
0. Open
1. a builder claims the task: Claimed
2. a builder asks to release the claim: Claimed · release in progress
3. a builder sends in work: Claimed · release + submit in progress
4. the submission is saved: Submitted, in review · release in progress
5. the release is written: Open · work still waiting for review
6. a builder claims the task: Claimed · work still waiting for review
7. a builder sends in work: Claimed · submit in progress
8. the submission is saved: Submitted, in review · two submissions waiting
