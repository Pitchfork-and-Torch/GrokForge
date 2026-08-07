/**
 * Production-safe seed.
 * Does NOT create sample projects or public demo content.
 * Optional local-only test users only when SEED_DEMO_USERS=true.
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("GrokForge seed (no sample projects)...");

  if (process.env.SEED_DEMO_USERS !== "true") {
    console.log(
      "Skip demo users. Set SEED_DEMO_USERS=true only for local/dev if you need email fixtures."
    );
    console.log("Done. Propose real projects after Sign in with X.");
    return;
  }

  const passwordHash = await bcrypt.hash("demo1234", 10);
  for (const u of [
    {
      email: "alice@grokforge.demo",
      name: "Alice Rivers",
      handle: "alice_rivers",
      reputation: 10,
    },
    {
      email: "bob@grokforge.demo",
      name: "Bob Chen",
      handle: "bob_publicgoods",
      reputation: 10,
    },
    {
      email: "carol@grokforge.demo",
      name: "Carol Okonkwo",
      handle: "carol_builds",
      reputation: 10,
    },
  ]) {
    await prisma.user.upsert({
      where: { email: u.email },
      create: { ...u, passwordHash },
      update: { passwordHash },
    });
    console.log("upsert local user", u.email);
  }
  console.log("No sample projects created.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
