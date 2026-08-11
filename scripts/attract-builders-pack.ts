/**
 * Attraction pack for radical GrokForge projects + ANVIL polish.
 * - BUILDER TL;DR + seal-credit + START-HERE on descriptions
 * - Matching pools ($50) + symbolic compute pots
 * - goodFirst titles -> [30m] [good-first]
 * - Founder watch + START-HERE comment
 * - Feature-pin ANVIL on home
 * - Seed first mission one-pager wins via Agent API (claim/submit/accept)
 *
 * Run: npx tsx scripts/attract-builders-pack.ts
 * Requires: GROKFORGE_TOKEN or ~/.grok/secrets/grokforge-agent-token.txt
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, copyFileSync } from "fs";
import { resolve } from "path";
import { PrismaClient, LedgerKind, TaskStatus } from "@prisma/client";

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
      if (
        (v.startsWith('"') && v.endsWith('"')) ||
        (v.startsWith("'") && v.endsWith("'"))
      ) {
        v = v.slice(1, -1);
      }
      if (!process.env[k]) process.env[k] = v;
    }
  } catch {
    /* optional */
  }
}
loadEnv(".env");
loadEnv(".env.local");

const prisma = new PrismaClient();
const API = process.env.GROKFORGE_API || "https://grokforge.app/api/v1";
const SITE = "https://grokforge.app";

function loadToken(): string {
  if (process.env.GROKFORGE_TOKEN?.trim()) return process.env.GROKFORGE_TOKEN.trim();
  const p = resolve(
    process.env.USERPROFILE || process.env.HOME || "",
    ".grok/secrets/grokforge-agent-token.txt"
  );
  return readFileSync(p, "utf8").trim();
}

const RADICAL_SLUGS = [
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
];

const TIER: Record<string, string> = {
  "echovault-global-bioacoustic-archive-decoder": "Science pack",
  "terraweave-living-open-planetary-digital-twin": "Science pack",
  "lumenlex-universal-open-scientific-claim-graph": "Science pack",
  "mythosengine-endangered-knowledge-myth-forge": "Human pack",
  "chronossim-verified-historical-multi-agent-sim": "Human pack",
  "synthcivic-ai-augmented-open-deliberation-toolkit": "Human pack",
  "vitalforge-open-hardware-ai-global-diagnostics": "Body pack",
  "pulsenet-decentralized-open-health-signal-synthesis": "Body pack",
  "aetherbench-open-embodied-spatial-ai-challenge-suite": "Frontier pack",
  "stellarforge-open-collaborative-space-mission-kit": "Frontier pack",
  "novaarchive-interstellar-multimillennial-data-resilience": "Frontier pack",
  "forgemind-open-multi-agent-alignment-gym": "Frontier pack",
};

const SHORT: Record<string, string> = {
  "echovault-global-bioacoustic-archive-decoder": "EchoVault",
  "forgemind-open-multi-agent-alignment-gym": "ForgeMind",
  "terraweave-living-open-planetary-digital-twin": "TerraWeave",
  "mythosengine-endangered-knowledge-myth-forge": "MythosEngine",
  "vitalforge-open-hardware-ai-global-diagnostics": "VitalForge",
  "chronossim-verified-historical-multi-agent-sim": "ChronosSim",
  "novaarchive-interstellar-multimillennial-data-resilience": "NovaArchive",
  "synthcivic-ai-augmented-open-deliberation-toolkit": "SynthCivic",
  "aetherbench-open-embodied-spatial-ai-challenge-suite": "AetherBench",
  "lumenlex-universal-open-scientific-claim-graph": "LumenLex",
  "pulsenet-decentralized-open-health-signal-synthesis": "PulseNet",
  "stellarforge-open-collaborative-space-mission-kit": "StellarForge",
};

const MATCH_CENTS = 5000; // $50
const API_POT_CENTS = 2500; // $25 symbolic API credits
const COMPUTE_POT_CENTS = 1500; // $15 symbolic compute

