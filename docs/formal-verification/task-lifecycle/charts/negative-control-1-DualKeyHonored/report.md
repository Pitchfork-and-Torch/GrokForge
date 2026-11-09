# DualKey

TLC reached more states than the chart budget of 500, so the chart draws only the bug paths: 5 states and 5 arrows.

## DualKeyHonored breaks
The shortest path has 5 steps:
0. Open
1. a builder claims the task: Claimed
2. a builder sends in work: Claimed · submit in progress
3. the submission is saved: Submitted, in review
4. the creator opens the submission: Submitted, in review · creator decision in progress
5. the creator accepts the submission: Submitted, in review · creator decision in progress
