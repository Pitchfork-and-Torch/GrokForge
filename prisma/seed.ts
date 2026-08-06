import { PrismaClient, ProjectCategory, FundType, LedgerKind } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding GrokForge...");

  await prisma.ledgerEntry.deleteMany();
  await prisma.donation.deleteMany();
  await prisma.artifact.deleteMany();
  await prisma.contributionReview.deleteMany();
  await prisma.contribution.deleteMany();
  await prisma.taskClaim.deleteMany();
  await prisma.task.deleteMany();
  await prisma.milestone.deleteMany();
  await prisma.fundPot.deleteMany();
  await prisma.project.deleteMany();
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash("demo1234", 10);

  const alice = await prisma.user.create({
    data: {
      email: "alice@grokforge.demo",
      name: "Alice Rivers",
      handle: "alice_rivers",
      passwordHash,
      reputation: 42,
      capacityNotes: "Climate research + literature synthesis, evenings ET",
      image: "https://api.dicebear.com/9.x/shapes/svg?seed=alice",
    },
  });

  const bob = await prisma.user.create({
    data: {
      email: "bob@grokforge.demo",
      name: "Bob Chen",
      handle: "bob_publicgoods",
      passwordHash,
      reputation: 55,
      capacityNotes: "OSS maintainer bandwidth ~3 tasks/week",
      image: "https://api.dicebear.com/9.x/shapes/svg?seed=bob",
    },
  });

  const carol = await prisma.user.create({
    data: {
      email: "carol@grokforge.demo",
      name: "Carol Okonkwo",
      handle: "carol_builds",
      passwordHash,
      reputation: 18,
      capacityNotes: "Manual mode contributor; strong technical writing",
      image: "https://api.dicebear.com/9.x/shapes/svg?seed=carol",
    },
  });

  // Project 1: Climate / open science
  const climate = await prisma.project.create({
    data: {
      slug: "open-climate-synthesis-atlas",
      title: "Open Climate Synthesis Atlas",
      description:
        "Crowdsource a hierarchical multi-agent literature synthesis of open climate science: map datasets, extract claims with citations, and produce an open-license atlas usable by educators and local policy groups. All outputs MIT/CC-BY. No paywalled scraping.",
      category: ProjectCategory.CLIMATE,
      license: "CC-BY-4.0",
      fundingGoalCents: 250000,
      impactSummary:
        "Public goods knowledge base for climate education and open science replication.",
      alignmentCheck:
        "PASS: greater-good climate/open-science focus; open license required; no surveillance or dual-use weapons research.",
      proposerId: alice.id,
      fundPots: {
        create: [
          { type: FundType.API_CREDITS, label: "API / token credits", balanceCents: 12500 },
          { type: FundType.SUPERGROK_SPONSOR, label: "SuperGrok for builders", balanceCents: 5000 },
          { type: FundType.GENERAL, label: "General pot", balanceCents: 3000 },
        ],
      },
      milestones: {
        create: [
          {
            title: "Corpus map v0",
            description: "Catalog 50 open datasets + paper clusters with license tags.",
            targetCents: 50000,
            sortOrder: 0,
          },
          {
            title: "Claim graph v1",
            description: "Structured claim extraction with sources for top 10 themes.",
            targetCents: 125000,
            sortOrder: 1,
          },
          {
            title: "Educator pack",
            description: "Lesson-ready summaries + activities under open license.",
            targetCents: 250000,
            sortOrder: 2,
          },
        ],
      },
    },
    include: { fundPots: true },
  });

  const climateRoot = await prisma.task.create({
    data: {
      projectId: climate.id,
      title: "Master goal: Climate Synthesis Atlas",
      prompt:
        "Coordinate hierarchical research into an open climate synthesis atlas. Subtasks own clusters; merge only verified open sources.",
      acceptanceCriteria:
        "All nested tasks either open or accepted; root summary artifact published under CC-BY.",
      estimatedTokens: 200000,
      sortOrder: 0,
    },
  });

  const climateT1 = await prisma.task.create({
    data: {
      projectId: climate.id,
      parentId: climateRoot.id,
      title: "Inventory open climate datasets",
      prompt:
        "List open climate/Earth-observation datasets with license, access URL, temporal coverage, and suggested use. Prefer government and academic open portals.",
      acceptanceCriteria:
        "Markdown table with >=15 datasets; each row has license + URL; no paywalled-only sources.",
      estimatedTokens: 25000,
      sortOrder: 1,
    },
  });

  await prisma.task.create({
    data: {
      projectId: climate.id,
      parentId: climateRoot.id,
      title: "Theme: extreme heat & urban equity",
      prompt:
        "Synthesize open literature on urban extreme heat and equity. Extract claims with citations; flag uncertainty.",
      acceptanceCriteria:
        ">=8 sourced claims; uncertainty notes; CC-BY friendly prose.",
      estimatedTokens: 40000,
      sortOrder: 2,
    },
  });

  await prisma.task.create({
    data: {
      projectId: climate.id,
      parentId: climateRoot.id,
      title: "Educator FAQ draft",
      prompt:
        "Write a student-friendly FAQ from open climate science basics for ages 14+. Cite open sources.",
      acceptanceCriteria:
        "10 Q&A pairs, plain language, sources listed.",
      estimatedTokens: 15000,
      sortOrder: 3,
    },
  });

  // Project 2: Public goods software
  const pgs = await prisma.project.create({
    data: {
      slug: "agent-task-tree-oss",
      title: "Agent Task Tree OSS Toolkit",
      description:
        "Build open-source libraries and docs so communities can run hierarchical multi-agent work graphs without proprietary lock-in. Includes schema, claim/submit protocol, and transparency ledger patterns used by GrokForge itself.",
      category: ProjectCategory.PUBLIC_GOODS_SOFTWARE,
      license: "MIT",
      fundingGoalCents: 180000,
      impactSummary:
        "Reusable infrastructure for open multi-agent collaboration and funding transparency.",
      alignmentCheck:
        "PASS: public-goods software; MIT; no key centralization; educational security patterns only.",
      proposerId: bob.id,
      fundPots: {
        create: [
          { type: FundType.COMPUTE, label: "CI / compute", balanceCents: 8000 },
          { type: FundType.API_CREDITS, label: "API credits for docs agents", balanceCents: 4000 },
          { type: FundType.GENERAL, label: "General pot", balanceCents: 2000 },
        ],
      },
      milestones: {
        create: [
          {
            title: "Schema + protocol RFC",
            description: "Published RFC for hierarchical tasks and contribution envelopes.",
            targetCents: 40000,
            sortOrder: 0,
          },
          {
            title: "Reference TS SDK",
            description: "MIT TypeScript SDK for task trees + ledger events.",
            targetCents: 100000,
            sortOrder: 1,
          },
          {
            title: "Interop demos",
            description: "Two demo adapters (CLI + web) with walkthroughs.",
            targetCents: 180000,
            sortOrder: 2,
          },
        ],
      },
    },
  });

  const pgsRoot = await prisma.task.create({
    data: {
      projectId: pgs.id,
      title: "Master goal: Agent Task Tree toolkit",
      prompt:
        "Deliver an MIT toolkit for hierarchical agent tasks, claims, submissions, and public ledgers.",
      acceptanceCriteria:
        "RFC + SDK skeleton + demo README accepted under MIT.",
      estimatedTokens: 150000,
      sortOrder: 0,
    },
  });

  await prisma.task.create({
    data: {
      projectId: pgs.id,
      parentId: pgsRoot.id,
      title: "Draft task-tree JSON schema",
      prompt:
        "Author a JSON Schema for hierarchical tasks (id, parentId, prompt, acceptanceCriteria, estimatedTokens, status).",
      acceptanceCriteria:
        "Valid JSON Schema draft-07; examples included; MIT license header.",
      estimatedTokens: 12000,
      sortOrder: 1,
    },
  });

  await prisma.task.create({
    data: {
      projectId: pgs.id,
      parentId: pgsRoot.id,
      title: "Contribution envelope format",
      prompt:
        "Define the markdown/JSON contribution envelope: body, sources, contentType, reviewer fields.",
      acceptanceCriteria:
        "Spec section + 2 worked examples (markdown + JSON).",
      estimatedTokens: 10000,
      sortOrder: 2,
    },
  });

  await prisma.task.create({
    data: {
      projectId: pgs.id,
      parentId: pgsRoot.id,
      title: "Public ledger event types",
      prompt:
        "Specify ledger event kinds (labor, capital, milestone, adjustment) with privacy rules (no secrets, public amounts).",
      acceptanceCriteria:
        "Event catalog table + privacy notes; ready for implementers.",
      estimatedTokens: 8000,
      sortOrder: 3,
    },
  });

  // Sample contribution + ledger activity
  const claim = await prisma.taskClaim.create({
    data: {
      taskId: climateT1.id,
      userId: carol.id,
      active: false,
      expiresAt: new Date(Date.now() + 86400000),
    },
  });

  await prisma.task.update({
    where: { id: climateT1.id },
    data: { status: "SUBMITTED" },
  });

  const contrib = await prisma.contribution.create({
    data: {
      taskId: climateT1.id,
      claimId: claim.id,
      userId: carol.id,
      contentType: "markdown",
      status: "PENDING",
      body: `# Open climate dataset inventory (sample)

| Dataset | License | URL | Notes |
|---------|---------|-----|-------|
| NASA POWER | Public domain | https://power.larc.nasa.gov/ | Solar/met for research |
| NOAA Climate Data Online | Open | https://www.ncei.noaa.gov/cdo-web/ | Station observations |
| Copernicus CDS | Free with terms | https://cds.climate.copernicus.eu/ | ERA5 etc. |

> Seed submission for demo - expand to 15+ rows in real work.
`,
      sources: "NASA POWER docs; NOAA CDO; Copernicus CDS terms",
    },
  });

  await prisma.artifact.create({
    data: {
      projectId: climate.id,
      contributionId: contrib.id,
      title: "Dataset inventory draft",
      url: `/projects/${climate.slug}#contribution-${contrib.id}`,
      license: "CC-BY-4.0",
    },
  });

  await prisma.ledgerEntry.createMany({
    data: [
      {
        projectId: climate.id,
        kind: LedgerKind.CAPITAL,
        amountCents: 12500,
        summary: "Seed fund: API credits pot",
        actorHandle: "system",
      },
      {
        projectId: climate.id,
        kind: LedgerKind.LABOR,
        amountCents: 0,
        summary: `@carol_builds submitted work on "Inventory open climate datasets"`,
        actorHandle: "carol_builds",
        meta: JSON.stringify({ contributionId: contrib.id, taskId: climateT1.id }),
      },
      {
        projectId: pgs.id,
        kind: LedgerKind.CAPITAL,
        amountCents: 8000,
        summary: "Seed fund: CI / compute pot",
        actorHandle: "system",
      },
    ],
  });

  await prisma.donation.create({
    data: {
      projectId: climate.id,
      potId: climate.fundPots[0].id,
      donorId: bob.id,
      amountCents: 2500,
      publicName: "@bob_publicgoods",
      message: "For open climate knowledge",
      stripeSessionId: "demo_seed_donation_1",
    },
  });

  console.log("Seed complete.");
  console.log("Demo logins (password: demo1234):");
  console.log("  alice@grokforge.demo / bob@grokforge.demo / carol@grokforge.demo");
  console.log("Or use Sign in with X (Demo) on /login");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
