# ReviewVsModerate

TLC reached more states than the chart budget of 500, so the chart draws only the bug paths: 10 states and 13 arrows.

## AtMostOneAccepted breaks
The shortest path has 18 steps:
0. Open
1. a builder claims the task: Claimed
2. a builder sends in work: Claimed · submit in progress
3. the submission is saved: Submitted, in review
4. a peer reviewer opens the submission: Submitted, in review · peer review in progress
5. the peer review is saved: Submitted, in review · peer review in progress
6. the review average is computed: Submitted, in review · peer review in progress
7. the creator opens the submission: Submitted, in review · peer review + creator decision in progress
8. the creator rejects the submission: Submitted, in review · peer review + creator decision in progress
9. peer review accepts the submission: Submitted, in review · peer review + creator decision in progress
10. the creator's reject reopens the task: Open · peer review + creator decision in progress
11. a builder claims the task: Claimed · peer review + creator decision in progress
12. a builder sends in work: Claimed · submit + peer review + creator decision in progress
13. the submission is saved: Submitted, in review · peer review + creator decision in progress
14. no reputation is paid [rejected]: Submitted, in review · peer review + creator decision in progress
15. the creator's review is saved: Submitted, in review · peer review + creator decision in progress
16. the project status is recomputed: Submitted, in review · peer review in progress
17. the creator opens the submission: Submitted, in review · peer review + creator decision in progress
18. the creator accepts the submission: Submitted, in review · peer review + creator decision in progress · two accepted deliverables
