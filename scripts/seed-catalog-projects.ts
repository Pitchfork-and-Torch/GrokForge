/**
 * Upsert curated greater-good projects under the founder (SuddenlyJon).
 * Idempotent by slug. Does not create demo bots.
 *
 * Run: npx tsx scripts/seed-catalog-projects.ts
 */
import {
  FundType,
  LedgerKind,
  PrismaClient,
  ProjectCategory,
  TaskStatus,
} from "@prisma/client";

const prisma = new PrismaClient();

type Leaf = {
  title: string;
  prompt: string;
  acceptanceCriteria: string;
  estimatedTokens: number;
  sortOrder: number;
};

type Spec = {
  slug: string;
  title: string;
  description: string;
  category: ProjectCategory;
  license: string;
  fundingGoalCents: number;
  impactSummary: string;
  alignmentCheck: string;
  rootTitle: string;
  rootPrompt: string;
  leaves: Leaf[];
};

const SPECS: Spec[] = [
  {
    slug: "climate-agent-open-data-packs",
    title: "Climate Agent Open Data Packs",
    description:
      "Ship open-license multi-agent packs that turn public climate and energy datasets into clear briefings: emissions inventories, heat-risk neighborhood summaries, and clean-energy permitting checklists. Greater good only. No private surveillance. Every accepted pack is MIT and source-cited.",
    category: ProjectCategory.CLIMATE,
    license: "MIT",
    fundingGoalCents: 120000,
    impactSummary:
      "Help cities, schools, and nonprofits run climate briefings with their own keys and public data only.",
    alignmentCheck:
      "PASS: climate public goods; open license; public data only; no dual-use harm.",
    rootTitle: "Climate open-data agent packs (root)",
    rootPrompt:
      "Coordinate open climate briefing packs from public data. Leaf tasks must be claimable and MIT-licensed.",
    leaves: [
      {
        title: "Municipal emissions briefing pack",
        prompt:
          "Design agent prompts that produce a one-page municipal GHG inventory briefing from public inventory CSVs. Include method notes, uncertainty flags, and a plain-language summary for council packets.",
        acceptanceCriteria:
          "Sample input->output, citation rules for public sources, refusal if data is private/non-public, MIT header.",
        estimatedTokens: 11000,
        sortOrder: 1,
      },
      {
        title: "Heat-risk neighborhood explainer",
        prompt:
          "Produce hierarchical prompts that summarize public heat-island / heat-health layers into neighborhood explainers with action checklists for community groups.",
        acceptanceCriteria:
          "Three neighborhood vignettes, no PII, action list with free/public resources only, peer-review rubric.",
        estimatedTokens: 10000,
        sortOrder: 2,
      },
      {
        title: "Clean energy permitting checklist pack",
        prompt:
          "Create agent prompts that draft permitting checklists for community solar / rooftop PV from public code summaries. Flag where a licensed professional is required.",
        acceptanceCriteria:
          "Checklist template, jurisdiction placeholder fields, professional-referral disclaimer, MIT license.",
        estimatedTokens: 9000,
        sortOrder: 3,
      },
    ],
  },
  {
    slug: "open-science-replication-agents",
    title: "Open Science Replication Agents",
    description:
      "Build multi-agent workflows that help researchers reproduce open papers: extract claims, map code/data availability, run lightweight checks, and publish a public replication report card. Open licenses only. No closed paywalled scraping for private gain.",
    category: ProjectCategory.OPEN_SCIENCE,
    license: "MIT",
    fundingGoalCents: 100000,
    impactSummary:
      "Make small-scale replication and methods transparency cheaper for students and independent labs.",
    alignmentCheck:
      "PASS: open science; reproducibility; no harassment or doxxing of authors.",
    rootTitle: "Open science replication suite (root)",
    rootPrompt:
      "Coordinate claim extraction, data/code availability maps, and report cards for open papers.",
    leaves: [
      {
        title: "Claim extraction schema pack",
        prompt:
          "Define agent prompts + JSON schema that extract primary claims, methods, and limitations from an open-access paper PDF or HTML.",
        acceptanceCriteria:
          "Schema doc, 2 worked examples on open papers, confidence scoring, MIT header.",
        estimatedTokens: 12000,
        sortOrder: 1,
      },
      {
        title: "Code and data availability map",
        prompt:
          "Prompts that search the paper and repo for data/code links, score availability, and list blockers to reproduction.",
        acceptanceCriteria:
          "Scoring rubric (0-5), sample report, no credential stuffing or paywall bypass.",
        estimatedTokens: 9000,
        sortOrder: 2,
      },
      {
        title: "Public replication report card template",
        prompt:
          "Produce a markdown report card template + agent fill prompts for community replications. Emphasize humility and methods clarity.",
        acceptanceCriteria:
          "Template + filled example, peer-review criteria, MIT/CC-BY note for report text.",
        estimatedTokens: 8000,
        sortOrder: 3,
      },
    ],
  },
  {
    slug: "education-tutor-agent-kits",
    title: "Education Tutor Agent Kits",
    description:
      "Open multi-agent tutor kits for free adult learning: literacy practice, study plans, and accessibility-friendly explainers. No student surveillance. No selling personal data. All packs MIT for teachers and learners to run with their own accounts.",
    category: ProjectCategory.EDUCATION,
    license: "MIT",
    fundingGoalCents: 90000,
    impactSummary:
      "Give free tutors and libraries reusable agent kits that respect learner privacy.",
    alignmentCheck:
      "PASS: education public good; privacy-preserving; open license.",
    rootTitle: "Education tutor kits (root)",
    rootPrompt:
      "Coordinate privacy-first tutor packs for adult learning. No tracking of learners.",
    leaves: [
      {
        title: "Adult literacy practice pack",
        prompt:
          "Design multi-agent prompts for short reading practice with scaffolding, vocabulary, and gentle feedback. English first; note i18n hooks.",
        acceptanceCriteria:
          "Lesson loop, sample session, content safety rails, MIT header.",
        estimatedTokens: 10000,
        sortOrder: 1,
      },
      {
        title: "Weekly study plan agent",
        prompt:
          "Prompts that build a one-week study plan from a learner goal + available hours. No account linking; plan is portable markdown.",
        acceptanceCriteria:
          "Plan template, 2 personas, overwork guardrails, peer-review rubric.",
        estimatedTokens: 8000,
        sortOrder: 2,
      },
      {
        title: "Accessible explainer rewrite pack",
        prompt:
          "Agent prompts that rewrite dense public-domain or CC text into plain language with optional simplified and detailed layers.",
        acceptanceCriteria:
          "Before/after examples, reading-level note, license preservation rules, MIT header.",
        estimatedTokens: 9000,
        sortOrder: 3,
      },
    ],
  },
];