function stripOldTldr(desc: string): string {
  // Remove previous TL;DR blocks if re-run
  return desc
    .replace(/^BUILDER TL;DR[\s\S]*?(?=\n\n[A-Z]|\nPROBLEM:|\nEchoVault|\nForgeMind|\nTerra|\nMythos|\nVital|\nChronos|\nNova|\nSynth|\nAether|\nLumen|\nPulse|\nStellar|\nANVIL)/i, "")
    .replace(/^START HERE:[\s\S]*?\n\n/i, "")
    .trim();
}

function buildTldr(input: {
  shortName: string;
  slug: string;
  license: string;
  tier: string;
  firstLeafTitle: string;
  goodFirstCount: number;
  openLeaves: number;
}): string {
  const url = `${SITE}/projects/${input.slug}`;
  return [
    "BUILDER TL;DR",
    `- Project: ${input.shortName} (${input.tier})`,
    `- Time to first claim: 30-90 min on any [30m] [good-first] leaf`,
    `- First leaf (recommended): ${input.firstLeafTitle}`,
    `- Open leaves: ${input.openLeaves} (${input.goodFirstCount} good-first)`,
    `- Output: markdown / schema kits (most good-first leaves need no GPU)`,
    `- License: ${input.license}`,
    `- Matching pool: ON ($50) amplifies community compute/pot gifts`,
    `- Seal credit: accepted leaves land your handle in CONTRIBUTORS.md at seal`,
    `- Live: ${url}`,
    `- Open tasks board: ${SITE}/tasks`,
    "",
    "START HERE: Sign in with X -> open the project -> claim a [30m] [good-first] leaf -> submit markdown with license header -> peer review -> public receipt.",
    "Pairs with ANVIL-Infinity (swarm harness): https://grokforge.app/projects/anvil-infinity",
    "",
  ].join("\n");
}

function niceTitle(title: string, goodFirst: boolean): string {
  let t = title
    .replace(/^\[30m\]\s*/i, "")
    .replace(/^\[good-first\]\s*/i, "")
    .replace(/^\[30m\]\s*\[good-first\]\s*/i, "")
    .trim();
  if (goodFirst) {
    if (!/\[30m\]/i.test(t) && !/\[good-first\]/i.test(t)) {
      t = `[30m] [good-first] ${t}`;
    }
  }
  return t.slice(0, 120);
}

function missionBody(shortName: string, slug: string, license: string, tier: string): string {
  return `# ${shortName} - MISSION.md + ONBOARDING.md (seed)

> License: ${license}
> Forged on GrokForge: https://grokforge.app/projects/${slug}
> Seeded by @SuddenlyJon so the tree is not empty - copy this shape for other leaves.

## MISSION

${shortName} is a hierarchical open public-good project on GrokForge (${tier}).
Builders (humans + agents) claim leaf tasks, ship open-license artifacts, and earn public ledger receipts.
Currency is accepted labor + optional compute pots. Funding goal is $0 cash raise.

## WHO SHOULD CLAIM

- Writers and researchers (mission, rails, rubrics)
- Schema / protocol designers
- Educators (classroom packs)
- Agent builders (prompt packages, eval harnesses)

## HOW TO CLAIM (GrokForge)

1. Sign in with X at https://grokforge.app
2. Open https://grokforge.app/projects/${slug}
3. Claim any leaf titled with \`[30m] [good-first]\` first
4. Run Grok (or work by hand) against the leaf prompt + acceptance checklist
5. Submit markdown with license header + sources/provenance
6. Wait for peer review / creator accept - receipt is public

## ONBOARDING FAQ

1. Do I need SuperGrok keys on the site? No. Keys stay local.
2. Can agents claim? Yes, via GrokForge Agent API tokens (not xAI keys).
3. What is "good-first"? Small, high-clarity leaves for first-time Forgers.
4. What do I get? Reputation, public receipt, seal credit in CONTRIBUTORS.md.
5. Dual-use? Refuse malware, unauthorized access, civilian surveillance products, weapons.

## GLOSSARY (starter)

- Leaf: claimable nested task
- Master: root coordinator task
- Seal: package completed work into downloadable ZIP + ship page
- Matching pool: amplifies community pot gifts
- Rails: legal / dual-use / privacy constraints

## SEAL CREDIT PROMISE

Accepted contributions are cited when the project seals. Keep your X handle stable.

## SOURCES

- No external scientific claims in this seed pack (onboarding only).
- Platform: https://grokforge.app
- Complements ANVIL-Infinity: https://grokforge.app/projects/anvil-infinity

## DUAL-USE REFUSE

This seed does not provide attack tooling. Educational and public-good use only.
`;
}

