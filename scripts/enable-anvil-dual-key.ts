import { PrismaClient } from "@prisma/client";

async function main() {
  const p = new PrismaClient();
  await p.project.update({
    where: { slug: "anvil-infinity" },
    data: { requireDualKey: true, dualKeyTokenThreshold: 50000 },
  });
  console.log("anvil dual-key on");
  await p.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
