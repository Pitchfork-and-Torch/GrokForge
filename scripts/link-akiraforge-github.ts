/**
 * One-shot ops: attach published GitHub repo to sealed AkiraForge project.
 * Run: npx tsx scripts/link-akiraforge-github.ts
 */
import { PrismaClient, LedgerKind } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const slug = "akiraforge-open-1988-hand-drawn-anime-feature-engine";
  const project = await prisma.project.findUnique({
    where: { slug },
    select: {
      id: true,
      title: true,
      license: true,
      proposer: { select: { handle: true, id: true } },
    },
  });
  if (!project) {
    console.log("PROJECT_NOT_FOUND");
    return;
  }
  const url = "https://github.com/Pitchfork-and-Torch/akiraforge";
  const full = "Pitchfork-and-Torch/akiraforge";
  const existing = await prisma.artifact.findFirst({
    where: { projectId: project.id, source: "github", githubRepo: full },
  });
  if (existing) {
    await prisma.artifact.update({
      where: { id: existing.id },
      data: { url, title: "AkiraForge on GitHub", version: "v1.0.0-gate1" },
    });
    console.log("UPDATED", existing.id);
  } else {
    const art = await prisma.artifact.create({
      data: {
        projectId: project.id,
        title: "AkiraForge on GitHub",
        url,
        license: project.license || "MIT",
        source: "github",
        githubRepo: full,
        version: "v1.0.0-gate1",
        sealedById: project.proposer.id,
        isPrimary: false,
      },
    });
    console.log("CREATED", art.id);
  }
  await prisma.ledgerEntry.create({
    data: {
      projectId: project.id,
      kind: LedgerKind.MILESTONE,
      amountCents: 0,
      summary: `@${project.proposer.handle || "SuddenlyJon"} published sealed package to GitHub (${full})`,
      actorHandle: project.proposer.handle,
      meta: JSON.stringify({
        shipToGitHub: true,
        fullName: full,
        htmlUrl: url,
        via: "ops-script",
        packageVersion: "v1.0.0-gate1",
        releaseUrl:
          "https://github.com/Pitchfork-and-Torch/akiraforge/releases/tag/v1.0.0-gate1",
      }),
    },
  });
  console.log("LEDGER_OK");
}

main().finally(() => prisma.$disconnect());
