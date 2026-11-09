-------------------------- MODULE WebhookRetry --------------------------
(* One pot payment and one match-pool top-up, each delivered twice by Stripe
   (a retry or a duplicate), on a project with an empty pool. *)
EXTENDS FundingLedger
CONSTANTS p1, q1, d1, d2, e1, e2
KindWebhookRetry == (p1 :> "pot") @@ (q1 :> "pool")
AmountWebhookRetry == (p1 :> 400) @@ (q1 :> 600)
PaymentWebhookRetry == (d1 :> p1) @@ (d2 :> p1) @@ (e1 :> q1) @@ (e2 :> q1)
=============================================================================
