import { NextRequest, NextResponse } from "next/server";
import { LedgerKind } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { notifyProjectWatchers, notifyUser } from "@/lib/notify";
import { computeMatch } from "@/lib/matching-funds";
import { persistLedgerSummary, persistPublicPaste } from "@/lib/secret-scan";

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
    const kind = session.metadata?.kind || "pot_donation";
    const projectId = session.metadata?.projectId;
    const potId = session.metadata?.potId;
    const donorId = session.metadata?.donorId;
    const message = persistPublicPaste(session.metadata?.message);
    const amountCents = session.amount_total || 0;

    if (!projectId || amountCents <= 0) {
      return NextResponse.json({ received: true });
    }

    // Idempotency via stripe session id (match pool uses same unique field on donation
    // when pot path; for match pool we use ledger meta / a synthetic donation pot if needed)
    if (kind === "matching_pool") {
      const existing = await prisma.ledgerEntry.findFirst({
        where: {
          projectId,
          meta: { contains: session.id },
        },
      });
      if (existing) {
        return NextResponse.json({ received: true, duplicate: true });
      }

      const project = await prisma.project.findUnique({
        where: { id: projectId },
        select: { id: true, slug: true, title: true, proposerId: true },
      });
      const donor = donorId
        ? await prisma.user.findUnique({ where: { id: donorId } })
        : null;
      if (!project) {
        return NextResponse.json({ received: true });
      }

      await prisma.$transaction([
        prisma.project.update({
          where: { id: projectId },
          data: {
            matchingEnabled: true,
            matchingPoolCents: { increment: amountCents },
            matchingRemainingCents: { increment: amountCents },
          },
        }),
        prisma.ledgerEntry.create({
          data: {
            projectId,
            kind: LedgerKind.CAPITAL,
            amountCents,
            summary: persistLedgerSummary(
              `${donor?.handle ? `@${donor.handle}` : "Donor"} funded matching pool +$${(amountCents / 100).toFixed(2)} via Stripe`
            ),
            actorHandle: donor?.handle,
            meta: JSON.stringify({
              matchingPoolFund: true,
              stripeSessionId: session.id,
            }),
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
          title: `Match pool funded on ${project.title}`,
          body: `${donor?.handle ? `@${donor.handle}` : "A donor"} added $${dollars} to the match pool via Stripe`,
          href: `/projects/${project.slug}`,
        });
      }
      return NextResponse.json({ received: true, kind: "matching_pool" });
    }

    // Default: pot donation (+ matching burn)
    if (projectId && potId && amountCents > 0) {
      const existing = await prisma.donation.findUnique({
        where: { stripeSessionId: session.id },
      });
      if (!existing) {
        const pot = await prisma.fundPot.findUnique({ where: { id: potId } });
        const project = await prisma.project.findUnique({
          where: { id: projectId },
          select: {
            id: true,
            slug: true,
            title: true,
            proposerId: true,
            matchingEnabled: true,
            matchingRatioBps: true,
            matchingRemainingCents: true,
          },
        });
        const donor = donorId
          ? await prisma.user.findUnique({ where: { id: donorId } })
          : null;

        if (project) {
          const match = computeMatch({
            donationCents: amountCents,
            matchingEnabled: project.matchingEnabled,
            matchingRatioBps: project.matchingRatioBps,
            matchingRemainingCents: project.matchingRemainingCents,
          });

          await prisma.$transaction(async (tx) => {
            await tx.donation.create({
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
            });
            await tx.fundPot.update({
              where: { id: potId },
              data: { balanceCents: { increment: amountCents } },
            });
            await tx.ledgerEntry.create({
              data: {
                projectId,
                kind: LedgerKind.CAPITAL,
                amountCents,
                summary: persistLedgerSummary(
                  `${donor?.handle ? `@${donor.handle}` : "Donor"} funded ${pot?.label || "pot"} via Stripe`
                ),
                actorHandle: donor?.handle,
              },
            });
            if (donorId) {
              await tx.user.update({
                where: { id: donorId },
                data: { reputation: { increment: 2 } },
              });
            }
            if (match.matchCents > 0) {
              await tx.project.update({
                where: { id: projectId },
                data: {
                  matchingRemainingCents: { decrement: match.matchCents },
                },
              });
              await tx.fundPot.update({
                where: { id: potId },
                data: { balanceCents: { increment: match.matchCents } },
              });
              await tx.ledgerEntry.create({
                data: {
                  projectId,
                  kind: LedgerKind.CAPITAL,
                  amountCents: match.matchCents,
                  summary: persistLedgerSummary(
                    `Matching funds (${match.ratioLabel}): +$${(match.matchCents / 100).toFixed(2)} to ${pot?.label || "pot"} after Stripe gift`
                  ),
                  actorHandle: "matching-pool",
                  meta: JSON.stringify({
                    matching: true,
                    ratioBps: project.matchingRatioBps,
                    donorId,
                    baseDonationCents: amountCents,
                    stripeSessionId: session.id,
                  }),
                },
              });
            }
          });

          const dollars = (amountCents / 100).toFixed(2);
          const matchNote =
            match.matchCents > 0
              ? ` (+$${(match.matchCents / 100).toFixed(2)} matched)`
              : "";
          if (project.proposerId && project.proposerId !== donorId) {
            await notifyUser({
              userId: project.proposerId,
              type: "DONATION",
              title: `Stripe support on ${project.title}`,
              body: `${donor?.handle ? `@${donor.handle}` : "A donor"} paid $${dollars} via Stripe to ${pot?.label || "a pot"}${matchNote}`,
              href: `/projects/${project.slug}`,
            });
          }
          if (donorId) {
            await notifyUser({
              userId: donorId,
              type: "DONATION_RECEIPT",
              title: `Receipt: $${dollars} to ${project.title}`,
              body: `Stripe payment confirmed for ${pot?.label || "a pot"}${matchNote}. Thank you for funding greater-good work.`,
              href: `/projects/${project.slug}`,
            });
          }
          await notifyProjectWatchers({
            projectId: project.id,
            excludeUserIds: [donorId, project.proposerId].filter(
              Boolean
            ) as string[],
            type: "WATCH_DONATION",
            title: `Watched: ${project.title}`,
            body: `${donor?.handle ? `@${donor.handle}` : "A donor"} paid $${dollars} via Stripe to ${pot?.label || "a pot"}${matchNote}`,
            href: `/projects/${project.slug}`,
          });
        }
      }
    }
  }

  return NextResponse.json({ received: true });
}
