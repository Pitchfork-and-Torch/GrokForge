import { PrismaClient, LedgerKind } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const proj = await prisma.project.findUnique({
    where: { slug: "anvil-infinity" },
  });
  if (!proj) {
    console.log("anvil-infinity not found");
    return;
  }
  await prisma.project.update({
    where: { id: proj.id },
    data: {
      matchingEnabled: true,
      matchingRatioBps: 10000,
      matchingPoolCents: { increment: 5000 },
      matchingRemainingCents: { increment: 5000 },
    },
  });
  await prisma.ledgerEntry.create({
    data: {
      projectId: proj.id,
      kind: LedgerKind.CAPITAL,
      amountCents: 5000,
      summary: "@SuddenlyJon funded matching pool +$50.00 (demo seed)",
      actorHandle: "SuddenlyJon",
      meta: JSON.stringify({ matchingPoolFund: true, demoSeed: true }),
    },
  });
  console.log("funded anvil match pool +50 USD");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
