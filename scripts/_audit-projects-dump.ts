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
loadEnv(".env");
loadEnv(".env.local");
const prisma = new PrismaClient();

const slugs = [
  "echovault-global-bioacoustic-archive-decoder",
  "forgemind-open-multi-agent-alignment-gym",
  "terraweave-living-open-planetary-digital-twin",
  "mythosengine-endangered-knowledge-myth-forge",
  "vitalforge-open-hardware-ai-global-diagnostics",
  "chronossim-verified-historical-multi-agent-sim",
  "novaarchive-interstellar-multimillennial-data-resilience",
  "synthcivic-ai-augmented-open-deliberation-toolkit",
  "aetherbench-open-embodied-spatial-ai-challenge-suite",
  "lumenlex-universal-open-scientific-claim-graph",
  "pulsenet-decentralized-open-health-signal-synthesis",
  "stellarforge-open-collaborative-space-mission-kit",
  "anvil-infinity",
  "akiraforge-open-1988-hand-drawn-anime-feature-engine",
  "open-agent-civic-toolkit",
  "open-source-protection-literacy-kits-for-newsrooms-and-ngos",
];

async function main() {
  const projects = await prisma.project.findMany({
    where: { OR: [{ slug: { in: slugs } }, { status: "ACTIVE" }] },
    select: {
      id: true, slug: true, title: true, status: true, category: true, license: true,
      description: true, impactSummary: true, alignmentCheck: true, fundingGoalCents: true,
      tasks: {
        orderBy: { sortOrder: "asc" },
        select: {
          id: true, title: true, prompt: true, acceptanceCriteria: true,
          estimatedTokens: true, status: true, parentId: true, sortOrder: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
  for (const p of projects) {
    const roots = p.tasks.filter(t => !t.parentId);
    const leaves = p.tasks.filter(t => t.parentId);
    console.log("\n###", p.slug, "|", p.status, "|", p.category, "|", p.license);
    console.log("TITLE:", p.title);
    console.log("IMPACT:", (p.impactSummary || "").slice(0, 200));
    console.log("DESC:", p.description.slice(0, 280).replace(/\s+/g, " "));
    console.log("ROOTS:", roots.length, "LEAVES:", leaves.length);
    for (const t of p.tasks) {
      const kind = t.parentId ? "L" : "R";
      console.log(`  [${kind}/${t.status}] ${t.sortOrder} ${t.title} | tok=${t.estimatedTokens}`);
      console.log(`      prompt: ${t.prompt.slice(0, 140).replace(/\s+/g, " ")}`);
      console.log(`      accept: ${t.acceptanceCriteria.slice(0, 120).replace(/\s+/g, " ")}`);
    }
  }
  console.log("\nTOTAL_PROJECTS", projects.length);
}
main().catch(e => { console.error(e); process.exit(1); }).finally(async () => prisma.$disconnect());
