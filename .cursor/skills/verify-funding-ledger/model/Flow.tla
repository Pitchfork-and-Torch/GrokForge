------------------------------ MODULE Flow ------------------------------
(* One pot payment that Stripe delivers twice, one match-pool top-up delivered
   once, on a project with an empty pool. The common case. *)
EXTENDS FundingLedger
CONSTANTS p1, q1, d1, d2, e1
KindFlow == (p1 :> "pot") @@ (q1 :> "pool")
AmountFlow == (p1 :> 400) @@ (q1 :> 600)
PaymentFlow == (d1 :> p1) @@ (d2 :> p1) @@ (e1 :> q1)
=============================================================================
