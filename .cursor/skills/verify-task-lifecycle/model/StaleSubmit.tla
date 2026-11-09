--------------------------- MODULE StaleSubmit ---------------------------
(* Builders b1 and b2 with one request each, plus the claim-expiry job, and
   nobody releases a claim. Isolates the one way left for a submission to land
   on a task that another builder now holds: the submitter's claim expired
   while the submit request was in flight. *)
EXTENDS TaskLifecycle
CONSTANTS b1, b2, creator, cron, b1a, b2a, x1
OwnerStaleSubmit == (b1a :> b1) @@ (b2a :> b2) @@ (x1 :> cron)
=============================================================================