async function upsertProject(
  founderId: string,
  founderHandle: string | null,
  spec: Spec
) {
  const existing = await prisma.project.findUnique({ where: { slug: spec.slug } });
  if (existing) {
    await prisma.project.update({
      where: { id: existing.id },
      data: {
        status: "ACTIVE",
        proposerId: founderId,
        title: spec.title,
        description: spec.description,
        impactSummary: spec.impactSummary,
        alignmentCheck: spec.alignmentCheck,
      },
    });
    console.log("updated", spec.slug);
    return { slug: spec.slug, created: false };
  }

  const project = await prisma.project.create({
    data: {
      slug: spec.slug,
      title: spec.title,
      description: spec.description,
      category: spec.category,
      license: spec.license,
      fundingGoalCents: spec.fundingGoalCents,
      impactSummary: spec.impactSummary,
      alignmentCheck: spec.alignmentCheck,
      status: "ACTIVE",
      proposerId: founderId,
      fundPots: {
        create: [
          { type: FundType.API_CREDITS, label: "API / token credits", balanceCents: 0 },
          { type: FundType.GENERAL, label: "General pot", balanceCents: 0 },
          {
            type: FundType.SUPERGROK_SPONSOR,
            label: "SuperGrok for builders",
            balanceCents: 0,
          },
        ],
      },
      milestones: {
        create: [
          {
            title: "v0 task tree shipped",
            description: "All leaf packs published with acceptance criteria.",
            targetCents: Math.round(spec.fundingGoalCents * 0.35),
            sortOrder: 0,
          },
          {
            title: "First accepted pack",
            description: "At least one peer-accepted contribution receipt.",
            targetCents: Math.round(spec.fundingGoalCents * 0.7),
            sortOrder: 1,
          },
        ],
      },
      ledgerEntries: {
        create: {
          kind: LedgerKind.MILESTONE,
          amountCents: 0,
          summary: `Project opened - ${spec.title}`,
          actorHandle: founderHandle || "SuddenlyJon",
        },
      },
    },
  });

  const root = await prisma.task.create({
    data: {
      projectId: project.id,
      title: spec.rootTitle,
      prompt: spec.rootPrompt,
      acceptanceCriteria:
        "Root coordinates only; leaf tasks independently claimable; open license on outputs.",
      estimatedTokens: 0,
      status: TaskStatus.OPEN,
      sortOrder: 0,
    },
  });

  for (const leaf of spec.leaves) {
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

  console.log("created", spec.slug, "leaves", spec.leaves.length);
  return { slug: spec.slug, created: true };
}

async function main() {
  const founder = await prisma.user.findFirst({
    where: { handle: { equals: "SuddenlyJon", mode: "insensitive" } },
  });
  if (!founder) {
    throw new Error("Founder SuddenlyJon not found - Sign in with X first");
  }

  const results = [];
  for (const spec of SPECS) {
    results.push(await upsertProject(founder.id, founder.handle, spec));
  }

  const active = await prisma.project.count({ where: { status: "ACTIVE" } });
  const openLeaves = await prisma.task.count({
    where: {
      status: "OPEN",
      parentId: { not: null },
      project: { status: "ACTIVE" },
    },
  });
  console.log(JSON.stringify({ results, active, openLeaves }, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