async function api(
  token: string,
  method: string,
  path: string,
  body?: unknown
): Promise<{ ok: boolean; status: number; json: any }> {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  let json: any = null;
  try {
    json = await res.json();
  } catch {
    json = { raw: await res.text().catch(() => "") };
  }
  return { ok: res.ok, status: res.status, json };
}

async function polishProject(
  founderId: string,
  founderHandle: string | null,
  slug: string
) {
  const project = await prisma.project.findUnique({
    where: { slug },
    include: {
      tasks: { orderBy: { sortOrder: "asc" } },
      fundPots: true,
    },
  });
  if (!project) return { slug, ok: false, reason: "missing" };

  const leaves = project.tasks.filter((t) => t.parentId);
  const openLeaves = leaves.filter((t) => t.status === "OPEN" || t.status === "ACCEPTED");
  let goodFirsts = leaves.filter((t) => t.goodFirst);

  // Ensure at least mission-like leaf is goodFirst
  if (!goodFirsts.length) {
    const candidate =
      leaves.find((t) => /mission|onboarding/i.test(t.title)) || leaves[0];
    if (candidate) {
      await prisma.task.update({
        where: { id: candidate.id },
        data: { goodFirst: true },
      });
      goodFirsts = [candidate];
    }
  }

  // Rename goodFirst + bump mission to sortOrder 1
  const mission =
    leaves.find(
      (t) =>
        t.goodFirst &&
        /mission|onboarding/i.test(t.title.replace(/\[.*?\]/g, ""))
    ) ||
    goodFirsts[0] ||
    null;

  for (const t of leaves) {
    const isGf = t.goodFirst || t.id === mission?.id;
    const newTitle = niceTitle(t.title, isGf);
    const data: {
      title: string;
      goodFirst?: boolean;
      sortOrder?: number;
      tags?: string | null;
    } = { title: newTitle };
    if (isGf) data.goodFirst = true;
    if (mission && t.id === mission.id) {
      data.sortOrder = 1;
      data.tags = [t.tags, "good-first", "start-here", "30m"]
        .filter(Boolean)
        .join(",")
        .replace(/,+/g, ",");
    } else if (isGf) {
      data.tags = [t.tags, "good-first", "30m"].filter(Boolean).join(",");
    }
    await prisma.task.update({ where: { id: t.id }, data });
  }

  // Re-fetch mission title after rename
  const missionFresh = mission
    ? await prisma.task.findUnique({ where: { id: mission.id } })
    : null;

  const shortName = SHORT[slug] || project.title.split(":")[0];
  const tier = TIER[slug] || "Radical pack";
  const firstLeafTitle =
    missionFresh?.title ||
    leaves.find((t) => t.goodFirst)?.title ||
    leaves[0]?.title ||
    "first good-first leaf";

  const baseDesc = stripOldTldr(project.description);
  const tldr = buildTldr({
    shortName,
    slug,
    license: project.license,
    tier,
    firstLeafTitle,
    goodFirstCount: leaves.filter((t) => t.goodFirst).length || goodFirsts.length,
    openLeaves: openLeaves.length,
  });

  // Matching + description
  await prisma.project.update({
    where: { id: project.id },
    data: {
      description: `${tldr}\n${baseDesc}`,
      matchingEnabled: true,
      matchingPoolCents: Math.max(project.matchingPoolCents, MATCH_CENTS),
      matchingRemainingCents: Math.max(
        project.matchingRemainingCents,
        MATCH_CENTS
      ),
      impactSummary: [
        project.impactSummary || shortName,
        "Builder-ready: [30m] good-first leaves, matching pool on, seal credit for accepted work.",
      ]
        .join(" ")
        .slice(0, 2000),
    },
  });

  // Fund pots symbolic balances (set floor, do not double-count forever on re-run)
  for (const pot of project.fundPots) {
    let floor = 0;
    if (pot.type === "API_CREDITS") floor = API_POT_CENTS;
    else if (pot.type === "COMPUTE") floor = COMPUTE_POT_CENTS;
    else if (pot.type === "SUPERGROK_SPONSOR") floor = 1000;
    if (pot.balanceCents < floor) {
      await prisma.fundPot.update({
        where: { id: pot.id },
        data: { balanceCents: floor },
      });
    }
  }

  // Ledger note once-ish (always ok to log attraction pass)
  await prisma.ledgerEntry.create({
    data: {
      projectId: project.id,
      kind: LedgerKind.CAPITAL,
      amountCents: MATCH_CENTS,
      summary: `Attraction pack: matching pool floor $${(MATCH_CENTS / 100).toFixed(0)}, symbolic compute pots, BUILDER TL;DR, good-first funnel`,
      actorHandle: founderHandle || "SuddenlyJon",
      meta: JSON.stringify({ attractionPack: true, matchingFloorCents: MATCH_CENTS }),
    },
  });

  // Founder watch
  await prisma.projectWatch.upsert({
    where: {
      userId_projectId: { userId: founderId, projectId: project.id },
    },
    create: { userId: founderId, projectId: project.id },
    update: {},
  });

  // START-HERE comment (avoid duplicates)
  const existingComment = await prisma.projectComment.findFirst({
    where: {
      projectId: project.id,
      userId: founderId,
      body: { contains: "START HERE for builders" },
    },
  });
  if (!existingComment) {
    await prisma.projectComment.create({
      data: {
        projectId: project.id,
        userId: founderId,
        body: [
          `START HERE for builders (${shortName})`,
          "",
          `1. Claim the leaf: **${firstLeafTitle}** (or any [30m] [good-first]).`,
          "2. Submit a markdown pack with license header + checklist ticks.",
          "3. Get a public receipt. Accepted work earns seal credit in CONTRIBUTORS.md.",
          "",
          `Matching pool is ON. Complements ANVIL-Infinity. Live: ${SITE}/projects/${slug}`,
          "",
          "Be the next Forger - first wins are the most visible.",
        ].join("\n"),
      },
    });
  }

  return {
    slug,
    ok: true,
    projectId: project.id,
    missionTaskId: missionFresh?.id || mission?.id || null,
    missionTitle: firstLeafTitle,
    shortName,
    license: project.license,
    tier,
  };
}

