----------------------------- MODULE DualKey -----------------------------
(* Same actors as ReviewVsModerate on a project with requireDualKey and a
   large leaf: the creator may accept only after a peer review exists. *)
EXTENDS TaskLifecycle
CONSTANTS b1, b2, creator, cron, b1a, b2a, cr1
OwnerDualKey == (b1a :> b1) @@ (b2a :> b2) @@ (cr1 :> creator)
=============================================================================
