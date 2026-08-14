/**
 * Upsert the curated launch project under the founder (SuddenlyJon).
 * Run: npx tsx scripts/seed-founder-project.ts
 */
import {
  FundType,
  LedgerKind,
  PrismaClient,
  ProjectCategory,
  TaskStatus,
} from "@prisma/client";

const prisma = new PrismaClient();

const SLUG = "open-agent-civic-toolkit";

async function main() {
  const founder = await prisma.user.findFirst({
    where: { handle: { equals: "SuddenlyJon", mode: "insensitive" } },
  });
  if (!founder) {
    throw new Error("Founder SuddenlyJon not found - Sign in with X first");
  }

  const existing = await prisma.project.findUnique({ where: { slug: SLUG } });
  if (existing) {
    await prisma.project.update({
      where: { id: existing.id },
      data: { status: "ACTIVE", proposerId: founder.id },
    });
    console.log("reactivated", SLUG);
    return;
  }

  const project = await prisma.project.create({
    data: {
      slug: SLUG,
      title: "Open Agent Civic Toolkit",
      description:
        "Build a public, open-license toolkit that helps civic and nonprofit teams use multi-agent Grok workflows for the greater good: FOIA request drafting, meeting minutes synthesis, grant narrative outlines, and volunteer task trees. No surveillance. No paywalled scraping. Every accepted output is MIT/CC-BY and ledgered in public.",
      category: ProjectCategory.PUBLIC_GOODS_SOFTWARE,
      license: "MIT",
      fundingGoalCents: 150000,
      impactSummary:
        "Lower the cost of competent civic ops by shipping reusable agent task packs any org can run with their own keys.",
      alignmentCheck:
        "PASS: public-goods civic software; open license; no dual-use weapons or civilian surveillance.",
      status: "ACTIVE",
      proposerId: founder.id,
      fundPots: {
        create: [
          { type: FundType.API_CREDITS, label: "API / token credits", balanceCents: 0 },
          { type: FundType.SUPERGROK_SPONSOR, label: "SuperGrok for builders", balanceCents: 0 },
          { type: FundType.GENERAL, label: "General pot", balanceCents: 0 },
        ],
      },
      milestones: {
        create: [
          {
            title: "v0 task tree + prompts",
            description: "Publish hierarchical tasks and acceptance criteria for three workflows.",
            targetCents: 50000,
            sortOrder: 0,
          },
          {
            title: "First accepted FOIA pack",
            description: "At least one peer-accepted FOIA draft pack with sources.",
            targetCents: 100000,
            sortOrder: 1,
          },
        ],
      },
      ledgerEntries: {
        create: {
          kind: LedgerKind.MILESTONE,
          amountCents: 0,
          summary: "Project opened by founder - Open Agent Civic Toolkit",
          actorHandle: founder.handle || "SuddenlyJon",
        },
      },
    },
  });

  const root = await prisma.task.create({
    data: {
      projectId: project.id,
      title: "Civic multi-agent toolkit (root)",
      prompt:
        "Coordinate open civic agent packs: FOIA, minutes, grants. Decompose into leaf tasks. No private data exfil.",
      acceptanceCriteria:
        "Root only coordinates; leaf tasks must be independently claimable and MIT-licensed.",
      estimatedTokens: 0,
      status: TaskStatus.OPEN,
      sortOrder: 0,
    },
  });

  const leaves = [
    {
      title: "FOIA request draft pack",
      prompt:
        "Produce a reusable multi-agent prompt pack that drafts FOIA/public-records requests from a plain-language goal. Include jurisdiction checklist, red-flag review, and citation style. Output markdown + JSON schema for the request body.",
      acceptanceCriteria:
        "Includes 3 example scenarios, a refusal policy for illegal requests, and MIT license header.",
      estimatedTokens: 12000,
      sortOrder: 1,
    },
    {
      title: "Meeting minutes synthesis pack",
      prompt:
        "Design hierarchical agent prompts that turn raw public meeting notes/transcripts into structured minutes: decisions, action items, dissent, and open questions. Preserve speaker-neutral tone.",
      acceptanceCriteria:
        "Sample input->output pair, hallucination guardrails, and acceptance rubric for peer review.",
      estimatedTokens: 10000,
      sortOrder: 2,
    },
    {
      title: "Grant narrative outline pack",
      prompt:
        "Create agent prompts that outline nonprofit grant narratives from a one-page brief: problem, solution, metrics, budget notes. Must flag unsupported claims.",
      acceptanceCriteria:
        "Outline template + 2 sample outlines + list of claims that require human sources.",
      estimatedTokens: 10000,
      sortOrder: 3,
    },
    {
      title: "Volunteer task tree generator",
      prompt:
        "Build a prompt that expands a civic campaign goal into a hierarchical volunteer task tree with estimated hours and skills tags.",
      acceptanceCriteria:
        "Tree of depth >= 2, 8+ leaves, each with acceptance criteria suitable for GrokForge claims.",
      estimatedTokens: 8000,
      sortOrder: 4,
    },
  ];

  for (const leaf of leaves) {
    await prisma.task.create({
      data: {
        projectId: project.id,
        parentId: root.id,
        title: leaf.title,
        prompt: leaf.prompt,
        acceptanceCriteria: leaf.acceptanceCriteria,
        estimatedTokens: leaf.estimatedTokens,
        status: TaskStatus.OPEN,
        sortOrder: leaf.sortOrder,
      },
    });
  }

  console.log("created", SLUG, "id", project.id, "proposer", founder.handle);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
