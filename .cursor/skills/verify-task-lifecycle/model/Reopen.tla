----------------------------- MODULE Reopen -----------------------------
(* Same actors as ReviewVsModerate, with the creator also able to run
   reopenContributionTaskAction. *)
EXTENDS TaskLifecycle
CONSTANTS b1, b2, creator, cron, b1a, b2a, cr1
OwnerReopen == (b1a :> b1) @@ (b2a :> b2) @@ (cr1 :> creator)
=============================================================================
