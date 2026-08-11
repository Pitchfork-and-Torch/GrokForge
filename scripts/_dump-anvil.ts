import { readFileSync } from "fs";
import { resolve } from "path";
import { PrismaClient } from "@prisma/client";
function loadEnv(file: string) {
  try {
    const text = readFileSync(resolve(file), "utf8");
    for (const line of text.split(/\r?\n/)) {
      const t = line.trim();
      if (!t || t.startsWith("#")) continue;
      const i = t.indexOf("=");
      if (i < 0) continue;
      const k = t.slice(0, i).trim();
      let v = t.slice(i + 1).trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
      if (!process.env[k]) process.env[k] = v;
    }
  } catch {}
}
loadEnv(".env"); loadEnv(".env.local");
const prisma = new PrismaClient();
async function main() {
  for (const slug of ["anvil-infinity"]) {
    const r = await prisma.project.findUnique({
      where: { slug },
      select: {
        title: true, impactSummary: true, description: true, status: true,
        tasks: { orderBy: { sortOrder: "asc" }, select: { title: true, parentId: true, status: true, goodFirst: true, tags: true, estimatedTokens: true, prompt: true, acceptanceCriteria: true } },
      },
    });
    console.log(JSON.stringify(r, null, 2));
  }
}
main().finally(() => prisma.$disconnect());
