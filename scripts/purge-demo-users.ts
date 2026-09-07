/**
 * Delete seed demo users (and cascade accounts/sessions).
 * Donations keep donorId null if needed - we reassign donations first.
 * Run: npx tsx scripts/purge-demo-users.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const demos = await prisma.user.findMany({
    where: {
      OR: [
        { email: { endsWith: "@grokforge.demo" } },
        { email: { endsWith: "@x-demo.grokforge.local" } },
        { handle: { in: ["alice_rivers", "bob_publicgoods", "carol_builds"] } },
      ],
    },
    select: { id: true, email: true, handle: true },
  });

  if (demos.length === 0) {
    console.log("no demo users");
    return;
  }

  const ids = demos.map((d) => d.id);
  // Keep capital history anonymous rather than delete ledgers
  await prisma.donation.updateMany({
    where: { donorId: { in: ids } },
    data: { donorId: null, publicName: "Anonymous (retired demo)" },
  });
  await prisma.contributionReview.deleteMany({ where: { reviewerId: { in: ids } } });
  await prisma.contribution.deleteMany({ where: { userId: { in: ids } } });
  await prisma.taskClaim.deleteMany({ where: { userId: { in: ids } } });
  // Projects proposed by demos already archived; reassign or leave
  const orphanProjects = await prisma.project.findMany({
    where: { proposerId: { in: ids } },
    select: { id: true, slug: true },
  });
  for (const p of orphanProjects) {
    await prisma.project.update({
      where: { id: p.id },
      data: { status: "ARCHIVED" },
    });
    console.log("archived project", p.slug);
  }
  await prisma.session.deleteMany({ where: { userId: { in: ids } } });
  await prisma.account.deleteMany({ where: { userId: { in: ids } } });
  await prisma.user.deleteMany({ where: { id: { in: ids } } });

  for (const d of demos) {
    console.log("purged", d.handle, d.email);
  }
  console.log("done", demos.length);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
