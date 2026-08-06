import { NextRequest, NextResponse } from "next/server";
import { LedgerKind } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const secret = process.env.STRIPE_SECRET_KEY;
  const whSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret || !whSecret) {
    return NextResponse.json(
      { error: "Stripe not configured; use demo donate" },
      { status: 501 }
    );
  }

  const Stripe = (await import("stripe")).default;
  const stripe = new Stripe(secret);
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");
  if (!sig) return NextResponse.json({ error: "No signature" }, { status: 400 });

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, whSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid signature";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as {
      id: string;
      amount_total: number | null;
      metadata?: Record<string, string>;
    };
    const projectId = session.metadata?.projectId;
    const potId = session.metadata?.potId;
    const donorId = session.metadata?.donorId;
    const message = session.metadata?.message;
    const amountCents = session.amount_total || 0;

    if (projectId && potId && amountCents > 0) {
      const existing = await prisma.donation.findUnique({
        where: { stripeSessionId: session.id },
      });
      if (!existing) {
        const pot = await prisma.fundPot.findUnique({ where: { id: potId } });
        const donor = donorId
          ? await prisma.user.findUnique({ where: { id: donorId } })
          : null;
        await prisma.$transaction([
          prisma.donation.create({
            data: {
              projectId,
              potId,
              donorId: donorId || null,
              amountCents,
              publicName: donor?.handle ? `@${donor.handle}` : donor?.name || "Anonymous",
              message: message || null,
              stripeSessionId: session.id,
            },
          }),
          prisma.fundPot.update({
            where: { id: potId },
            data: { balanceCents: { increment: amountCents } },
          }),
          prisma.ledgerEntry.create({
            data: {
              projectId,
              kind: LedgerKind.CAPITAL,
              amountCents,
              summary: `${donor?.handle ? `@${donor.handle}` : "Donor"} funded ${pot?.label || "pot"} via Stripe`,
              actorHandle: donor?.handle,
            },
          }),
        ]);
      }
    }
  }

  return NextResponse.json({ received: true });
}
