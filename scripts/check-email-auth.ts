import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const emails = [
    "carol@grokforge.demo",
    "alice@grokforge.demo",
    "bob@grokforge.demo",
  ];
  for (const email of emails) {
    const u = await prisma.user.findUnique({ where: { email } });
    if (!u) {
      console.log(email, "MISSING");
      continue;
    }
    const ok = u.passwordHash
      ? await bcrypt.compare("demo1234", u.passwordHash)
      : false;
    console.log(
      email,
      "handle=" + (u.handle || ""),
      "hasHash=" + Boolean(u.passwordHash),
      "demo1234=" + ok
    );
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
