# ReviewVsModerate

TLC reached more states than the chart budget of 500, so the chart draws only the bug paths: 8 states and 10 arrows.

## CreditPaidOnce breaks
The shortest path has 13 steps:
0. Open
1. a builder claims the task: Claimed
2. a builder sends in work: Claimed · submit in progress
3. the submission is saved: Submitted, in review
4. a peer reviewer opens the submission: Submitted, in review · peer review in progress
5. the peer review is saved: Submitted, in review · peer review in progress
6. the review average is computed: Submitted, in review · peer review in progress
7. the creator opens the submission: Submitted, in review · peer review + creator decision in progress
8. peer review accepts the submission: Submitted, in review · peer review + creator decision in progress
9. peer review marks the task accepted: Accepted, done · peer review + creator decision in progress
10. the author is paid reputation: Accepted, done · peer review + creator decision in progress
11. the creator accepts the submission: Accepted, done · peer review + creator decision in progress
12. the creator's accept marks the task accepted: Accepted, done · peer review + creator decision in progress
13. the author is paid reputation: Accepted, done · peer review + creator decision in progress · author paid twice
