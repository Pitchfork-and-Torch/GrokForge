--------------------------- MODULE ClaimRaces ---------------------------
(* Builder b1 with two requests in flight (browser plus agent loop, or a retry),
   a second builder b2, and the claim-expiry job. No creator, so only peer
   review by the other builder can move a submission on. This config is
   about claims: release, submit and expiry overlapping. *)
EXTENDS TaskLifecycle
CONSTANTS b1, b2, creator, cron, b1a, b1b, b2a, x1
OwnerClaimRaces == (b1a :> b1) @@ (b1b :> b1) @@ (b2a :> b2) @@ (x1 :> cron)
SymClaimRaces == Permutations({b1a, b1b})
=============================================================================
