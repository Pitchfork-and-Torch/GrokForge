------------------------ MODULE ReviewVsModerate ------------------------
(* Builder b1, peer reviewer b2 and the creator, one request each, up to two
   submissions: a peer review and a creator decision can overlap, and the
   builder can resubmit while an earlier review is still in flight. *)
EXTENDS TaskLifecycle
CONSTANTS b1, b2, creator, cron, b1a, b2a, cr1
OwnerReviewVsModerate == (b1a :> b1) @@ (b2a :> b2) @@ (cr1 :> creator)
=============================================================================
