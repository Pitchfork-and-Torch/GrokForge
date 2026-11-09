# Reopen

TLC reached more states than the chart budget of 500, so the chart draws only the bug paths: 6 states and 6 arrows.

## ActiveClaimMeansClaimed breaks
The shortest path has 6 steps:
0. Open
1. a builder claims the task: Claimed
2. a builder sends in work: Claimed · submit in progress
3. the submission is saved: Submitted, in review
4. the creator reopens the task for rework: Open again, sent back for rework
5. a builder claims the task: Claimed
6. the creator reopens the task for rework: Open · a builder still holds a claim