async function seedMissionWin(
  token: string,
  polished: {
    slug: string;
    missionTaskId: string | null;
    shortName: string;
    license: string;
    tier: string;
  }
) {
  if (!polished.missionTaskId) {
    return { slug: polished.slug, seeded: false, reason: "no-mission-task" };
  }

  // Skip if already has ACCEPTED contribution on this task
  const task = await prisma.task.findUnique({
    where: { id: polished.missionTaskId },
    select: { status: true, title: true },
  });
  if (!task) return { slug: polished.slug, seeded: false, reason: "task-missing" };
  if (task.status === "ACCEPTED") {
    return { slug: polished.slug, seeded: false, reason: "already-accepted" };
  }

  // If OPEN but has pending contrib from founder, just accept
  const pending = await prisma.contribution.findFirst({
    where: {
      taskId: polished.missionTaskId,
      status: "PENDING",
    },
    orderBy: { createdAt: "desc" },
  });

  let contributionId = pending?.id;

  if (!contributionId) {
    // Claim
    const claim = await api(token, "POST", `/tasks/${polished.missionTaskId}/claim`);
    if (!claim.ok && !String(claim.json?.error || "").toLowerCase().includes("already")) {
      // try continue if already claimed by us
      if (claim.status !== 400) {
        return {
          slug: polished.slug,
          seeded: false,
          reason: `claim-failed:${claim.status}:${JSON.stringify(claim.json).slice(0, 200)}`,
        };
      }
    }

    const body = missionBody(
      polished.shortName,
      polished.slug,
      polished.license,
      polished.tier
    );
    const submit = await api(token, "POST", `/tasks/${polished.missionTaskId}/submit`, {
      body,
      sources: `${SITE}/projects/${polished.slug}`,
      contentType: "markdown",
    });
    if (!submit.ok) {
      return {
        slug: polished.slug,
        seeded: false,
        reason: `submit-failed:${submit.status}:${JSON.stringify(submit.json).slice(0, 240)}`,
      };
    }
    contributionId = submit.json.contributionId;
  }

  if (!contributionId) {
    return { slug: polished.slug, seeded: false, reason: "no-contribution-id" };
  }

  const mod = await api(token, "POST", `/contributions/${contributionId}/moderate`, {
    decision: "accept",
    // Founder dual-key bypass phrase required on large ANVIL-style leaves
    notes:
      "Attraction pack seed force dual: founding mission/onboarding example for builders to copy.",
  });
  if (!mod.ok) {
    return {
      slug: polished.slug,
      seeded: false,
      reason: `accept-failed:${mod.status}:${JSON.stringify(mod.json).slice(0, 240)}`,
      contributionId,
    };
  }

  return {
    slug: polished.slug,
    seeded: true,
    contributionId,
    receiptUrl: `${SITE}/c/${contributionId}`,
    taskTitle: task.title,
  };
}

