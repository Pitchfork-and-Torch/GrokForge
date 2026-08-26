/**
 * Promote one founder contribution to ACCEPTED showcase receipt.
 * Idempotent: if any ACCEPTED exists, print it and exit.
 *
 * Run: npx tsx scripts/seed-showcase-receipt.ts
 */
import { LedgerKind, PrismaClient, TaskStatus } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const existing = await prisma.contribution.findFirst({
    where: { status: "ACCEPTED" },
    select: {
      id: true,
      user: { select: { handle: true } },
      task: { select: { title: true, project: { select: { slug: true } } } },
    },
  });
  if (existing) {
    console.log(
      JSON.stringify(
        {
          ok: true,
          already: true,
          id: existing.id,
          url: `https://grokforge.app/c/${existing.id}`,
        },
        null,
        2
      )
    );
    return;
  }

  const pending = await prisma.contribution.findFirst({
    where: { status: "PENDING" },
    orderBy: { createdAt: "asc" },
    include: {
      user: true,
      task: { include: { project: true } },
    },
  });
  if (!pending) {
    throw new Error("No pending contribution to promote");
  }

  await prisma.$transaction([
    prisma.contribution.update({
      where: { id: pending.id },
      data: { status: "ACCEPTED", score: 5 },
    }),
    prisma.task.update({
      where: { id: pending.taskId },
      data: { status: TaskStatus.ACCEPTED },
    }),
    prisma.user.update({
      where: { id: pending.userId },
      data: { reputation: { increment: 5 } },
    }),
    prisma.ledgerEntry.create({
      data: {
        projectId: pending.task.projectId,
        kind: LedgerKind.LABOR,
        amountCents: 0,
        summary: `Showcase accept: @${pending.user.handle || "builder"} on "${pending.task.title}" (5/5)`,
        actorHandle: pending.user.handle,
        meta: JSON.stringify({ contributionId: pending.id, showcase: true }),
      },
    }),
  ]);

  const art = await prisma.artifact.findFirst({
    where: { contributionId: pending.id },
  });
  if (!art) {
    await prisma.artifact.create({
      data: {
        projectId: pending.task.projectId,
        contributionId: pending.id,
        title: `Accepted: ${pending.task.title}`,
        url: `/c/${pending.id}`,
        license: pending.task.project.license,
      },
    });
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        already: false,
        id: pending.id,
        title: pending.task.title,
        project: pending.task.project.slug,
        url: `https://grokforge.app/c/${pending.id}`,
        og: `https://grokforge.app/c/${pending.id}/opengraph-image`,
      },
      null,
      2
    )
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
