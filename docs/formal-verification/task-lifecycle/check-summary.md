# verify-task-lifecycle check

- repo HEAD: 4ef25da
- TLC: tla2tools 1.7.4 (sha256 936a262061c9...) at /home/ubuntu/.cache/grokforge-formal/tla2tools-1.7.4.jar
- Java: openjdk version "21.0.12.1" 2026-08-18
- workers: auto

## Code shape (9 sentinels)

All sentinel lines are present. The model's steps still have their lines in the code.

## Drift since sync commit

No covered file changed between 4ef25da2b2ccd4643f6f255ced5330de58142a6c and the working tree (HEAD 4ef25da).

## Verdicts

| config | rule | expected | actual | states | result |
|---|---|---|---|---|---|
| ClaimRaces | TypeOK | pass | pass | 285,453 | ok (6.5s) |
| ClaimRaces | OneActiveClaimPerTask | pass | pass | 283,577 | ok (6.3s) |
| ClaimRaces | ActiveClaimMeansClaimed | finding:F1 | fail | 157 | ok (known finding:F1) (0.7s) |
| ClaimRaces | PendingMeansSubmitted | finding:F1 | fail | 144 | ok (known finding:F1) (0.7s) |
| ClaimRaces | AtMostOnePending | finding:F1 | fail | 786 | ok (known finding:F1) (0.8s) |
| ClaimRaces | AcceptedMeansDone | finding:F1 | fail | 241 | ok (known finding:F1) (0.8s) |
| ClaimRaces | AtMostOneAccepted | finding:F1 | fail | 967 | ok (known finding:F1) (0.8s) |
| ClaimRaces | CreditPaidOnce | finding:F3 | fail | 65023 | ok (known finding:F3) (1.9s) |
| ClaimRaces | OneReviewPerReviewer | finding:F3 | fail | 924 | ok (known finding:F3) (0.8s) |
| ClaimRaces | ProjectTracksTask | finding:F1 | fail | 251 | ok (known finding:F1) (0.8s) |
| ClaimRaces | DualKeyHonored | pass | pass | 281,918 | ok (6.3s) |
| DualKey | TypeOK | pass | pass | 172645 | ok (2.6s) |
| DualKey | OneActiveClaimPerTask | pass | pass | 172645 | ok (2.4s) |
| DualKey | ActiveClaimMeansClaimed | finding:F5 | fail | 8111 | ok (known finding:F5) (1.0s) |
| DualKey | PendingMeansSubmitted | finding:F5 | fail | 14715 | ok (known finding:F5) (1.1s) |
| DualKey | AtMostOnePending | finding:F5 | fail | 8096 | ok (known finding:F5) (1.0s) |
| DualKey | AcceptedMeansDone | finding:F5 | fail | 6761 | ok (known finding:F5) (1.0s) |
| DualKey | AtMostOneAccepted | finding:F5 | fail | 17016 | ok (known finding:F5) (1.1s) |
| DualKey | CreditPaidOnce | finding:F5 | fail | 2362 | ok (known finding:F5) (0.9s) |
| DualKey | OneReviewPerReviewer | pass | pass | 172645 | ok (2.7s) |
| DualKey | ProjectTracksTask | finding:F5 | fail | 14622 | ok (known finding:F5) (1.1s) |
| DualKey | DualKeyHonored | pass | pass | 172645 | ok (2.5s) |
| ExpiryRace | TypeOK | pass | pass | 15509 | ok (1.3s) |
| ExpiryRace | OneActiveClaimPerTask | pass | pass | 15509 | ok (1.2s) |
| ExpiryRace | ActiveClaimMeansClaimed | finding:F1 | fail | 125 | ok (known finding:F1) (0.8s) |
| ExpiryRace | PendingMeansSubmitted | finding:F1 | fail | 454 | ok (known finding:F1) (0.8s) |
| ExpiryRace | AtMostOnePending | finding:F1 | fail | 1368 | ok (known finding:F1) (0.8s) |
| ExpiryRace | AcceptedMeansDone | finding:F1 | fail | 621 | ok (known finding:F1) (0.8s) |
| ExpiryRace | AtMostOneAccepted | finding:F1 | fail | 2073 | ok (known finding:F1) (0.9s) |
| ExpiryRace | CreditPaidOnce | pass | pass | 15509 | ok (1.2s) |
| ExpiryRace | OneReviewPerReviewer | pass | pass | 15509 | ok (1.2s) |
| ExpiryRace | ProjectTracksTask | finding:F1 | fail | 858 | ok (known finding:F1) (0.8s) |
| ExpiryRace | DualKeyHonored | pass | pass | 15509 | ok (1.2s) |
| Flow | TypeOK | pass | pass | 86 | ok (0.7s) |
| Flow | OneActiveClaimPerTask | pass | pass | 86 | ok (0.7s) |
| Flow | ActiveClaimMeansClaimed | pass | pass | 86 | ok (0.7s) |
| Flow | PendingMeansSubmitted | pass | pass | 86 | ok (0.7s) |
| Flow | AtMostOnePending | pass | pass | 86 | ok (0.7s) |
| Flow | AcceptedMeansDone | pass | pass | 86 | ok (0.7s) |
| Flow | AtMostOneAccepted | pass | pass | 86 | ok (0.7s) |
| Flow | CreditPaidOnce | pass | pass | 86 | ok (0.7s) |
| Flow | OneReviewPerReviewer | pass | pass | 86 | ok (0.7s) |
| Flow | ProjectTracksTask | pass | pass | 86 | ok (0.8s) |
| Flow | DualKeyHonored | pass | pass | 86 | ok (0.7s) |
| Reopen | TypeOK | pass | pass | 383,451 | ok (5.6s) |
| Reopen | OneActiveClaimPerTask | pass | pass | 415,060 | ok (5.2s) |
| Reopen | ActiveClaimMeansClaimed | finding:F6 | fail | 175 | ok (known finding:F6) (0.7s) |
| Reopen | PendingMeansSubmitted | finding:F6 | fail | 384 | ok (known finding:F6) (0.8s) |
| Reopen | AtMostOnePending | finding:F6 | fail | 1917 | ok (known finding:F6) (0.9s) |
| Reopen | AcceptedMeansDone | finding:F6 | fail | 1947 | ok (known finding:F6) (0.9s) |
| Reopen | AtMostOneAccepted | finding:F6 | fail | 5336 | ok (known finding:F6) (1.0s) |
| Reopen | CreditPaidOnce | finding:F5 | fail | 4765 | ok (known finding:F5) (1.0s) |
| Reopen | OneReviewPerReviewer | pass | pass | 414,167 | ok (5.3s) |
| Reopen | ProjectTracksTask | finding:F6 | fail | 1470 | ok (known finding:F6) (0.9s) |
| Reopen | DualKeyHonored | pass | pass | 438,324 | ok (5.0s) |
| ReviewRetry | TypeOK | pass | pass | 272,538 | ok (11.6s) |
| ReviewRetry | OneActiveClaimPerTask | pass | pass | 290,422 | ok (11.1s) |
| ReviewRetry | ActiveClaimMeansClaimed | finding:F1 | fail | 268 | ok (known finding:F1) (0.8s) |
| ReviewRetry | PendingMeansSubmitted | finding:F1 | fail | 141 | ok (known finding:F1) (0.8s) |
| ReviewRetry | AtMostOnePending | finding:F1 | fail | 1202 | ok (known finding:F1) (0.8s) |
| ReviewRetry | AcceptedMeansDone | finding:F1 | fail | 8825 | ok (known finding:F1) (1.2s) |
| ReviewRetry | AtMostOneAccepted | pass | pass | 270,599 | ok (11.5s) |
| ReviewRetry | CreditPaidOnce | finding:F4 | fail | 5105 | ok (known finding:F4) (1.1s) |
| ReviewRetry | OneReviewPerReviewer | finding:F3 | fail | 524 | ok (known finding:F3) (0.8s) |
| ReviewRetry | ProjectTracksTask | finding:F1 | fail | 6325 | ok (known finding:F1) (1.1s) |
| ReviewRetry | DualKeyHonored | pass | pass | 276,474 | ok (11.1s) |
| ReviewVsModerate | TypeOK | pass | pass | 182557 | ok (2.5s) |
| ReviewVsModerate | OneActiveClaimPerTask | pass | pass | 182557 | ok (2.5s) |
| ReviewVsModerate | ActiveClaimMeansClaimed | finding:F5 | fail | 9687 | ok (known finding:F5) (1.1s) |
| ReviewVsModerate | PendingMeansSubmitted | finding:F5 | fail | 16010 | ok (known finding:F5) (1.1s) |
| ReviewVsModerate | AtMostOnePending | finding:F5 | fail | 10724 | ok (known finding:F5) (1.1s) |
| ReviewVsModerate | AcceptedMeansDone | finding:F5 | fail | 5451 | ok (known finding:F5) (1.0s) |
| ReviewVsModerate | AtMostOneAccepted | finding:F5 | fail | 12569 | ok (known finding:F5) (1.1s) |
| ReviewVsModerate | CreditPaidOnce | finding:F5 | fail | 2461 | ok (known finding:F5) (0.9s) |
| ReviewVsModerate | OneReviewPerReviewer | pass | pass | 182557 | ok (2.7s) |
| ReviewVsModerate | ProjectTracksTask | finding:F5 | fail | 17253 | ok (known finding:F5) (1.2s) |
| ReviewVsModerate | DualKeyHonored | pass | pass | 182557 | ok (2.4s) |
| StaleSubmit | TypeOK | pass | pass | 3565 | ok (1.0s) |
| StaleSubmit | OneActiveClaimPerTask | pass | pass | 3565 | ok (1.1s) |
| StaleSubmit | ActiveClaimMeansClaimed | finding:F2 | fail | 76 | ok (known finding:F2) (0.7s) |
| StaleSubmit | PendingMeansSubmitted | pass | pass | 3565 | ok (1.0s) |
| StaleSubmit | AtMostOnePending | pass | pass | 3565 | ok (1.0s) |
| StaleSubmit | AcceptedMeansDone | pass | pass | 3565 | ok (1.1s) |
| StaleSubmit | AtMostOneAccepted | pass | pass | 3565 | ok (1.0s) |
| StaleSubmit | CreditPaidOnce | pass | pass | 3565 | ok (1.0s) |
| StaleSubmit | OneReviewPerReviewer | pass | pass | 3565 | ok (1.0s) |
| StaleSubmit | ProjectTracksTask | pass | pass | 3565 | ok (1.0s) |
| StaleSubmit | DualKeyHonored | pass | pass | 3565 | ok (1.0s) |