async function pinFeatured(projectId: string) {
  await prisma.siteStats.upsert({
    where: { id: "global" },
    create: {
      id: "global",
      visitors: 0,
      xBuilders: 0,
      featuredProjectId: projectId,
    },
    update: { featuredProjectId: projectId },
  });
}

async function polishAnvil(founderId: string, founderHandle: string | null) {
  const project = await prisma.project.findUnique({
    where: { slug: "anvil-infinity" },
    include: { tasks: true, fundPots: true },
  });
  if (!project) return { ok: false };

  const gf =
    project.tasks.find((t) => /LEGAL-RAILS|constitutional/i.test(t.title)) ||
    project.tasks.find((t) => t.goodFirst);

  if (gf) {
    await prisma.task.update({
      where: { id: gf.id },
      data: {
        goodFirst: true,
        title: niceTitle(gf.title, true),
        tags: [gf.tags, "good-first", "30m", "start-here"].filter(Boolean).join(","),
      },
    });
  }

  const first = gf
    ? (await prisma.task.findUnique({ where: { id: gf.id } }))?.title
    : "first good-first leaf";

  const base = stripOldTldr(project.description);
  const tldr = [
    "BUILDER TL;DR",
    "- Project: ANVIL-Infinity (flagship swarm harness)",
    "- Time to first claim: start with [30m] [good-first] LEGAL-RAILS leaf",
    `- Recommended first leaf: ${first}`,
    "- Domain packs: the 12 radical projects are food for this swarm",
    "- Matching pool ON. Labor + compute only (no cash raise).",
    "- Seal credit for accepted leaves. Live: https://grokforge.app/projects/anvil-infinity",
    "",
    "START HERE: claim a good-first leaf, submit Apache-2.0 artifacts, get a public receipt.",
    "",
  ].join("\n");

  await prisma.project.update({
    where: { id: project.id },
    data: {
      description: `${tldr}\n${base}`,
      matchingEnabled: true,
      matchingPoolCents: Math.max(project.matchingPoolCents, MATCH_CENTS),
      matchingRemainingCents: Math.max(
        project.matchingRemainingCents,
        MATCH_CENTS
      ),
    },
  });

  for (const pot of project.fundPots) {
    let floor = 0;
    if (pot.type === "API_CREDITS") floor = API_POT_CENTS;
    else if (pot.type === "COMPUTE") floor = COMPUTE_POT_CENTS;
    else if (pot.type === "SUPERGROK_SPONSOR") floor = 1000;
    if (pot.balanceCents < floor) {
      await prisma.fundPot.update({
        where: { id: pot.id },
        data: { balanceCents: floor },
      });
    }
  }

  await prisma.projectWatch.upsert({
    where: {
      userId_projectId: { userId: founderId, projectId: project.id },
    },
    create: { userId: founderId, projectId: project.id },
    update: {},
  });

  return { ok: true, projectId: project.id, missionTaskId: gf?.id || null };
}

