# Reopen

TLC reached more states than the chart budget of 500, so the chart draws only the bug paths: 8 states and 9 arrows.

## ProjectTracksTask breaks
The shortest path has 10 steps:
0. Open
1. a builder claims the task: Claimed
2. a builder sends in work: Claimed · submit in progress
3. the submission is saved: Submitted, in review
4. the creator opens the submission: Submitted, in review · creator decision in progress
5. the creator accepts the submission: Submitted, in review · creator decision in progress
6. the creator's accept marks the task accepted: Accepted, done · creator decision in progress
7. the author is paid reputation: Accepted, done · creator decision in progress
8. the creator's review is saved: Accepted, done · creator decision in progress
9. the project status is recomputed: Accepted, done
10. the creator reopens the task for rework: Open again, sent back for rework · project still marked complete