## Shortest paths for rules that break

Steps are the model's action names; the mapping to code is in SKILL.md. Read a path with /statechart to see it as a chart in plain words.

- ClaimRaces / ActiveClaimMeansClaimed (6 steps): ClaimCommit -> ReleaseRead -> ReleaseRead -> ReleaseCommit -> ClaimCommit -> ReleaseCommit
- ClaimRaces / PendingMeansSubmitted (5 steps): ClaimCommit -> ReleaseRead -> SubmitRead -> SubmitCommit -> ReleaseCommit
- ClaimRaces / AtMostOnePending (8 steps): ClaimCommit -> ReleaseRead -> SubmitRead -> SubmitCommit -> ReleaseCommit -> ClaimCommit -> SubmitRead -> SubmitCommit
- ClaimRaces / AcceptedMeansDone (6 steps): ClaimCommit -> ReleaseRead -> SubmitRead -> SubmitCommit -> SubmitSync -> ReleaseCommit
- ClaimRaces / AtMostOneAccepted (8 steps): ClaimCommit -> ReleaseRead -> SubmitRead -> SubmitCommit -> ReleaseCommit -> ClaimCommit -> SubmitRead -> SubmitCommit
- ClaimRaces / CreditPaidOnce (15 steps): ClaimCommit -> SubmitRead -> SubmitCommit -> PeerReviewRead -> PeerReviewRead -> PeerReviewCreate -> PeerReviewCreate -> PeerReviewAvg -> PeerReviewWriteContrib -> PeerReviewWriteTask -> PeerReviewCredit -> PeerReviewAvg -> PeerReviewWriteContrib -> PeerReviewWriteTask -> PeerReviewCredit
- ClaimRaces / OneReviewPerReviewer (7 steps): ClaimCommit -> SubmitRead -> SubmitCommit -> PeerReviewRead -> PeerReviewRead -> PeerReviewCreate -> PeerReviewCreate
- ClaimRaces / ProjectTracksTask (6 steps): ClaimCommit -> ReleaseRead -> SubmitRead -> SubmitCommit -> SubmitSync -> ReleaseCommit
- DualKey / ActiveClaimMeansClaimed (17 steps): ClaimCommit -> SubmitRead -> SubmitCommit -> PeerReviewRead -> PeerReviewCreate -> PeerReviewAvg -> ModerateRead -> PeerReviewWriteContrib -> PeerReviewWriteTask -> ClaimCommit -> PeerReviewCredit -> ModerateWriteContrib -> ModerateWriteTask -> ModerateCredit -> ModerateReview -> PeerReviewSync -> ModerateSync
- DualKey / PendingMeansSubmitted (19 steps): ClaimCommit -> SubmitRead -> SubmitCommit -> PeerReviewRead -> PeerReviewCreate -> PeerReviewAvg -> ModerateRead -> ModerateWriteContrib -> PeerReviewWriteContrib -> ModerateWriteTask -> ClaimCommit -> SubmitRead -> SubmitCommit -> PeerReviewWriteTask -> ModerateCredit -> PeerReviewCredit -> PeerReviewSync -> ModerateReview -> ModerateSync
- DualKey / AtMostOnePending (17 steps): ClaimCommit -> SubmitRead -> SubmitCommit -> PeerReviewRead -> PeerReviewCreate -> PeerReviewAvg -> ModerateRead -> PeerReviewWriteContrib -> PeerReviewWriteTask -> ClaimCommit -> SubmitRead -> SubmitCommit -> ModerateWriteContrib -> ModerateWriteTask -> ClaimCommit -> SubmitRead -> SubmitCommit
- DualKey / AcceptedMeansDone (16 steps): ClaimCommit -> SubmitRead -> SubmitCommit -> ModerateRead -> PeerReviewRead -> ModerateWriteContrib -> PeerReviewCreate -> PeerReviewAvg -> PeerReviewWriteContrib -> PeerReviewWriteTask -> PeerReviewCredit -> PeerReviewSync -> ModerateWriteTask -> ModerateCredit -> ModerateReview -> ModerateSync
- DualKey / AtMostOneAccepted (19 steps): ClaimCommit -> SubmitRead -> SubmitCommit -> PeerReviewRead -> PeerReviewCreate -> PeerReviewAvg -> ModerateRead -> PeerReviewWriteContrib -> PeerReviewWriteTask -> ClaimCommit -> SubmitRead -> PeerReviewCredit -> PeerReviewSync -> SubmitCommit -> PeerReviewRead -> PeerReviewCreate -> PeerReviewAvg -> PeerReviewWriteContrib -> ModerateWriteContrib
- DualKey / CreditPaidOnce (13 steps): ClaimCommit -> SubmitRead -> SubmitCommit -> PeerReviewRead -> PeerReviewCreate -> ModerateRead -> ModerateWriteContrib -> PeerReviewAvg -> ModerateWriteTask -> PeerReviewWriteContrib -> ModerateCredit -> PeerReviewWriteTask -> PeerReviewCredit
- DualKey / ProjectTracksTask (19 steps): ClaimCommit -> SubmitRead -> SubmitCommit -> PeerReviewRead -> PeerReviewCreate -> PeerReviewAvg -> ModerateRead -> PeerReviewWriteContrib -> PeerReviewWriteTask -> ClaimCommit -> ReleaseRead -> PeerReviewCredit -> PeerReviewSync -> ModerateWriteContrib -> ModerateWriteTask -> ModerateCredit -> ModerateReview -> ModerateSync -> ReleaseCommit
- ExpiryRace / ActiveClaimMeansClaimed (6 steps): ClaimCommit -> SubmitRead -> ExpireRead -> ExpireCommit -> ClaimCommit -> SubmitCommit
- ExpiryRace / PendingMeansSubmitted (8 steps): ClaimCommit -> ReleaseRead -> ExpireRead -> ExpireCommit -> ClaimCommit -> SubmitRead -> SubmitCommit -> ReleaseCommit
- ExpiryRace / AtMostOnePending (11 steps): ClaimCommit -> ReleaseRead -> ExpireRead -> ExpireCommit -> ClaimCommit -> SubmitRead -> SubmitCommit -> ReleaseCommit -> ClaimCommit -> SubmitRead -> SubmitCommit
- ExpiryRace / AcceptedMeansDone (9 steps): ClaimCommit -> SubmitRead -> ExpireRead -> ExpireCommit -> ClaimCommit -> SubmitCommit -> SubmitSync -> ReleaseRead -> ReleaseCommit
- ExpiryRace / AtMostOneAccepted (11 steps): ClaimCommit -> ReleaseRead -> ExpireRead -> ExpireCommit -> ClaimCommit -> SubmitRead -> SubmitCommit -> ReleaseCommit -> ClaimCommit -> SubmitRead -> SubmitCommit
- ExpiryRace / ProjectTracksTask (9 steps): ClaimCommit -> ReleaseRead -> ExpireRead -> ExpireCommit -> ClaimCommit -> SubmitRead -> SubmitCommit -> SubmitSync -> ReleaseCommit
- Reopen / ActiveClaimMeansClaimed (6 steps): ClaimCommit -> SubmitRead -> SubmitCommit -> Reopen -> ClaimCommit -> Reopen
- Reopen / PendingMeansSubmitted (8 steps): ClaimCommit -> SubmitRead -> SubmitCommit -> Reopen -> ClaimCommit -> SubmitRead -> SubmitCommit -> Reopen
- Reopen / AtMostOnePending (11 steps): ClaimCommit -> SubmitRead -> SubmitCommit -> Reopen -> ClaimCommit -> SubmitRead -> SubmitCommit -> Reopen -> ClaimCommit -> SubmitRead -> SubmitCommit
- Reopen / AcceptedMeansDone (11 steps): ClaimCommit -> SubmitRead -> SubmitCommit -> PeerReviewRead -> PeerReviewCreate -> PeerReviewAvg -> PeerReviewWriteContrib -> Reopen -> PeerReviewWriteTask -> PeerReviewCredit -> PeerReviewSync
- Reopen / AtMostOneAccepted (13 steps): ClaimCommit -> SubmitRead -> SubmitCommit -> PeerReviewRead -> PeerReviewCreate -> PeerReviewAvg -> Reopen -> ClaimCommit -> SubmitRead -> PeerReviewWriteContrib -> SubmitCommit -> ModerateRead -> ModerateWriteContrib
- Reopen / CreditPaidOnce (13 steps): ClaimCommit -> SubmitRead -> SubmitCommit -> PeerReviewRead -> PeerReviewCreate -> PeerReviewAvg -> ModerateRead -> PeerReviewWriteContrib -> PeerReviewWriteTask -> ModerateWriteContrib -> ModerateWriteTask -> PeerReviewCredit -> ModerateCredit
- Reopen / ProjectTracksTask (11 steps): ClaimCommit -> SubmitRead -> SubmitCommit -> PeerReviewRead -> PeerReviewCreate -> PeerReviewAvg -> PeerReviewWriteContrib -> PeerReviewWriteTask -> PeerReviewCredit -> PeerReviewSync -> Reopen
- ReviewRetry / ActiveClaimMeansClaimed (6 steps): ClaimCommit -> ReleaseRead -> ReleaseRead -> ReleaseCommit -> ClaimCommit -> ReleaseCommit
- ReviewRetry / PendingMeansSubmitted (5 steps): ClaimCommit -> SubmitRead -> ReleaseRead -> SubmitCommit -> ReleaseCommit
- ReviewRetry / AtMostOnePending (8 steps): ClaimCommit -> SubmitRead -> ReleaseRead -> SubmitCommit -> ReleaseCommit -> ClaimCommit -> SubmitRead -> SubmitCommit
- ReviewRetry / AcceptedMeansDone (11 steps): ClaimCommit -> ReleaseRead -> SubmitRead -> SubmitCommit -> ModerateRead -> ModerateWriteContrib -> ModerateWriteTask -> ModerateCredit -> ModerateReview -> ModerateSync -> ReleaseCommit
- ReviewRetry / CreditPaidOnce (11 steps): ClaimCommit -> SubmitRead -> SubmitCommit -> ModerateRead -> ModerateRead -> ModerateWriteContrib -> ModerateWriteContrib -> ModerateWriteTask -> ModerateCredit -> ModerateWriteTask -> ModerateCredit
- ReviewRetry / OneReviewPerReviewer (7 steps): ClaimCommit -> SubmitRead -> SubmitCommit -> PeerReviewRead -> PeerReviewRead -> PeerReviewCreate -> PeerReviewCreate
- ReviewRetry / ProjectTracksTask (11 steps): ClaimCommit -> ReleaseRead -> SubmitRead -> SubmitCommit -> ModerateRead -> ModerateWriteContrib -> ModerateWriteTask -> ModerateCredit -> ModerateReview -> ModerateSync -> ReleaseCommit
- ReviewVsModerate / ActiveClaimMeansClaimed (17 steps): ClaimCommit -> SubmitRead -> SubmitCommit -> PeerReviewRead -> PeerReviewCreate -> PeerReviewAvg -> ModerateRead -> PeerReviewWriteContrib -> PeerReviewWriteTask -> PeerReviewCredit -> PeerReviewSync -> ClaimCommit -> ModerateWriteContrib -> ModerateWriteTask -> ModerateCredit -> ModerateReview -> ModerateSync
- ReviewVsModerate / PendingMeansSubmitted (19 steps): ClaimCommit -> SubmitRead -> SubmitCommit -> PeerReviewRead -> PeerReviewCreate -> PeerReviewAvg -> ModerateRead -> PeerReviewWriteContrib -> PeerReviewWriteTask -> PeerReviewCredit -> ClaimCommit -> SubmitRead -> PeerReviewSync -> ModerateWriteContrib -> SubmitCommit -> ModerateWriteTask -> ModerateCredit -> ModerateReview -> ModerateSync
- ReviewVsModerate / AtMostOnePending (17 steps): ClaimCommit -> SubmitRead -> SubmitCommit -> PeerReviewRead -> PeerReviewCreate -> PeerReviewAvg -> ModerateRead -> PeerReviewWriteContrib -> PeerReviewWriteTask -> ModerateWriteContrib -> ClaimCommit -> SubmitRead -> SubmitCommit -> ModerateWriteTask -> ClaimCommit -> SubmitRead -> SubmitCommit
- ReviewVsModerate / AcceptedMeansDone (16 steps): ClaimCommit -> SubmitRead -> SubmitCommit -> PeerReviewRead -> PeerReviewCreate -> PeerReviewAvg -> ModerateRead -> ModerateWriteContrib -> PeerReviewWriteContrib -> PeerReviewWriteTask -> PeerReviewCredit -> PeerReviewSync -> ModerateWriteTask -> ModerateCredit -> ModerateReview -> ModerateSync
- ReviewVsModerate / AtMostOneAccepted (18 steps): ClaimCommit -> SubmitRead -> SubmitCommit -> PeerReviewRead -> PeerReviewCreate -> ModerateRead -> PeerReviewAvg -> ModerateWriteContrib -> PeerReviewWriteContrib -> ModerateWriteTask -> ClaimCommit -> SubmitRead -> SubmitCommit -> ModerateCredit -> ModerateReview -> ModerateSync -> ModerateRead -> ModerateWriteContrib
- ReviewVsModerate / CreditPaidOnce (13 steps): ClaimCommit -> SubmitRead -> SubmitCommit -> PeerReviewRead -> PeerReviewCreate -> PeerReviewAvg -> ModerateRead -> PeerReviewWriteContrib -> PeerReviewWriteTask -> PeerReviewCredit -> ModerateWriteContrib -> ModerateWriteTask -> ModerateCredit
- ReviewVsModerate / ProjectTracksTask (19 steps): ClaimCommit -> SubmitRead -> SubmitCommit -> PeerReviewRead -> PeerReviewCreate -> PeerReviewAvg -> ModerateRead -> PeerReviewWriteContrib -> ModerateWriteContrib -> ModerateWriteTask -> ClaimCommit -> ReleaseRead -> PeerReviewWriteTask -> PeerReviewCredit -> PeerReviewSync -> ModerateCredit -> ModerateReview -> ModerateSync -> ReleaseCommit
- StaleSubmit / ActiveClaimMeansClaimed (6 steps): ClaimCommit -> SubmitRead -> ExpireRead -> ExpireCommit -> ClaimCommit -> SubmitCommit

