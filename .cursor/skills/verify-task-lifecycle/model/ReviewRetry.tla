--------------------------- MODULE ReviewRetry ---------------------------
(* Builder b1 submits once. Peer reviewer b2 and the creator each have two
   requests in flight (double-click or retry) on that one submission. *)
EXTENDS TaskLifecycle
CONSTANTS b1, b2, creator, cron, b1a, b2a, b2b, cr1, cr2
OwnerReviewRetry == (b1a :> b1) @@ (b2a :> b2) @@ (b2b :> b2) @@ (cr1 :> creator) @@ (cr2 :> creator)
SymReviewRetry == Permutations({b2a, b2b}) \cup Permutations({cr1, cr2})
=============================================================================