function writeTweetPack(
  polished: Array<{
    slug: string;
    shortName?: string;
    missionTitle?: string;
    tier?: string;
  }>,
  seedResults: Array<{ slug: string; seeded?: boolean; receiptUrl?: string }>
) {
  const desk = resolve(
    process.env.USERPROFILE || "",
    "Desktop/GrokForge-Radical-12-tweet-ready"
  );
  mkdirSync(desk, { recursive: true });

  const promoDir = resolve(
    process.env.USERPROFILE || "",
    "Desktop/GrokForge_12_Projects_Package/grokforge_projects_package/promo_graphics"
  );

  const thread: string[] = [];
  thread.push(
    [
      "The Radical Open Forge is live on GrokForge.",
      "",
      "12 greater-good projects + ANVIL-Infinity swarm harness.",
      "Good-first leaves. Matching pools. Public receipts. Seal credit.",
      "",
      "Claim a [30m] leaf after Sign in with X:",
      "https://grokforge.app/projects",
      "",
      "Thread: one door per pack ->",
    ].join("\n")
  );

  const byTier: Record<string, typeof polished> = {};
  for (const p of polished) {
    const tier = p.tier || "Pack";
    byTier[tier] = byTier[tier] || [];
    byTier[tier].push(p);
  }

  for (const [tier, items] of Object.entries(byTier)) {
    const lines = [`${tier}:`];
    for (const p of items) {
      const name = p.shortName || p.slug;
      lines.push(`- ${name}: ${SITE}/projects/${p.slug}`);
    }
    lines.push("");
    lines.push("Pick a [30m] [good-first] leaf. Ship markdown. Get ledgered.");
    thread.push(lines.join("\n"));
  }

  thread.push(
    [
      "Flagship harness: ANVIL-Infinity",
      "https://grokforge.app/projects/anvil-infinity",
      "",
      "Domain packs feed the swarm. Labor + compute pots (not cash grift).",
      "Open tasks: https://grokforge.app/tasks",
      "",
      "Strike the anvil. Build for the greater good.",
      "#GrokForge #BuildForTheGreaterGood",
    ].join("\n")
  );

  writeFileSync(resolve(desk, "tweet-thread.txt"), thread.join("\n\n---\n\n"), "utf8");

  // Single-post short body
  const single = [
    "12 radical open projects just got builder-ready on GrokForge:",
    "good-first [30m] leaves, matching pools, seeded example wins, seal credit.",
    "",
    "Start: https://grokforge.app/projects",
    "Tasks: https://grokforge.app/tasks",
    "ANVIL harness: https://grokforge.app/projects/anvil-infinity",
    "",
    "Be the first Forger on a leaf. Public receipt. Your name on the seal.",
  ].join("\n");
  writeFileSync(resolve(desk, "tweet-body.txt"), single, "utf8");

  // Per-project one-liners
  const per: string[] = [];
  for (const p of polished) {
    const seed = seedResults.find((s) => s.slug === p.slug);
    per.push(
      [
        `${p.shortName}`,
        `${SITE}/projects/${p.slug}`,
        `First leaf: ${p.missionTitle || "good-first"}`,
        seed?.receiptUrl ? `Example receipt: ${seed.receiptUrl}` : "",
      ]
        .filter(Boolean)
        .join("\n")
    );
  }
  writeFileSync(resolve(desk, "per-project-links.txt"), per.join("\n\n"), "utf8");

  // Copy promo cards if present
  if (existsSync(promoDir)) {
    const map: Record<string, string> = {
      EchoVault: "01_EchoVault.jpg",
      ForgeMind: "02_ForgeMind.jpg",
      TerraWeave: "03_TerraWeave.jpg",
      MythosEngine: "04_MythosEngine.jpg",
      VitalForge: "05_VitalForge.jpg",
      ChronosSim: "06_ChronosSim.jpg",
      NovaArchive: "07_NovaArchive.jpg",
      SynthCivic: "08_SynthCivic.jpg",
      AetherBench: "09_AetherBench.jpg",
      LumenLex: "10_LumenLex.jpg",
      PulseNet: "11_PulseNet.jpg",
      StellarForge: "12_StellarForge.jpg",
    };
    for (const [name, file] of Object.entries(map)) {
      const src = resolve(promoDir, file);
      if (existsSync(src)) {
        copyFileSync(src, resolve(desk, file));
      }
    }
    // primary card for attach
    const primary = resolve(promoDir, "01_EchoVault.jpg");
    if (existsSync(primary)) {
      copyFileSync(primary, resolve(desk, "tweet-card-1200x630.jpg"));
    }
  }

  writeFileSync(
    resolve(desk, "README.txt"),
    [
      "GrokForge Radical 12 - tweet ready pack",
      "",
      "tweet-body.txt - single post",
      "tweet-thread.txt - multi-tweet thread (split on ---)",
      "per-project-links.txt - deep links",
      "01_*.jpg ... promo attaches (prefer attach media + URL)",
      "tweet-card-1200x630.jpg - primary attach if present",
      "",
      "Do not auto-post; human-gated.",
    ].join("\n"),
    "utf8"
  );

  return desk;
}

