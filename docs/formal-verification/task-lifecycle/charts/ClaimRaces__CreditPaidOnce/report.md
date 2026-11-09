# ClaimRaces

TLC reached more states than the chart budget of 500, so the chart draws only the bug paths: 8 states and 10 arrows.
With SYMMETRY, TLC keeps one representative for each group of states that it counts as the same. An arrow can lead to the representative rather than to the state that the step reaches.

## CreditPaidOnce breaks
The shortest path has 15 steps:
0. Open
1. a builder claims the task: Claimed
2. a builder sends in work: Claimed · submit in progress
3. the submission is saved: Submitted, in review
4. a peer reviewer opens the submission: Submitted, in review · peer review in progress
5. a peer reviewer opens the submission: Submitted, in review · peer review in progress
6. the peer review is saved: Submitted, in review · peer review in progress
7. the peer review is saved: Submitted, in review · peer review in progress · a reviewer counted twice
8. the review average is computed: Submitted, in review · peer review in progress · a reviewer counted twice
9. peer review accepts the submission: Submitted, in review · peer review in progress · a reviewer counted twice
10. peer review marks the task accepted: Accepted, done · peer review in progress · a reviewer counted twice
11. the author is paid reputation: Accepted, done · peer review in progress · a reviewer counted twice
12. the review average is computed: Accepted, done · peer review in progress · a reviewer counted twice
13. peer review accepts the submission: Accepted, done · peer review in progress · a reviewer counted twice
14. peer review marks the task accepted: Accepted, done · peer review in progress · a reviewer counted twice
15. the author is paid reputation: Accepted, done · peer review in progress · author paid twice · a reviewer counted twice
