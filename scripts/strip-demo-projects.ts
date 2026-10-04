/**
 * Archive all seed / demo projects so production shows real work only.
 * Run: npx tsx scripts/strip-demo-projects.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const SEED_SLUGS = new Set([
  "open-climate-synthesis-atlas",
  "agent-task-tree-oss",
]);

async function main() {
  const projects = await prisma.project.findMany({
    select: {
      id: true,
      slug: true,
      title: true,
      description: true,
      status: true,
      proposer: { select: { email: true, handle: true } },
    },
  });

  let archived = 0;
  for (const p of projects) {
    if (p.status === "ARCHIVED") continue;
    const email = p.proposer.email || "";
    const isDemoUser = email.endsWith("@grokforge.demo") || email.includes("x-demo.grokforge");
    const isSeedSlug = SEED_SLUGS.has(p.slug);
    const title = p.title.trim().toLowerCase();
    const looksJunk =
      title.length < 8 ||
      /^(test|asdf|sdf|qwer|demo|xxx)/i.test(title) ||
      p.description.trim().length < 40;

    if (isSeedSlug || isDemoUser || looksJunk) {
      await prisma.project.update({
        where: { id: p.id },
        data: { status: "ARCHIVED" },
      });
      console.log("archived", p.slug, p.title);
      archived += 1;
    }
  }
  console.log(`done archived=${archived} scanned=${projects.length}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
