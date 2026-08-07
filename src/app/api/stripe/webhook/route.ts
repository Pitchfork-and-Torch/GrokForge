import { NextRequest, NextResponse } from "next/server";
import { LedgerKind } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { notifyProjectWatchers, notifyUser } from "@/lib/notify";

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
        const project = await prisma.project.findUnique({
          where: { id: projectId },
          select: { id: true, slug: true, title: true, proposerId: true },
        });
        const donor = donorId
          ? await prisma.user.findUnique({ where: { id: donorId } })
          : null;

        if (project) {
          await prisma.$transaction([
            prisma.donation.create({
              data: {
                projectId,
                potId,
                donorId: donorId || null,
                amountCents,
                publicName: donor?.handle
                  ? `@${donor.handle}`
                  : donor?.name || "Anonymous",
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
            ...(donorId
              ? [
                  prisma.user.update({
                    where: { id: donorId },
                    data: { reputation: { increment: 2 } },
                  }),
                ]
              : []),
          ]);

          const dollars = (amountCents / 100).toFixed(2);
          if (project.proposerId && project.proposerId !== donorId) {
            await notifyUser({
              userId: project.proposerId,
              type: "DONATION",
              title: `Stripe support on ${project.title}`,
              body: `${donor?.handle ? `@${donor.handle}` : "A donor"} paid $${dollars} via Stripe to ${pot?.label || "a pot"}`,
              href: `/projects/${project.slug}`,
            });
          }
          if (donorId) {
            await notifyUser({
              userId: donorId,
              type: "DONATION_RECEIPT",
              title: `Receipt: $${dollars} to ${project.title}`,
              body: `Stripe payment confirmed for ${pot?.label || "a pot"}. Thank you for funding greater-good work.`,
              href: `/projects/${project.slug}`,
            });
          }
          await notifyProjectWatchers({
            projectId: project.id,
            excludeUserIds: [donorId, project.proposerId].filter(Boolean) as string[],
            type: "WATCH_DONATION",
            title: `Watched: ${project.title}`,
            body: `${donor?.handle ? `@${donor.handle}` : "A donor"} paid $${dollars} via Stripe to ${pot?.label || "a pot"}`,
            href: `/projects/${project.slug}`,
          });
        }
      }
    }
  }

  return NextResponse.json({ received: true });
}
