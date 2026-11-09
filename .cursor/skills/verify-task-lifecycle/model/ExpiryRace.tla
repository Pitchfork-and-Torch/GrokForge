--------------------------- MODULE ExpiryRace ---------------------------
(* Builders b1 and b2 with one request each, plus the claim-expiry job. No
   creator and no second session per person, so the only way a claim and a
   submission can cross is through expiry. *)
EXTENDS TaskLifecycle
CONSTANTS b1, b2, creator, cron, b1a, b2a, x1
OwnerExpiryRace == (b1a :> b1) @@ (b2a :> b2) @@ (x1 :> cron)
=============================================================================
