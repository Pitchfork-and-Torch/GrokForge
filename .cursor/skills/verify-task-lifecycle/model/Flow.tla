------------------------------ MODULE Flow ------------------------------
(* One builder and the creator, one request at a time each, no claim expiry,
   no reopen: the intended path of a leaf. Small enough to draw whole. *)
EXTENDS TaskLifecycle
CONSTANTS b1, creator, cron, b1a, cr1
OwnerFlow == (b1a :> b1) @@ (cr1 :> creator)
=============================================================================
