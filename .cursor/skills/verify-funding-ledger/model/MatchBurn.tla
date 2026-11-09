---------------------------- MODULE MatchBurn ----------------------------
(* Two pot donations of 400 cents, one through Stripe and one through the demo
   path, on a project whose match pool holds 600 cents at 1:1. *)
EXTENDS FundingLedger
CONSTANTS p1, p2, d1, d2
KindMatchBurn == (p1 :> "pot") @@ (p2 :> "demo_pot")
AmountMatchBurn == (p1 :> 400) @@ (p2 :> 400)
PaymentMatchBurn == (d1 :> p1) @@ (d2 :> p2)
=============================================================================
