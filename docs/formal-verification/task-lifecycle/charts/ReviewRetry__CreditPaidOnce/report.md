# ReviewRetry

TLC reached more states than the chart budget of 500, so the chart draws only the bug paths: 7 states and 8 arrows.
With SYMMETRY, TLC keeps one representative for each group of states that it counts as the same. An arrow can lead to the representative rather than to the state that the step reaches.

## CreditPaidOnce breaks
The shortest path has 11 steps:
0. Open
1. a builder claims the task: Claimed
2. a builder sends in work: Claimed · submit in progress
3. the submission is saved: Submitted, in review
4. the creator opens the submission: Submitted, in review · creator decision in progress
5. the creator opens the submission: Submitted, in review · creator decision in progress
6. the creator accepts the submission: Submitted, in review · creator decision in progress
7. the creator's accept marks the task accepted: Accepted, done · creator decision in progress
8. the author is paid reputation: Accepted, done · creator decision in progress
9. the creator accepts the submission: Accepted, done · creator decision in progress
10. the creator's accept marks the task accepted: Accepted, done · creator decision in progress
11. the author is paid reputation: Accepted, done · creator decision in progress · author paid twice