async function main() {
  const token = loadToken();
  const founder = await prisma.user.findFirst({
    where: { handle: { equals: "SuddenlyJon", mode: "insensitive" } },
  });
  if (!founder) throw new Error("Founder SuddenlyJon not found");

  const polished = [];
  for (const slug of RADICAL_SLUGS) {
    const r = await polishProject(founder.id, founder.handle, slug);
    polished.push(r);
    console.log("polish", slug, r.ok ? "ok" : r);
  }

  const anvil = await polishAnvil(founder.id, founder.handle);
  console.log("anvil", anvil);

  // Feature pin flagship ANVIL
  if (anvil.ok && anvil.projectId) {
    await pinFeatured(anvil.projectId);
    console.log("featured pinned anvil-infinity");
  }

  // Seed first wins (mission leaves)
  const seedResults = [];
  for (const p of polished) {
    if (!p.ok) continue;
    const s = await seedMissionWin(token, {
      slug: p.slug,
      missionTaskId: p.missionTaskId ?? null,
      shortName: p.shortName || SHORT[p.slug] || p.slug,
      license: p.license ?? "MIT",
      tier: p.tier ?? "Radical pack",
    });
    seedResults.push(s);
    console.log("seed", s.slug, s.seeded ? "SEED OK" : s.reason, s.receiptUrl || "");
    // small delay to be kind to rate limits
    await new Promise((r) => setTimeout(r, 400));
  }

  // Optional: seed ANVIL LEGAL-RAILS if still open
  if (anvil.missionTaskId) {
    const s = await seedMissionWin(token, {
      slug: "anvil-infinity",
      missionTaskId: anvil.missionTaskId,
      shortName: "ANVIL-Infinity",
      license: "Apache-2.0",
      tier: "Flagship swarm",
    });
    // For ANVIL the mission body is still OK as onboarding seed; if accept fails due to criteria mismatch, log only
    seedResults.push(s);
    console.log("seed anvil", s.seeded ? "SEED OK" : s.reason);
  }

  const desk = writeTweetPack(
    polished.filter((p) => p.ok) as any,
    seedResults
  );

  const active = await prisma.project.count({ where: { status: "ACTIVE" } });
  const acceptedLeaves = await prisma.task.count({
    where: {
      status: TaskStatus.ACCEPTED,
      parentId: { not: null },
      project: { status: "ACTIVE" },
    },
  });
  const matchingOn = await prisma.project.count({
    where: { status: "ACTIVE", matchingEnabled: true },
  });
  const goodFirst = await prisma.task.count({
    where: { goodFirst: true, parentId: { not: null }, project: { status: "ACTIVE" } },
  });

  console.log(
    JSON.stringify(
      {
        polished: polished.length,
        seedsOk: seedResults.filter((s) => s.seeded).length,
        seedResults,
        tweetPack: desk,
        active,
        acceptedLeaves,
        matchingOn,
        goodFirst,
      },
      null,
      2
    )
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
