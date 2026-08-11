/**
 * Audit-driven enhance for the 12 radical GrokForge projects.
 * - Sharpens purpose (problem, who, in/out scope, complements, seal target, rails)
 * - Replaces OPEN leaves with shippable packs (checkable acceptance, tags, goodFirst)
 * - Bumps master coordinator prompt/acceptance
 * - Light ANVIL polish: tags + one goodFirst
 *
 * Run: npx tsx scripts/enhance-12-radical-projects.ts
 */
import { readFileSync } from "fs";
import { resolve } from "path";
import { PrismaClient, TaskStatus } from "@prisma/client";

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

type LeafIn = {
  title: string;
  prompt: string;
  acceptanceCriteria: string;
  estimatedTokens: number;
  tags: string;
  goodFirst?: boolean;
};

type EnhanceSpec = {
  slug: string;
  title: string;
  impactSummary: string;
  description: string;
  license: string;
  alignmentCheck: string;
  masterPrompt: string;
  masterAcceptance: string;
  leaves: LeafIn[];
};

const FOOTER = `
ARTIFACT FOOTER (required in every accepted deliverable):
- Open license header matching the project
- Sources / provenance section (or explicit "no external claims")
- Dual-use refuse note where relevant
- "Forged on GrokForge" citation when redistributing sealed kits
- No secrets, no PII, no private home paths`;

function railsBlock(projectName: string, extra: string[]): string {
  return [
    `NON-NEGOTIABLE RAILS for ${projectName}:`,
    "1. Truth-seeking and epistemic humility. Prefer unknown over false certainty. No fabricated citations.",
    "2. Open license by default. Every file ships with license header.",
    "3. Independently claimable leaf. Do not require private state from another unfinished leaf.",
    "4. Dual-use refuse: no malware, unauthorized access tooling, civilian surveillance products, weapons design.",
    "5. No secrets, API keys, or PII in artifacts.",
    "6. Peer-reviewable outputs with binary checklists.",
    ...extra.map((e, i) => `${7 + i}. ${e}`),
  ].join("\n");
}

function leaf(
  title: string,
  prompt: string,
  acceptance: string[],
  opts: { tokens?: number; tags: string; goodFirst?: boolean }
): LeafIn {
  return {
    title,
    prompt: prompt.trim() + "\n" + FOOTER,
    acceptanceCriteria: acceptance.map((a) => `- ${a}`).join("\n"),
    estimatedTokens: opts.tokens ?? 80000,
    tags: opts.tags,
    goodFirst: opts.goodFirst ?? false,
  };
}

function purpose(parts: {
  problem: string;
  who: string;
  whyHierarchy: string;
  inScope: string;
  outScope: string;
  complements: string;
  seal: string;
  rails: string;
  body?: string;
}): string {
  return [
    parts.body?.trim() || "",
    "",
    `PROBLEM: ${parts.problem}`,
    `WHO BENEFITS: ${parts.who}`,
    `WHY HIERARCHY: ${parts.whyHierarchy}`,
    `IN SCOPE: ${parts.inScope}`,
    `OUT OF SCOPE: ${parts.outScope}`,
    `COMPLEMENTS: ${parts.complements}`,
    `SEAL TARGET: ${parts.seal}`,
    `RAILS: ${parts.rails}`,
    "Funding goal $0. Currency is accepted open-license labor + optional compute pots (API credits / SuperGrok capacity), not cash fundraising.",
  ]
    .filter((l, i, arr) => !(l === "" && (i === 0 || arr[i - 1] === "")))
    .join("\n")
    .trim();
}

const SPECS: EnhanceSpec[] = [
  // ─── 1 EchoVault ───────────────────────────────────────────
  {
    slug: "echovault-global-bioacoustic-archive-decoder",
    title: "EchoVault: Global Bioacoustic Archive & Decoder",
    license: "CC-BY-SA-4.0 / MIT",
    impactSummary:
      "Ship open bioacoustic data contracts, annotation packs, eval harnesses, and ethics rails so conservation labs and multi-modal AIs can listen to Earth without proprietary lock-in.",
    alignmentCheck:
      "PASS: conservation science public good; open data/code; habitat-sensitivity redaction; no civilian surveillance.",
    description: purpose({
      body: "EchoVault is the open hierarchical forge for planetary bioacoustics: schemas, citizen/sensor pipelines, annotation frameworks, model evaluation suites, monitoring playbooks, and ethics packages that let humans and AIs understand living soundscapes.",
      problem:
        "Biodiversity audio is fragmented across closed sensors, incompatible metadata, and models that cannot be audited or reproduced by field teams.",
      who: "Conservation NGOs, field biologists, citizen science networks, multi-modal AI researchers, educators.",
      whyHierarchy:
        "Data standards, annotation, models, monitoring, UI, and ethics can advance in parallel and merge only after peer review.",
      inScope:
        "Open schemas, labeling kits, eval recipes, monitoring architecture notes, educational query UX, indigenous/sensitive-data ethics, sealed kit packaging.",
      outScope:
        "Secret military acoustic systems, doxxing of sensitive nest/den locations, closed training dumps without license, medical diagnosis claims.",
      complements:
        "TerraWeave (planetary twin layers); LumenLex (scientific claims); ANVIL-Infinity (swarm harness for science packs).",
      seal: "KIT-INDEX + LEGAL-RAILS + accepted schemas/eval/ethics packs under CC-BY-SA (data) + MIT (code/docs as stated).",
      rails:
        "Habitat redaction rules; consent for indigenous knowledge; dual-use refuse for covert surveillance products.",
    }),
    masterPrompt: `You are Master Coordinator for EchoVault on GrokForge.
MISSION: Merge only peer-reviewed open leaves into a sealable bioacoustic public-good kit.
${railsBlock("EchoVault", [
  "Redact precise endangered-habitat coordinates in public artifacts; use coarse grids or delayed release policies.",
  "Never request user xAI keys. Contributors run Grok locally.",
])}
Coordinate data contracts first, then annotation and eval, then monitoring and education. Prefer unknown over overclaiming species IDs.`,
    masterAcceptance: `PASS when all true:
- At least 7 nested leaves accepted under stated licenses
- LEGAL-RAILS + KIT-INDEX present
- Data schema + annotation pack + eval harness design peer-accepted
- Habitat sensitivity / dual-use refuse documented
- No secrets/PII; public GrokForge receipts`,
    leaves: [
      leaf(
        "Ship EchoVault mission one-pager + contributor onboarding",
        `Write MISSION.md and ONBOARDING.md for EchoVault contributors (humans + agents).
Cover: public-good purpose, who can claim, leaf types, license split (CC-BY-SA data / MIT code), habitat sensitivity, how to submit on GrokForge, glossary of bioacoustic terms for newcomers.`,
        [
          "MISSION.md with purpose, who, seal target",
          "ONBOARDING.md with claim/submit steps and 5 FAQ",
          "Glossary of 12+ terms",
          "License split explained",
          "ASCII-safe public markdown",
        ],
        { tokens: 40000, tags: "docs,onboarding,good-first", goodFirst: true }
      ),
      leaf(
        "Author LEGAL-RAILS and habitat sensitivity policy",
        `Author LEGAL-RAILS.md and SENSITIVITY.md for EchoVault: allowed uses, forbidden dual-use (covert civilian surveillance, poaching enablement), habitat redaction, indigenous knowledge consent, required artifact footer, 3 sample refusal responses.`,
        [
          "LEGAL-RAILS.md with allowed/forbidden/footer",
          "SENSITIVITY.md with redaction rules",
          "3+ sample refusals",
          "Contributor checklist",
          "CC-BY or MIT header stated",
        ],
        { tokens: 50000, tags: "legal,ethics,rails", goodFirst: true }
      ),
      leaf(
        "Ship open bioacoustic metadata schema v0 + JSON Schema",
        `Produce bioacoustic-metadata.schema.json and SCHEMA.md: recording device, geohash/coarse location policy, taxa fields, behavior tags, quality scores, license, consent flags, checksum. Include 3 example JSON records (synthetic/public). Document interoperability with common open formats where known.`,
        [
          "Valid JSON Schema file",
          "SCHEMA.md field dictionary",
          "3 example records",
          "Location sensitivity notes",
          "MIT or CC-BY header",
        ],
        { tokens: 90000, tags: "schema,data,standards" }
      ),
      leaf(
        "Build annotation taxonomy + inter-annotator rubric pack",
        `Design LABEL-TAXONOMY.md and IAA-RUBRIC.md for species/behavior/context/quality labels usable by humans and agents. Include decision trees for ambiguous calls, multi-label rules, and a CSV template for annotations.`,
        [
          "Taxonomy with hierarchy depth >=2",
          "IAA rubric with scored dimensions",
          "annotation-template.csv",
          "Ambiguity decision examples (3+)",
          "Open license header",
        ],
        { tokens: 80000, tags: "annotation,taxonomy,eval" }
      ),
      leaf(
        "Design open model eval harness recipes (no closed weights required)",
        `Write EVAL-HARNESS.md + metrics.schema.json for self-supervised, supervised, and zero-shot bioacoustic eval. Define public dataset pointers only (or synthetic fixtures). Include baseline comparison table template and honesty section for domain shift.`,
        [
          "EVAL-HARNESS.md with 3 protocol tracks",
          "metrics.schema.json",
          "Baseline table template",
          "Public dataset pointers or synthetic fixtures",
          "Domain-shift honesty section",
        ],
        { tokens: 100000, tags: "ml,eval,benchmarks" }
      ),
      leaf(
        "Ship real-time monitoring architecture + anomaly playbook",
        `Produce MONITORING-ARCHITECTURE.md and ANOMALY-PLAYBOOK.md: stream ingest, feature extraction, anomaly classes (biodiversity drop, noise events), alert policy, false-positive rails, offline demo design with synthetic streams.`,
        [
          "Architecture diagram (mermaid or ASCII)",
          "Anomaly class catalog (6+)",
          "Alert policy + false-positive rails",
          "Synthetic demo outline",
          "Open stack notes",
        ],
        { tokens: 90000, tags: "monitoring,architecture,ops" }
      ),
      leaf(
        "Design educational query UI pack + agent exploration prompts",
        `Create UX-NOTES.md, sample query cards, and an agent prompt package that helps students explore an archive without fabricating species IDs. Include accessibility and offline classroom mode.`,
        [
          "UX-NOTES.md + 5 query cards",
          "Agent prompt package with refusal for overconfident IDs",
          "Accessibility checklist",
          "Classroom offline mode notes",
          "MIT header",
        ],
        { tokens: 70000, tags: "ux,education,agents,good-first", goodFirst: true }
      ),
      leaf(
        "Ship worked example: 3-site soundscape briefing from public/synthetic data",
        `Produce a worked example pack: three site briefings (markdown) from public or fully synthetic audio metadata only. Show schema fill, labels, and uncertainty. Include before/after narrative for educators.`,
        [
          "3 site briefings",
          "Filled schema examples",
          "Uncertainty tags present",
          "Sources or synthetic disclaimer",
          "Peer-review ready layout",
        ],
        { tokens: 80000, tags: "examples,education,docs" }
      ),
      leaf(
        "Peer-review rubric + KIT-INDEX consolidator",
        `Ship PEER-REVIEW-RUBRIC.md (1-5 dimensions: accuracy, rails, schema compliance, reproducibility, clarity) and KIT-INDEX.md mapping every leaf to output paths for seal packaging.`,
        [
          "Rubric with >=5 scored dimensions",
          "KIT-INDEX template filled for EchoVault",
          "Seal packaging checklist",
          "Required footer block",
          "Usable by non-author reviewers",
        ],
        { tokens: 40000, tags: "meta,review,seal" }
      ),
    ],
  },

  // ─── 2 ForgeMind ───────────────────────────────────────────
  {
    slug: "forgemind-open-multi-agent-alignment-gym",
    title: "ForgeMind: Open Multi-Agent Alignment Gym",
    license: "Apache-2.0",
    impactSummary:
      "Open multi-agent gym specs, scenario packs, metrics, and baselines so researchers can stress-test cooperation, truth-seeking, and robustness without a closed lab stack.",
    alignmentCheck:
      "PASS: AI safety research infrastructure; open license; no weapons or civilian surveillance products.",
    description: purpose({
      body: "ForgeMind is a public proving ground for multi-agent systems: simulation interfaces, scenario libraries, evaluation metrics, baseline agents, replay tooling, hybrid human eval, and continuous challenges focused on cooperation under uncertainty and truth-seeking incentives.",
      problem:
        "Alignment and multi-agent robustness research lacks shared, open, hierarchical gyms with honest metrics and replayable runs.",
      who: "AI safety researchers, multi-agent builders, GrokForge agents, educators teaching cooperation dilemmas.",
      whyHierarchy:
        "Engine, scenarios, metrics, baselines, viz, and human-eval protocols can be claimed independently and merged into one gym kit.",
      inScope:
        "APIs, scenario packs, metrics, baselines, logging/replay schemas, hybrid eval protocols, leaderboard design.",
      outScope:
        "Autonomous weapons scenarios, real-world social engineering kits, closed proprietary benchmarks only, production exploit tooling.",
      complements:
        "ANVIL-Infinity (swarm runtime); AetherBench (embodied/spatial); SynthCivic (deliberation protocols).",
      seal: "Gym kit with engine interface, >=4 scenarios, metrics, baselines, LEGAL-RAILS, KIT-INDEX under Apache-2.0.",
      rails: "Truthfulness over hype; refuse dual-use social manipulation products.",
    }),
    masterPrompt: `You are Master Coordinator for ForgeMind.
MISSION: Assemble an open multi-agent alignment gym from peer-reviewed leaves.
${railsBlock("ForgeMind", [
  "Scenarios must document threat models and intended research use.",
  "Metrics must include honesty/uncertainty scoring, not only reward hacking scores.",
])}
Prefer small testable modules. Merge only Apache-2.0 accepted work.`,
    masterAcceptance: `PASS when:
- >=7 leaves accepted under Apache-2.0
- Engine interface + >=4 scenarios + metrics + baseline catalog peer-accepted
- LEGAL-RAILS + KIT-INDEX present
- No weapons/surveillance scenarios; no secrets`,
    leaves: [
      leaf(
        "Ship ForgeMind mission + onboarding for alignment builders",
        `Write MISSION.md and ONBOARDING.md: purpose, non-goals, who can contribute, glossary (common-pool, deceptive alignment class concepts at education level), how scenarios are reviewed.`,
        [
          "MISSION.md + ONBOARDING.md",
          "Glossary 10+ terms",
          "Non-goals explicit",
          "GrokForge submit tips",
          "Apache-2.0 / CC-BY note",
        ],
        { tokens: 40000, tags: "docs,onboarding,good-first", goodFirst: true }
      ),
      leaf(
        "Author LEGAL-RAILS for multi-agent research gym",
        `LEGAL-RAILS.md: allowed research uses, forbidden dual-use (malware coordination, civilian surveillance products, social engineering as a product), required footer, sample refusals (3+).`,
        [
          "LEGAL-RAILS.md complete",
          "3+ refusals",
          "Contributor checklist",
          "Footer block",
          "License header",
        ],
        { tokens: 45000, tags: "legal,rails,good-first", goodFirst: true }
      ),
      leaf(
        "Specify core sim engine API + agent interface contracts",
        `ENGINE-API.md + agent-interface.schema.json: step loop, observation/action spaces, multi-agent turn model, seeding, determinism notes, extension points. Include minimal pseudocode and 1 toy environment contract.`,
        [
          "ENGINE-API.md",
          "Valid agent-interface.schema.json",
          "Toy env contract",
          "Determinism/seeding notes",
          "Apache-2.0 headers",
        ],
        { tokens: 100000, tags: "engine,api,schema" }
      ),
      leaf(
        "Ship scenario pack v0 (4 research scenarios)",
        `SCENARIOS.md + 4 scenario specs: common-pool resources, structured debate/truth-seeking, scientific collaboration under noise, crisis resource allocation. Each: setup, rewards, failure modes, intended metrics hooks, dual-use notes.`,
        [
          "4 full scenario specs",
          "Shared scenario schema used",
          "Failure modes listed",
          "Dual-use notes per scenario",
          "Apache-2.0",
        ],
        { tokens: 110000, tags: "scenarios,research,content" }
      ),
      leaf(
        "Define evaluation metrics + anti-gaming rubric",
        `METRICS.md covering truthfulness, fairness, robustness, scalability, and collusion risk. Include scoring formulas or decision rules, known failure modes of each metric, and anti-gaming notes.`,
        [
          ">=5 metric definitions",
          "Anti-gaming section",
          "Worked scoring example",
          "Uncertainty reporting required",
          "Apache-2.0",
        ],
        { tokens: 90000, tags: "metrics,eval,alignment" }
      ),
      leaf(
        "Catalog baseline agents + training loop sketches",
        `BASELINES.md: catalog of baseline agent types (random, greedy, cooperative heuristic, simple RL note) with expected behavior on scenario pack. Training loop sketches offline-friendly. No closed weights required.`,
        [
          ">=4 baseline types documented",
          "Expected behavior table",
          "Offline training notes",
          "Hooks to metrics",
          "Apache-2.0",
        ],
        { tokens: 90000, tags: "baselines,agents,ml" }
      ),
      leaf(
        "Design logging, replay, and visualization schemas",
        `logging.schema.json + REPLAY.md + viz notes: event log, causal trace optional, replay UX, privacy of simulated agents (no real PII). Include fixture JSON for one scenario run.`,
        [
          "Valid logging schema",
          "REPLAY.md",
          "Fixture run JSON",
          "Viz notes",
          "Apache-2.0",
        ],
        { tokens: 80000, tags: "observability,schema,ux" }
      ),
      leaf(
        "Human-in-the-loop hybrid evaluation protocol pack",
        `HYBRID-EVAL.md: rater instructions, inter-rater reliability plan, when human override is required, sample score sheet. Educational framing only.`,
        [
          "Protocol + score sheet",
          "IRR plan",
          "Human override rules",
          "3 example rated snippets (synthetic)",
          "License header",
        ],
        { tokens: 70000, tags: "human-eval,protocol,docs" }
      ),
      leaf(
        "Peer-review rubric + KIT-INDEX consolidator",
        `PEER-REVIEW-RUBRIC.md + KIT-INDEX.md for ForgeMind seal packaging and continuous challenge roadmap notes.`,
        [
          "Rubric >=5 dimensions",
          "KIT-INDEX mapped",
          "Challenge roadmap stub",
          "Seal checklist",
          "Footer block",
        ],
        { tokens: 40000, tags: "meta,review,seal" }
      ),
    ],
  },

  // ─── 3 TerraWeave ──────────────────────────────────────────
  {
    slug: "terraweave-living-open-planetary-digital-twin",
    title: "TerraWeave: Living Open Planetary Digital Twin",
    license: "MIT",
    impactSummary:
      "Open multi-resolution Earth twin contracts, domain layer packs, provenance APIs, and validation playbooks for climate stewardship and agent world models.",
    alignmentCheck:
      "PASS: climate/earth systems public good; open data fusion; no dual-use harm.",
    description: purpose({
      body: "TerraWeave builds the open hierarchical digital twin of Earth systems: ingestion standards, multi-resolution core, domain layers, AI nowcast modules, provenance-rich APIs, validation/UQ, and governance for continuous updates.",
      problem:
        "Planetary data is siloed; digital twins are often closed, under-validated, or unusable by independent researchers and civic planners.",
      who: "Climate scientists, city planners, educators, open data engineers, grounded AI researchers.",
      whyHierarchy:
        "Ingestion, core architecture, domain layers, AI modules, APIs, and validation can ship as parallel open packs.",
      inScope:
        "Schemas, architecture ADRs, domain layer specs, API sketches, validation plans, governance briefs, sample regional deep dives using public data only.",
      outScope:
        "Secret military terrain products, unauthorized high-res personal surveillance layers, paywall bypass scrapers.",
      complements: "EchoVault (biosphere audio); LumenLex (claims); NovaArchive (long-term data). ANVIL for swarm analysis packs.",
      seal: "Twin kit: architecture + schemas + >=2 domain layers + API + validation + LEGAL-RAILS + KIT-INDEX.",
      rails: "Provenance mandatory; uncertainty required; public data only unless license explicit.",
    }),
    masterPrompt: `You are Master Coordinator for TerraWeave.
MISSION: Merge peer-reviewed open packs into a living planetary twin toolkit.
${railsBlock("TerraWeave", [
  "Every quantitative claim needs provenance and uncertainty tags.",
  "Public data licenses must be respected; no paywall bypass.",
])}`,
    masterAcceptance: `PASS when:
- >=7 leaves accepted under MIT / open data licenses as stated
- Architecture + schemas + domain layers + validation peer-accepted
- LEGAL-RAILS + KIT-INDEX present; no secrets`,
    leaves: [
      leaf(
        "Ship TerraWeave mission + public-data onboarding",
        `MISSION.md + ONBOARDING.md + public-data quickstart: how to contribute layers without proprietary dumps; geohash vs precision guidance.`,
        [
          "MISSION + ONBOARDING",
          "Public-data quickstart",
          "Precision/privacy note",
          "FAQ 5+",
          "MIT header",
        ],
        { tokens: 40000, tags: "docs,onboarding,good-first", goodFirst: true }
      ),
      leaf(
        "Author LEGAL-RAILS + data license matrix",
        `LEGAL-RAILS.md + DATA-LICENSE-MATRIX.md for common public earth datasets (placeholders OK with real known open sources). Dual-use refuse for surveillance products.`,
        [
          "LEGAL-RAILS complete",
          "License matrix table",
          "3 refusals",
          "Footer block",
          "MIT/CC-BY header",
        ],
        { tokens: 50000, tags: "legal,data,rails", goodFirst: true }
      ),
      leaf(
        "Design multi-source ingestion + harmonization standards",
        `INGESTION.md + harmonization.schema.json: satellite/ground/citizen streams, units, CRS notes, QC flags, late-arriving data. 2 example pipeline configs (YAML).`,
        [
          "INGESTION.md",
          "Valid schema",
          "2 pipeline configs",
          "QC flag catalog",
          "MIT header",
        ],
        { tokens: 100000, tags: "pipelines,schema,data" }
      ),
      leaf(
        "Write core twin architecture ADR (multi-resolution)",
        `ARCHITECTURE.md ADR: spatial-temporal graph/voxel/hybrid options, versioning, update protocol, tradeoffs table, progressive gates (regional first). Mermaid/ASCII diagrams.`,
        [
          "ADR with decision + alternatives",
          "Diagram present",
          "Versioning model",
          "Gate map",
          "MIT header",
        ],
        { tokens: 110000, tags: "architecture,adr" }
      ),
      leaf(
        "Ship domain layer pack (atmosphere + biosphere starters)",
        `layers/atmosphere.md + layers/biosphere.md + layer.schema.json: variables, resolution tiers, public source pointers, uncertainty fields. Note hooks to EchoVault for audio-derived biodiversity signals.`,
        [
          "2 domain layer specs",
          "layer.schema.json",
          "Public source pointers",
          "EchoVault complement note",
          "MIT header",
        ],
        { tokens: 100000, tags: "layers,climate,biosphere" }
      ),
      leaf(
        "Specify AI nowcast/projection module interfaces",
        `AI-MODULES.md + module-interface.schema.json: nowcast vs long projection, required uncertainty outputs, baseline recipes offline-friendly, honesty rails against overconfident climate claims.`,
        [
          "Module interface schema",
          "Uncertainty required fields",
          "Baseline recipe notes",
          "Honesty rails",
          "MIT header",
        ],
        { tokens: 90000, tags: "ml,forecast,api" }
      ),
      leaf(
        "Design provenance-rich query API + OpenAPI sketch",
        `openapi-terraweave-v0.yaml (or JSON) + API.md: query by region/time/layer, provenance in every response, rate/fair-use notes, example queries.`,
        [
          "OpenAPI sketch validates structure",
          "Provenance in response model",
          "3 example queries",
          "Fair-use notes",
          "MIT header",
        ],
        { tokens: 90000, tags: "api,openapi,provenance" }
      ),
      leaf(
        "Validation, UQ, and regional deep-dive template",
        `VALIDATION.md + UQ checklist + one regional deep-dive template filled with public data references only (or synthetic labeled data).`,
        [
          "VALIDATION plan",
          "UQ checklist",
          "1 regional template",
          "Public refs or synthetic labels",
          "MIT header",
        ],
        { tokens: 80000, tags: "validation,uq,docs" }
      ),
      leaf(
        "Peer-review rubric + KIT-INDEX consolidator",
        `PEER-REVIEW-RUBRIC.md + KIT-INDEX.md + governance stub for continuous twin updates.`,
        [
          "Rubric >=5 dims",
          "KIT-INDEX",
          "Governance stub",
          "Seal checklist",
          "Footer",
        ],
        { tokens: 40000, tags: "meta,review,seal" }
      ),
    ],
  },

  // ─── 4 MythosEngine ────────────────────────────────────────
  {
    slug: "mythosengine-endangered-knowledge-myth-forge",
    title: "MythosEngine: Endangered Knowledge & Myth Preservation Forge",
    license: "CC-BY-NC-SA",
    impactSummary:
      "Community-first ethics, capture pipelines, knowledge graph schemas, and educational templates to preserve endangered oral knowledge with consent and veto rights.",
    alignmentCheck:
      "PASS: cultural heritage; free prior informed consent; community overrides; no extractive scraping of sacred material.",
    description: purpose({
      body: "MythosEngine is a hierarchical open forge for preserving and revitalizing endangered languages, oral traditions, and indigenous ecological knowledge under community control.",
      problem:
        "Endangered knowledge disappears faster than institutions digitize it; AI projects often extract without consent or context.",
      who: "Language communities, cultural stewards, educators, ethical AI researchers, archivists.",
      whyHierarchy:
        "Ethics, capture, graphs, generative revitalization, education, and archival packaging must be claimable in parallel with community gates.",
      inScope:
        "Consent protocols, capture pipelines, KG schemas, educational templates, archival packaging, governance tools.",
      outScope:
        "Scraping sacred restricted materials without permission, monetizing community IP against wishes, deepfakes of living people without consent.",
      complements: "NovaArchive (long-term packing); ChronosSim (historical simulation ethics); LumenLex (claim provenance patterns).",
      seal: "Ethics-first kit + schemas + templates + KIT-INDEX under CC-BY-NC-SA with community override notes.",
      rails: "Community veto always wins; NC-SA default unless community sets otherwise.",
    }),
    masterPrompt: `You are Master Coordinator for MythosEngine.
MISSION: Build consent-first preservation kits. Community authority beats model cleverness.
${railsBlock("MythosEngine", [
  "Never invent community traditions as fact; mark reconstructed vs recorded.",
  "Community veto and access controls are mandatory design requirements.",
])}`,
    masterAcceptance: `PASS when:
- >=7 leaves accepted
- Ethics/consent packs + KG schema + education templates peer-accepted
- Community governance documented; KIT-INDEX + LEGAL-RAILS present`,
    leaves: [
      leaf(
        "Ship MythosEngine mission + community partnership primer",
        `MISSION.md + PARTNERSHIP-PRIMER.md for outsiders working with knowledge holders: humility, veto, benefit-sharing, what not to claim.`,
        [
          "MISSION + partnership primer",
          "Do/don't list 8+",
          "Benefit-sharing notes",
          "FAQ",
          "CC-BY-NC-SA header",
        ],
        { tokens: 45000, tags: "docs,community,good-first", goodFirst: true }
      ),
      leaf(
        "Author LEGAL-RAILS + FPIC consent templates",
        `LEGAL-RAILS.md + consent templates (plain language + structured form fields) for free, prior, informed consent and ongoing veto. Sample refusals for extractive requests.`,
        [
          "LEGAL-RAILS",
          "Consent templates (2+)",
          "Veto workflow",
          "3 refusals",
          "License header",
        ],
        { tokens: 60000, tags: "legal,consent,ethics", goodFirst: true }
      ),
      leaf(
        "Design recording/transcription/translation pipeline pack",
        `CAPTURE-PIPELINE.md: devices notes (generic), consent checkpoints, transcription workflow, translation review by community, quality gates. No proprietary lock-in required.`,
        [
          "Pipeline stages documented",
          "Consent checkpoints mapped",
          "Quality gates",
          "Tooling options table",
          "License header",
        ],
        { tokens: 90000, tags: "pipeline,language,process" }
      ),
      leaf(
        "Ship knowledge graph schema for myth/kinship/ecology",
        `mythos.schema.json + SCHEMA.md for myth motifs, kinship (privacy-aware), ecology relations, ritual (access-tiered). Example graph fragment synthetic or public-domain only.`,
        [
          "Valid schema",
          "Field dictionary",
          "Access-tier fields",
          "Example graph fragment",
          "License header",
        ],
        { tokens: 100000, tags: "schema,kg,culture" }
      ),
      leaf(
        "Design community-controlled generative storytelling rails",
        `GENERATIVE-RAILS.md + agent prompt package: revitalization aids that require community approval hooks, watermark reconstructed content, refuse deepfake of living persons without consent.`,
        [
          "Generative rails doc",
          "Agent prompt package",
          "Approval hooks",
          "Deepfake refuse policy",
          "License header",
        ],
        { tokens: 90000, tags: "ai,rails,storytelling" }
      ),
      leaf(
        "Educational experience templates pack",
        `templates/ for classroom and community workshops: listening circle, language drill, ecology story map. Accessibility notes. No sacred restricted content samples.`,
        [
          ">=3 templates",
          "Facilitator notes",
          "Accessibility checklist",
          "Restricted-content handling",
          "License header",
        ],
        { tokens: 70000, tags: "education,templates,good-first", goodFirst: true }
      ),
      leaf(
        "Archival packaging + long-term preservation checklist",
        `ARCHIVE-PACK.md compatible with NovaArchive concepts: manifests, checksums, access tiers, medium recommendations for community archives.`,
        [
          "Package layout",
          "Checksum plan",
          "Access tiers",
          "Medium notes",
          "Cross-link NovaArchive",
        ],
        { tokens: 70000, tags: "archival,preservation" }
      ),
      leaf(
        "Community governance + access control model",
        `GOVERNANCE.md + access-matrix template: roles, veto, embargo periods, dispute resolution, tooling notes (open source options).`,
        [
          "Governance model",
          "Access matrix template",
          "Dispute path",
          "Tooling notes",
          "License header",
        ],
        { tokens: 80000, tags: "governance,access" }
      ),
      leaf(
        "Peer-review rubric + KIT-INDEX consolidator",
        `PEER-REVIEW-RUBRIC.md emphasizing consent compliance + KIT-INDEX.md for seal.`,
        [
          "Rubric with consent dimension",
          "KIT-INDEX",
          "Seal checklist",
          "Footer",
          "Reviewer usable without author",
        ],
        { tokens: 40000, tags: "meta,review,seal" }
      ),
    ],
  },

  // ─── 5 VitalForge ──────────────────────────────────────────
  {
    slug: "vitalforge-open-hardware-ai-global-diagnostics",
    title: "VitalForge: Open Hardware & AI Protocols for Global Diagnostics",
    license: "CERN-OHL / MIT",
    impactSummary:
      "Open repairable diagnostic hardware designs, calibration protocols, AI analysis recipes, and training kits framed as research/education for global health equity - not unvalidated clinical devices.",
    alignmentCheck:
      "PASS: global health public good; open hardware; explicit non-device claims until validated; no surveillance.",
    description: purpose({
      body: "VitalForge opens hierarchical design of low-cost repairable diagnostic hardware concepts and AI analysis pipelines for resource-limited settings, with manufacturing docs, calibration, validation research, and training curricula.",
      problem:
        "High-quality diagnostics are expensive, closed, and hard to repair; open designs lack hierarchical agent-ready packs and honest regulatory framing.",
      who: "Global health innovators, open hardware labs, educators, AI medical-imaging researchers (research use).",
      whyHierarchy:
        "Needs, CAD/electronics, manufacturing, calibration, AI, validation research, and training can proceed as parallel leaves.",
      inScope:
        "Needs assessment, open designs/BOMs, simulation notes, repair manuals, AI recipes on public/synthetic data, regulatory research (not legal advice), training kits.",
      outScope:
        "Unvalidated clinical marketing claims, weaponization, biometric mass surveillance products, patient PII datasets.",
      complements: "PulseNet (privacy-preserving population signals); ANVIL for eval swarms.",
      seal: "Open hardware+AI education kit with LEGAL-RAILS, non-device disclaimer, KIT-INDEX.",
      rails: "Not a medical device claim; research/education framing; patient privacy absolute.",
    }),
    masterPrompt: `You are Master Coordinator for VitalForge.
MISSION: Ship open diagnostic design kits with radical honesty about validation limits.
${railsBlock("VitalForge", [
  "Always include NOT A MEDICAL DEVICE / not clinical advice disclaimers until proper validation.",
  "No real patient PII; prefer synthetic or fully de-identified public datasets with license.",
])}`,
    masterAcceptance: `PASS when:
- >=7 leaves accepted under CERN-OHL/MIT as stated
- Designs + calibration + AI recipes + training + LEGAL-RAILS peer-accepted
- Non-device disclaimers present; KIT-INDEX complete`,
    leaves: [
      leaf(
        "Ship VitalForge mission + non-device disclaimer pack",
        `MISSION.md + DISCLAIMERS.md: research/education framing, what VitalForge is not, how validation gates work.`,
        [
          "MISSION + DISCLAIMERS",
          "Validation gate map",
          "Audience FAQ",
          "License notes CERN-OHL/MIT",
          "ASCII markdown",
        ],
        { tokens: 40000, tags: "docs,disclaimer,good-first", goodFirst: true }
      ),
      leaf(
        "Author LEGAL-RAILS + dual-use + privacy refuse list",
        `LEGAL-RAILS.md for open medical hardware research: privacy, dual-use refuse, no unvalidated clinical claims, sample refusals.`,
        [
          "LEGAL-RAILS",
          "3+ refusals",
          "Privacy rules",
          "Footer",
          "Header",
        ],
        { tokens: 50000, tags: "legal,rails,privacy", goodFirst: true }
      ),
      leaf(
        "Global health needs assessment + prioritized use cases",
        `NEEDS.md: ranked diagnostic use cases for resource-limited settings with public sources, equity criteria, and first-hardware candidates for open design.`,
        [
          "Ranked use cases >=5",
          "Sources section",
          "Equity criteria",
          "First hardware shortlist",
          "MIT header",
        ],
        { tokens: 80000, tags: "needs,global-health,research" }
      ),
      leaf(
        "Open hardware concept pack: BOM + interfaces + simulation notes",
        `hardware/concept-v0.md + bom.csv + interfaces: modular sensors, power, MCU notes, simulation approach. Educational concept depth OK if labeled. CERN-OHL intent stated.`,
        [
          "Concept design doc",
          "bom.csv",
          "Interface list",
          "Simulation notes",
          "CERN-OHL/MIT headers",
        ],
        { tokens: 120000, tags: "hardware,bom,design" }
      ),
      leaf(
        "Local manufacturing + repair manual template",
        `MANUFACTURE.md + REPAIR.md templates with steps, tools, failure modes, parts alternatives for constrained supply chains.`,
        [
          "Manufacture steps",
          "Repair guide",
          "Parts alternatives",
          "Safety notes",
          "License header",
        ],
        { tokens: 90000, tags: "manufacturing,repair,docs" }
      ),
      leaf(
        "Calibration protocol + uncertainty checklist",
        `CALIBRATION.md with procedures, reference standards notes, uncertainty checklist, logging template CSV.`,
        [
          "Calibration protocol",
          "Uncertainty checklist",
          "Log CSV template",
          "Failure cases",
          "MIT header",
        ],
        { tokens: 80000, tags: "calibration,quality" }
      ),
      leaf(
        "AI analysis recipe pack on synthetic/public data only",
        `AI-RECIPES.md: classification/quantification/anomaly recipes with eval metrics, synthetic data generation notes, explicit non-clinical framing.`,
        [
          ">=2 recipes",
          "Eval metrics",
          "Synthetic/public data only",
          "Non-clinical framing",
          "MIT header",
        ],
        { tokens: 100000, tags: "ml,health,eval" }
      ),
      leaf(
        "Regulatory pathway research brief (not legal advice)",
        `REGULATORY-RESEARCH.md: high-level pathways overview with jurisdiction placeholders, checklist, strong disclaimer. No jurisdiction-specific legal advice claims.`,
        [
          "Research brief",
          "Checklist",
          "Disclaimer prominent",
          "Sources",
          "MIT/CC-BY header",
        ],
        { tokens: 70000, tags: "regulatory,research,docs" }
      ),
      leaf(
        "Training curriculum + peer-review/KIT-INDEX",
        `TRAINING.md curriculum outline + PEER-REVIEW-RUBRIC.md + KIT-INDEX.md for seal.`,
        [
          "Curriculum outline",
          "Rubric",
          "KIT-INDEX",
          "Seal checklist",
          "Footer",
        ],
        { tokens: 60000, tags: "training,meta,seal" }
      ),
    ],
  },

  // ─── 6 ChronosSim ──────────────────────────────────────────
  {
    slug: "chronossim-verified-historical-multi-agent-sim",
    title: "ChronosSim: Verified Historical Multi-Agent Simulation Platform",
    license: "MIT / CC-BY",
    impactSummary:
      "Source-grounded historical multi-agent sim specs, citation infrastructure, period packs, and classroom tools that refuse fabricated history.",
    alignmentCheck:
      "PASS: education/history research; source-cited; no denialism or harassment.",
    description: purpose({
      body: "ChronosSim builds open engines and content packs for multi-agent simulations of historical societies grounded in primary sources, with provenance, educational interfaces, and careful counterfactual tools.",
      problem:
        "Historical sims often invent cultures and causal stories without sources; educators lack open, citable multi-agent packs.",
      who: "Teachers, public historians, students, multi-agent researchers studying social dynamics.",
      whyHierarchy:
        "Engine, citations, period packs, agent models, education UI, counterfactuals, and validation can ship in parallel.",
      inScope:
        "Engine design, citation schemas, period packs, evidence-based agent notes, classroom UX, counterfactual protocols, validation plans.",
      outScope:
        "Hate propaganda, historical denialism, doxxing, uncited grand theories presented as fact.",
      complements: "MythosEngine (living culture vs past); ForgeMind (multi-agent gym); LumenLex (claim provenance).",
      seal: "Source-grounded sim kit + 1 period pack + LEGAL-RAILS + KIT-INDEX.",
      rails: "Primary sources preferred; uncertainty tags; no fabricated citations.",
    }),
    masterPrompt: `You are Master Coordinator for ChronosSim.
MISSION: History as laboratory with sources, not myth as fact.
${railsBlock("ChronosSim", [
  "Every historical claim needs a source or explicit hypothesis tag.",
  "Counterfactuals must state epistemic limits.",
])}`,
    masterAcceptance: `PASS when:
- >=7 leaves accepted
- Engine design + citation infra + >=1 period pack outline peer-accepted
- LEGAL-RAILS + KIT-INDEX; no fabricated sources`,
    leaves: [
      leaf(
        "Ship ChronosSim mission + educator onboarding",
        `MISSION.md + EDUCATOR-ONBOARDING.md: classroom use, academic honesty, how leaves work.`,
        [
          "MISSION + educator onboarding",
          "Honesty rules",
          "FAQ",
          "License MIT/CC-BY",
          "ASCII markdown",
        ],
        { tokens: 40000, tags: "docs,education,good-first", goodFirst: true }
      ),
      leaf(
        "Author LEGAL-RAILS + anti-fabrication policy",
        `LEGAL-RAILS.md + anti-fabrication policy: citation requirements, hate/denialism refuse, sample refusals.`,
        [
          "LEGAL-RAILS",
          "Anti-fabrication rules",
          "3 refusals",
          "Footer",
          "Header",
        ],
        { tokens: 45000, tags: "legal,rails,good-first", goodFirst: true }
      ),
      leaf(
        "Specify multi-agent historical sim engine design",
        `ENGINE.md: time model, agents, institutions, event queue, seeding, determinism, save/load. Interface sketch JSON.`,
        [
          "ENGINE.md complete",
          "Interface sketch",
          "Determinism notes",
          "Example tick walkthrough",
          "MIT header",
        ],
        { tokens: 100000, tags: "engine,simulation,design" }
      ),
      leaf(
        "Ship source grounding + citation infrastructure schemas",
        `citation.schema.json + CITATIONS.md: primary/secondary, confidence, quote policy, anti-fabrication checks for agents.`,
        [
          "Valid citation schema",
          "CITATIONS.md",
          "Agent anti-fabrication checks",
          "2 examples",
          "CC-BY/MIT header",
        ],
        { tokens: 80000, tags: "citations,schema,provenance" }
      ),
      leaf(
        "Period pack v0 outline with source list (public domain / open)",
        `period-packs/v0.md: choose one well-documented era/event, entity list, uncertainty map, open/public domain source list (real citations).`,
        [
          "Full period outline",
          "Source list with real public citations",
          "Uncertainty map",
          "Entity list",
          "License notes",
        ],
        { tokens: 110000, tags: "content,history,sources" }
      ),
      leaf(
        "Evidence-based agent behavior model notes",
        `AGENT-MODELS.md: how to derive behaviors from evidence, stereotype refusal, parameter ranges, example agent cards.`,
        [
          "Model notes",
          "Stereotype refuse section",
          ">=3 agent cards",
          "Evidence map",
          "MIT header",
        ],
        { tokens: 90000, tags: "agents,history,design" }
      ),
      leaf(
        "Classroom visualization + narrative interface pack",
        `CLASSROOM-UX.md + sample lesson plan using the period pack without requiring GPU.`,
        [
          "UX notes",
          "1 lesson plan",
          "Accessibility notes",
          "Assessment ideas",
          "MIT header",
        ],
        { tokens: 70000, tags: "education,ux,good-first", goodFirst: true }
      ),
      leaf(
        "Counterfactual experiment protocol with epistemic limits",
        `COUNTERFACTUALS.md: allowed experiments, required disclaimers, success metrics, anti-myth-making rails, worked example labeled speculative.`,
        [
          "Protocol",
          "Disclaimers",
          "Worked speculative example",
          "Rails against myth-making",
          "License header",
        ],
        { tokens: 70000, tags: "counterfactual,method,docs" }
      ),
      leaf(
        "Validation plan + peer-review/KIT-INDEX",
        `VALIDATION.md + PEER-REVIEW-RUBRIC.md + KIT-INDEX.md.`,
        [
          "Validation plan",
          "Rubric with source dimension",
          "KIT-INDEX",
          "Seal checklist",
          "Footer",
        ],
        { tokens: 50000, tags: "validation,meta,seal" }
      ),
    ],
  },

  // ─── 7 NovaArchive ─────────────────────────────────────────
  {
    slug: "novaarchive-interstellar-multimillennial-data-resilience",
    title: "NovaArchive: Interstellar & Multi-Millennial Data Resilience Protocol",
    license: "CC0 / MIT",
    impactSummary:
      "Open threat models, self-describing formats, FEC strategies, and pilot archive recipes so scientific and cultural data can outlive formats and institutions.",
    alignmentCheck:
      "PASS: open science/archival public good; no dual-use weapons content.",
    description: purpose({
      body: "NovaArchive engineers open protocols for data that survives civilizations and interplanetary distances: threat models, self-describing formats, resilient encoding, media strategies, discovery/decode protocols, reference impls, and pilot archives.",
      problem:
        "Bit rot, format death, and cultural discontinuity destroy knowledge; space and deep-time archives lack shared open protocols agents can implement.",
      who: "Archivists, space mission planners, scientists, cultural heritage orgs, long-termist infrastructure builders.",
      whyHierarchy:
        "Threats, formats, FEC, media, decode, code, and pilots are separable claimable work packages.",
      inScope:
        "Specs, schemas, reference algorithms, medium comparisons, pilot scientific/cultural packs, test vectors.",
      outScope:
        "Classified payloads, weapons targeting data, illegal content caches.",
      complements: "MythosEngine (cultural content); TerraWeave (earth data); LumenLex (claim graphs to archive).",
      seal: "Protocol suite + reference notes + pilot plan + LEGAL-RAILS + KIT-INDEX (CC0 protocols / MIT code).",
      rails: "Self-describing bootstrap; no secrets in pilots; honest durability claims.",
    }),
    masterPrompt: `You are Master Coordinator for NovaArchive.
MISSION: Make forgetfulness harder. Prefer boring robust standards over hype media claims.
${railsBlock("NovaArchive", [
  "Durability claims must include assumptions and failure modes.",
  "Protocols should be implementable offline with test vectors.",
])}`,
    masterAcceptance: `PASS when:
- >=7 leaves accepted under CC0/MIT as stated
- Threat model + format + encoding + pilot plan peer-accepted
- LEGAL-RAILS + KIT-INDEX present`,
    leaves: [
      leaf(
        "Ship NovaArchive mission + durability assumptions primer",
        `MISSION.md + ASSUMPTIONS.md: what multi-millennial means honestly; who contributes; glossary.`,
        [
          "MISSION + ASSUMPTIONS",
          "Glossary 10+",
          "FAQ",
          "License CC0/MIT split",
          "ASCII",
        ],
        { tokens: 40000, tags: "docs,onboarding,good-first", goodFirst: true }
      ),
      leaf(
        "Author LEGAL-RAILS for deep-time archives",
        `LEGAL-RAILS.md: content not allowed in pilots, export controls awareness (high-level), dual-use refuse, footer.`,
        [
          "LEGAL-RAILS",
          "3 refusals",
          "Pilot content policy",
          "Footer",
          "Header",
        ],
        { tokens: 45000, tags: "legal,rails", goodFirst: true }
      ),
      leaf(
        "Threat model matrix (bit rot to cultural discontinuity)",
        `THREATS.md matrix: threats, likelihood/impact qualitative, mitigations, residual risk. Sources where applicable.`,
        [
          "Threat matrix >=8 threats",
          "Mitigations mapped",
          "Residual risk section",
          "Sources",
          "CC0/CC-BY header",
        ],
        { tokens: 80000, tags: "threat-model,research" }
      ),
      leaf(
        "Self-describing format + metadata schema v0",
        `format-spec.md + nova-meta.schema.json: self-description, language bootstrap notes, versioning, content types.`,
        [
          "Format spec",
          "Valid schema",
          "Bootstrap notes",
          "Example payload",
          "CC0/MIT",
        ],
        { tokens: 100000, tags: "format,schema,standards" }
      ),
      leaf(
        "Error-correcting multi-redundant encoding design",
        `ENCODING.md: RS-class or similar parameters, multi-copy strategies, decode flowchart, test vectors (small).`,
        [
          "Encoding design",
          "Parameters table",
          "Decode flowchart",
          "Test vectors",
          "MIT header",
        ],
        { tokens: 100000, tags: "fec,encoding,code" }
      ),
      leaf(
        "Medium comparison table + pilot medium recommendations",
        `MEDIA.md: optical, DNA, ceramic, stone, space-qualified - tradeoffs, cost honesty, pilot picks for science vs culture.`,
        [
          "Comparison table",
          "Pilot recommendations",
          "Cost/assumption honesty",
          "Sources",
          "CC-BY/CC0 header",
        ],
        { tokens: 70000, tags: "media,materials,research" }
      ),
      leaf(
        "Future finder discovery + decode protocol ladder",
        `DISCOVERY.md: how unknown finders detect, interpret, and decode without modern context; ladder of difficulty; test cases.`,
        [
          "Discovery ladder",
          "Decode protocol",
          ">=3 test cases",
          "Human-readable bootstrap page concept",
          "CC0/MIT",
        ],
        { tokens: 90000, tags: "discovery,protocol,ux" }
      ),
      leaf(
        "Reference implementation outline + API sketch",
        `REF-IMPL.md + api sketch for encode/decode libraries; language-neutral; offline CI notes.`,
        [
          "API sketch",
          "Module layout",
          "Offline test plan",
          "License MIT",
          "No secrets",
        ],
        { tokens: 80000, tags: "implementation,api" }
      ),
      leaf(
        "Pilot archive plan + peer-review/KIT-INDEX",
        `PILOT.md for one scientific + one cultural pilot + PEER-REVIEW-RUBRIC + KIT-INDEX.`,
        [
          "2 pilot plans",
          "Integrity receipt concept",
          "Rubric",
          "KIT-INDEX",
          "Seal checklist",
        ],
        { tokens: 60000, tags: "pilot,meta,seal" }
      ),
    ],
  },

  // ─── 8 SynthCivic ──────────────────────────────────────────
  {
    slug: "synthcivic-ai-augmented-open-deliberation-toolkit",
    title: "SynthCivic: AI-Augmented Open Deliberation & Consensus Toolkit",
    license: "MIT / Apache-2.0",
    impactSummary:
      "Transparent AI-assisted deliberation protocols, facilitation agents, bias-detection evals, and deployment kits that keep human final authority and public ledgers.",
    alignmentCheck:
      "PASS: civic tech; human final authority; not influence-ops tooling.",
    description: purpose({
      body: "SynthCivic opens hierarchical tools for large-scale deliberation with AI facilitation, synthesis, bias detection, consensus methods, simulations, audit ledgers, and NGO/local government deployment kits.",
      problem:
        "Complex public decisions overwhelm forums; closed AI moderation lacks transparency; communities need open protocols with human authority.",
      who: "Local governments, NGOs, online communities, civic technologists, deliberative democracy practitioners.",
      whyHierarchy:
        "Protocols, agents, bias modules, consensus methods, sims, ledgers, and kits can be built and reviewed independently.",
      inScope:
        "Protocol specs, facilitation prompts, detection evals, consensus methods, simulation designs, ledger schemas, deployment kits.",
      outScope:
        "Covert influence operations, voter suppression tooling, dark-pattern persuasion products, secret profiling of citizens.",
      complements: "Open Agent Civic Toolkit (FOIA/minutes/grants); ForgeMind (multi-agent eval); ANVIL for swarm facilitation experiments.",
      seal: "Deliberation toolkit with human-authority rails, ledger schema, deployment kit, LEGAL-RAILS, KIT-INDEX.",
      rails: "Human final authority non-negotiable; full audit of AI interventions.",
    }),
    masterPrompt: `You are Master Coordinator for SynthCivic.
MISSION: Scale wise collective intelligence without seizing human agency.
${railsBlock("SynthCivic", [
  "AI never has final decision authority in shipped protocols.",
  "Refuse covert influence-ops productization.",
])}`,
    masterAcceptance: `PASS when:
- >=7 leaves accepted under MIT/Apache-2.0
- Protocol + facilitation + ledger + deployment kit peer-accepted
- LEGAL-RAILS + KIT-INDEX; human authority explicit`,
    leaves: [
      leaf(
        "Ship SynthCivic mission + civic facilitator onboarding",
        `MISSION.md + FACILITATOR-ONBOARDING.md: roles, human authority, what AI may/may not do.`,
        [
          "MISSION + onboarding",
          "Authority diagram",
          "FAQ",
          "License notes",
          "ASCII",
        ],
        { tokens: 40000, tags: "docs,civic,good-first", goodFirst: true }
      ),
      leaf(
        "Author LEGAL-RAILS + anti-manipulation policy",
        `LEGAL-RAILS.md: anti-covert influence, privacy of participants, dual-use refuse, sample refusals.`,
        [
          "LEGAL-RAILS",
          "Anti-manipulation section",
          "3 refusals",
          "Footer",
          "Header",
        ],
        { tokens: 50000, tags: "legal,rails,civic", goodFirst: true }
      ),
      leaf(
        "Core deliberation protocol specification v0",
        `PROTOCOL.md: phases, roles, inputs/outputs, escalation, public summary rules, accessibility.`,
        [
          "Full protocol phases",
          "Roles matrix",
          "Escalation path",
          "Accessibility notes",
          "MIT header",
        ],
        { tokens: 100000, tags: "protocol,civic,design" }
      ),
      leaf(
        "AI facilitation agent prompt package + override rules",
        `agents/facilitation.md + JSON examples: summarize, synthesize options, surface dissent - never close debate alone. Human override API notes.`,
        [
          "Prompt package",
          ">=3 examples",
          "Override rules",
          "Audit log fields",
          "Apache-2.0/MIT",
        ],
        { tokens: 90000, tags: "agents,facilitation,prompts" }
      ),
      leaf(
        "Bias/polarization detection module design + eval plan",
        `BIAS-DETECT.md: what is measured, false positive honesty, eval plan on synthetic dialogues, misuse warnings.`,
        [
          "Module design",
          "Metrics + FPR honesty",
          "Synthetic eval plan",
          "Misuse warnings",
          "License header",
        ],
        { tokens: 90000, tags: "bias,eval,ml" }
      ),
      leaf(
        "Multi-scale consensus methods pack with worked example",
        `CONSENSUS.md: methods comparison, explainability, fairness criteria, one worked example on a synthetic civic issue.`,
        [
          ">=3 methods compared",
          "Fairness criteria",
          "Worked example",
          "Explainability notes",
          "MIT header",
        ],
        { tokens: 90000, tags: "consensus,methods,docs" }
      ),
      leaf(
        "Simulation environment design for protocol stress tests",
        `SIM.md: agent populations, attack scenarios (spam, polarization bots) for defensive testing only, metrics, scenario pack outline.`,
        [
          "Sim design",
          "Defensive attack scenarios labeled educational",
          "Metrics",
          "Scenario outline",
          "License header",
        ],
        { tokens: 80000, tags: "simulation,security-edu" }
      ),
      leaf(
        "Public ledger + audit schema for AI interventions",
        `ledger.schema.json + AUDIT.md: what gets logged, retention, privacy balance, example entries.`,
        [
          "Valid ledger schema",
          "AUDIT.md",
          "Example entries",
          "Privacy balance",
          "MIT header",
        ],
        { tokens: 80000, tags: "ledger,audit,schema" }
      ),
      leaf(
        "Deployment kit for NGO/local government + KIT-INDEX",
        `DEPLOY-KIT.md checklist + PEER-REVIEW-RUBRIC + KIT-INDEX for seal.`,
        [
          "Deploy checklist",
          "Pilot plan stub",
          "Rubric",
          "KIT-INDEX",
          "Seal checklist",
        ],
        { tokens: 60000, tags: "deployment,meta,seal" }
      ),
    ],
  },

  // ─── 9 AetherBench ─────────────────────────────────────────
  {
    slug: "aetherbench-open-embodied-spatial-ai-challenge-suite",
    title: "AetherBench: Open Embodied & Spatial AI Challenge Suite",
    license: "Apache-2.0",
    impactSummary:
      "Open embodied/spatial benchmark specs, environments catalog, metrics, baselines, and eval server design for safe physical intelligence research - no weapons scenarios.",
    alignmentCheck:
      "PASS: robotics research infrastructure; open benchmarks; no autonomous weapons.",
    description: purpose({
      body: "AetherBench is the open hierarchical suite of environments, tasks, metrics, baselines, domain randomization, sim2real tools, and continuous evaluation for embodied and spatial AI from household to planetary exploration.",
      problem:
        "Embodied AI progress is fragmented across incompatible sims and closed leaderboards; safety-critical scenarios lack shared open eval.",
      who: "Robotics researchers, spatial AI labs, educators, multi-agent embodied teams.",
      whyHierarchy:
        "Sim choice, envs, tasks, baselines, randomization, transfer, and leaderboards are separable leaves.",
      inScope:
        "Framework decisions, env catalogs, benchmark specs, baselines, robustness protocols, transfer playbooks, eval server design.",
      outScope:
        "Autonomous weapons, real-world unauthorized robot intrusion, biometric mass surveillance robots.",
      complements: "ForgeMind (abstract multi-agent); StellarForge (space mission physics); ANVIL for swarm runners.",
      seal: "Benchmark suite kit with metrics + env catalog + baselines + LEGAL-RAILS + KIT-INDEX under Apache-2.0.",
      rails: "Peaceful robotics only; safety notes on sim2real.",
    }),
    masterPrompt: `You are Master Coordinator for AetherBench.
MISSION: Shared open proving grounds for embodied intelligence.
${railsBlock("AetherBench", [
  "No weapons or lethal autonomous systems scenarios.",
  "Sim2real guidance must include safety notes.",
])}`,
    masterAcceptance: `PASS when:
- >=7 leaves accepted under Apache-2.0
- Env catalog + benchmarks + baselines + eval design peer-accepted
- LEGAL-RAILS + KIT-INDEX; no weapons content`,
    leaves: [
      leaf(
        "Ship AetherBench mission + robotics researcher onboarding",
        `MISSION.md + ONBOARDING.md: scope, non-weapons policy, how to add envs/tasks.`,
        [
          "MISSION + ONBOARDING",
          "Non-weapons policy summary",
          "FAQ",
          "Apache-2.0 note",
          "ASCII",
        ],
        { tokens: 40000, tags: "docs,onboarding,good-first", goodFirst: true }
      ),
      leaf(
        "Author LEGAL-RAILS for embodied AI benchmarks",
        `LEGAL-RAILS.md: weapons refuse, real-world intrusion refuse, dataset license rules, sample refusals.`,
        [
          "LEGAL-RAILS",
          "3 refusals",
          "Dataset license rules",
          "Footer",
          "Header",
        ],
        { tokens: 45000, tags: "legal,rails", goodFirst: true }
      ),
      leaf(
        "Core sim/physics framework decision record",
        `FRAMEWORKS.md ADR: compare open sim options, license compatibility, reproducibility, recommend Gate-1 stack with alternatives.`,
        [
          "ADR with comparison table",
          "License compatibility",
          "Gate-1 recommendation",
          "Repro notes",
          "Apache-2.0",
        ],
        { tokens: 90000, tags: "simulation,adr,robotics" }
      ),
      leaf(
        "Environment library catalog (indoor to planetary)",
        `ENV-CATALOG.md: tiers household/warehouse/outdoor/multi-robot/planetary, asset license rules, difficulty tags, 8+ env entries (specs, not necessarily meshes).`,
        [
          ">=8 env entries",
          "License rules",
          "Difficulty tiers",
          "Asset policy",
          "Apache-2.0",
        ],
        { tokens: 100000, tags: "environments,catalog" }
      ),
      leaf(
        "Task & benchmark definitions with anti-overfit splits",
        `BENCHMARKS.md + metrics: task definitions, train/test splits policy, anti-overfit, leaderboard fields.`,
        [
          ">=5 tasks defined",
          "Metrics clear",
          "Split policy",
          "Anti-overfit notes",
          "Apache-2.0",
        ],
        { tokens: 100000, tags: "benchmarks,metrics" }
      ),
      leaf(
        "Baseline agents catalog + result format schema",
        `BASELINES.md + results.schema.json: classical + learning baselines notes, result format for fair compare.`,
        [
          ">=4 baselines documented",
          "results.schema.json",
          "Training config notes",
          "Fair compare rules",
          "Apache-2.0",
        ],
        { tokens: 90000, tags: "baselines,schema,ml" }
      ),
      leaf(
        "Domain randomization & robustness protocol pack",
        `ROBUSTNESS.md: randomization axes, protocol, report template, failure taxonomy.`,
        [
          "Randomization axes",
          "Protocol",
          "Report template",
          "Failure taxonomy",
          "Apache-2.0",
        ],
        { tokens: 80000, tags: "robustness,eval" }
      ),
      leaf(
        "Sim2real / real2sim transfer playbook (safety-first)",
        `TRANSFER.md: methods survey, eval metrics, safety notes, lab-only assumptions.`,
        [
          "Playbook",
          "Metrics",
          "Safety section",
          "Assumptions",
          "Apache-2.0",
        ],
        { tokens: 80000, tags: "sim2real,safety,docs" }
      ),
      leaf(
        "Eval server + leaderboard design + KIT-INDEX",
        `EVAL-SERVER.md + leaderboard schema notes + PEER-REVIEW-RUBRIC + KIT-INDEX.`,
        [
          "Server design",
          "Leaderboard fields",
          "Abuse prevention",
          "Rubric + KIT-INDEX",
          "Seal checklist",
        ],
        { tokens: 70000, tags: "infra,leaderboard,meta,seal" }
      ),
    ],
  },

  // ─── 10 LumenLex ───────────────────────────────────────────
  {
    slug: "lumenlex-universal-open-scientific-claim-graph",
    title: "LumenLex: Universal Open Scientific Claim Graph",
    license: "CC-BY / MIT",
    impactSummary:
      "Open claim extraction schemas, evidence graphs, provenance/versioning, and synthesis tools that make scientific knowledge navigable without fabricated citations.",
    alignmentCheck:
      "PASS: open science; provenance-first; no paywall bypass or author harassment.",
    description: purpose({
      body: "LumenLex builds the hierarchical open graph linking scientific claims to evidence, methods, code, and data with versioning, contradiction links, cross-domain alignment, query/synthesis tools, and community curation.",
      problem:
        "Literature is overwhelming; claims are unlinked; AIs and humans both hallucinate citations without structured provenance graphs.",
      who: "Researchers, students, meta-scientists, AI literature agents, open science platforms.",
      whyHierarchy:
        "Extraction, relations, versioning, ontologies, query UX, curation, and integrations are parallel open packs.",
      inScope:
        "Schemas, extraction prompts, graph models, query APIs, curation workflows, integration matrices with open infrastructure.",
      outScope:
        "Paywall bypass, harassment of authors, fabricated papers, closed full-text dumps without license.",
      complements: "ANVIL cosmology packs; ChronosSim citations; TerraWeave provenance; NovaArchive for sealed graphs.",
      seal: "Claim graph kit: schemas + extraction pack + query notes + LEGAL-RAILS + KIT-INDEX.",
      rails: "No fabricated citations; confidence tags mandatory; open-access preferred.",
    }),
    masterPrompt: `You are Master Coordinator for LumenLex.
MISSION: Light the path through scientific claims with provenance.
${railsBlock("LumenLex", [
  "Fabricated citations are automatic reject.",
  "Prefer open-access sources; never instruct paywall bypass.",
])}`,
    masterAcceptance: `PASS when:
- >=7 leaves accepted under CC-BY/MIT
- Extraction schema + relation model + versioning + query notes peer-accepted
- LEGAL-RAILS + KIT-INDEX; anti-fabrication enforced in docs`,
    leaves: [
      leaf(
        "Ship LumenLex mission + researcher onboarding",
        `MISSION.md + ONBOARDING.md: graph concepts, contribution types, honesty rules.`,
        [
          "MISSION + ONBOARDING",
          "Honesty rules",
          "FAQ",
          "License split",
          "ASCII",
        ],
        { tokens: 40000, tags: "docs,onboarding,good-first", goodFirst: true }
      ),
      leaf(
        "Author LEGAL-RAILS + anti-fabrication + scraping policy",
        `LEGAL-RAILS.md: no paywall bypass, no harassment, citation honesty, refusals.`,
        [
          "LEGAL-RAILS",
          "Scraping policy",
          "3 refusals",
          "Footer",
          "Header",
        ],
        { tokens: 45000, tags: "legal,rails", goodFirst: true }
      ),
      leaf(
        "Claim extraction schema + agent prompt package",
        `claim.schema.json + EXTRACTION.md + prompts: extract claims/methods/limitations with confidence; 2 worked open-access examples (real papers).`,
        [
          "Valid claim schema",
          "Prompt package",
          "2 real OA worked examples",
          "Confidence fields",
          "MIT/CC-BY",
        ],
        { tokens: 110000, tags: "extraction,schema,agents" }
      ),
      leaf(
        "Evidence linking + support/contradiction ontology",
        `relations.md + relation.schema.json: supports, contradicts, refines, replicates; uncertainty; examples.`,
        [
          "Relation ontology",
          "Valid schema",
          ">=4 examples",
          "Uncertainty model",
          "CC-BY/MIT",
        ],
        { tokens: 90000, tags: "ontology,graph,science" }
      ),
      leaf(
        "Versioning, provenance, confidence model pack",
        `VERSIONING.md: claim versions, supersession, provenance fields, confidence rubric, migration notes.`,
        [
          "Version model",
          "Provenance fields",
          "Confidence rubric",
          "Example history",
          "MIT header",
        ],
        { tokens: 80000, tags: "provenance,versioning" }
      ),
      leaf(
        "Cross-domain alignment strategy without false unification",
        `ALIGNMENT.md: how to link domains, conflict handling, anti-overunification examples.`,
        [
          "Strategy doc",
          "Conflict handling",
          "2 anti-patterns",
          "Examples",
          "CC-BY/MIT",
        ],
        { tokens: 80000, tags: "ontology,alignment" }
      ),
      leaf(
        "Query/synthesis API notes + honesty rails for summaries",
        `QUERY.md + synthesis rails: APIs, visualization notes, summary agents that must quote graph nodes not invent papers.`,
        [
          "API notes",
          "Synthesis honesty rails",
          "Example queries",
          "Viz notes",
          "MIT header",
        ],
        { tokens: 90000, tags: "api,synthesis,ux" }
      ),
      leaf(
        "Community curation workflow + spam controls",
        `CURATION.md: roles, review, spam/vandalism controls, reputation hooks (design only).`,
        [
          "Curation workflow",
          "Spam controls",
          "Roles",
          "Examples",
          "MIT header",
        ],
        { tokens: 70000, tags: "curation,governance" }
      ),
      leaf(
        "Open science integration matrix + KIT-INDEX",
        `INTEGRATIONS.md matrix (preprints, code, data repos) + PEER-REVIEW-RUBRIC + KIT-INDEX.`,
        [
          "Integration matrix",
          "Adapter notes",
          "Rubric",
          "KIT-INDEX",
          "Seal checklist",
        ],
        { tokens: 60000, tags: "integrations,meta,seal" }
      ),
    ],
  },

  // ─── 11 PulseNet ───────────────────────────────────────────
  {
    slug: "pulsenet-decentralized-open-health-signal-synthesis",
    title: "PulseNet: Decentralized Open Health Signal Synthesis",
    license: "MIT",
    impactSummary:
      "Privacy-first contribution protocols, signal schemas, DP/aggregation designs, and governance packs for population health insights without centralized raw biometrics.",
    alignmentCheck:
      "PASS: public health with privacy-first design; not civilian surveillance; DP/local processing emphasized.",
    description: purpose({
      body: "PulseNet designs hierarchical privacy-preserving protocols and tools so individuals can contribute health-related signals into population insights and early-warning research while retaining control.",
      problem:
        "Wearable and health signals are siloed in closed apps; public health lacks open privacy-preserving contribution protocols agents can implement.",
      who: "Public health researchers, privacy engineers, civic tech, individuals who want control over contribution.",
      whyHierarchy:
        "Protocols, schemas, models, UX, queries, governance, and pilots are independent claimable packs.",
      inScope:
        "DP/secure aggregation designs, signal standards, synthetic eval, dashboards, research query policy, ethics/DPIA-style templates, pilot plans.",
      outScope:
        "Covert population tracking products, reidentification guides, clinical diagnosis claims, real patient dumps.",
      complements: "VitalForge (device/AI diagnostics education); SynthCivic (governance patterns); ANVIL for analysis swarms on synthetic aggregates.",
      seal: "Privacy protocol kit + schemas + governance + LEGAL-RAILS + KIT-INDEX under MIT.",
      rails: "Privacy threat model first; no reidentification recipes; not clinical advice.",
    }),
    masterPrompt: `You are Master Coordinator for PulseNet.
MISSION: Collective health insight without surrendering individual sovereignty.
${railsBlock("PulseNet", [
  "No reidentification playbooks.",
  "Not clinical advice; research/public-health tooling framing.",
  "Prefer local processing + DP + secure aggregation designs.",
])}`,
    masterAcceptance: `PASS when:
- >=7 leaves accepted under MIT
- Contribution protocol + signal schema + privacy threat model + governance peer-accepted
- LEGAL-RAILS + KIT-INDEX; no PII datasets`,
    leaves: [
      leaf(
        "Ship PulseNet mission + privacy promise one-pager",
        `MISSION.md + PRIVACY-PROMISE.md for participants and builders.`,
        [
          "MISSION + privacy promise",
          "Plain-language rights",
          "FAQ",
          "MIT header",
          "ASCII",
        ],
        { tokens: 40000, tags: "docs,privacy,good-first", goodFirst: true }
      ),
      leaf(
        "Author LEGAL-RAILS + anti-surveillance policy",
        `LEGAL-RAILS.md: refuse covert tracking products, reidentification assistance, dual-use; sample refusals; DPIA-style checklist stub.`,
        [
          "LEGAL-RAILS",
          "DPIA-style checklist stub",
          "3 refusals",
          "Footer",
          "Header",
        ],
        { tokens: 50000, tags: "legal,privacy,rails", goodFirst: true }
      ),
      leaf(
        "Privacy-preserving contribution protocol spec v0",
        `PROTOCOL.md: local processing, DP parameters honesty, secure aggregation options, threat model, dropout handling.`,
        [
          "Protocol spec",
          "Threat model",
          "Privacy budget notes",
          "Dropout handling",
          "MIT header",
        ],
        { tokens: 110000, tags: "protocol,privacy,dp" }
      ),
      leaf(
        "Signal standardization schema + quality framework",
        `signal.schema.json + QUALITY.md: wearable/environment/optional clinical-flag fields, quality scores, interoperability notes. No real PII examples.`,
        [
          "Valid schema",
          "QUALITY.md",
          "Synthetic examples only",
          "Interop notes",
          "MIT header",
        ],
        { tokens: 90000, tags: "schema,health,data" }
      ),
      leaf(
        "Population synthesis + anomaly model recipes (synthetic eval)",
        `MODELS.md: aggregation-friendly models, anomaly classes, false-alarm policy, synthetic eval plan only.`,
        [
          "Model recipes",
          "False-alarm policy",
          "Synthetic eval plan",
          "Privacy eval notes",
          "MIT header",
        ],
        { tokens: 100000, tags: "ml,public-health,eval" }
      ),
      leaf(
        "Individual dashboard + consent/export/delete UX pack",
        `UX.md: contribution controls, consent UX, export/delete, accessibility, dark patterns refuse list.`,
        [
          "UX notes",
          "Consent flows",
          "Export/delete rights",
          "Anti-dark-pattern list",
          "MIT header",
        ],
        { tokens: 70000, tags: "ux,consent,good-first", goodFirst: true }
      ),
      leaf(
        "Early-warning research query system design",
        `QUERY.md: who can query aggregates, access policy, example synthetic alerts, rate limits, audit.`,
        [
          "Query design",
          "Access policy",
          "Synthetic alert examples",
          "Audit notes",
          "MIT header",
        ],
        { tokens: 80000, tags: "api,public-health,policy" }
      ),
      leaf(
        "Governance pack + ethics board template",
        `GOVERNANCE.md: roles, incident response for privacy bugs, ethics review template, jurisdiction placeholders disclaimer.`,
        [
          "Governance model",
          "Incident response",
          "Ethics template",
          "Disclaimer",
          "MIT header",
        ],
        { tokens: 80000, tags: "governance,ethics" }
      ),
      leaf(
        "Pilot plan + peer-review/KIT-INDEX",
        `PILOT.md + PEER-REVIEW-RUBRIC + KIT-INDEX for seal.`,
        [
          "Pilot plan + success metrics",
          "IRB/ethics note template",
          "Rubric with privacy dimension",
          "KIT-INDEX",
          "Seal checklist",
        ],
        { tokens: 60000, tags: "pilot,meta,seal" }
      ),
    ],
  },

  // ─── 12 StellarForge ───────────────────────────────────────
  {
    slug: "stellarforge-open-collaborative-space-mission-kit",
    title: "StellarForge: Open Collaborative Space Mission Design & Simulation Kit",
    license: "MIT / Apache-2.0",
    impactSummary:
      "Open orbital physics module designs, spacecraft design packs, mission optimization sketches, and educational CubeSat/lunar concept kits for students and small teams - peaceful exploration only.",
    alignmentCheck:
      "PASS: education/engineering public good; peaceful exploration; no weapons or dual-use strike systems.",
    description: purpose({
      body: "StellarForge opens hierarchical software concepts and workflows for designing and simulating space missions from CubeSats to lunar surface concepts: physics engines, design modules, optimization, collaboration, education packs, and validation against public mission data.",
      problem:
        "Professional mission design tools are closed or fragmented; students and small teams lack open hierarchical kits agents can help build.",
      who: "University teams, CubeSat clubs, educators, open space software developers, planetary science students.",
      whyHierarchy:
        "Physics, design modules, optimizers, collab, education, mission packs, and validation are parallel leaves.",
      inScope:
        "Physics module design, design interfaces, optimization frameworks, collab workflows, viz/education, example mission packs, validation plans using public data.",
      outScope:
        "Weapons, strike systems, reentry attack profiles, classified trajectories, export-controlled detailed munitions.",
      complements: "AetherBench (embodied/planetary robots); NovaArchive (deep-space data resilience); ANVIL for swarm optimizers.",
      seal: "Mission design education kit + example packs + LEGAL-RAILS + KIT-INDEX under MIT/Apache-2.0.",
      rails: "Peaceful exploration only; honest validation limits.",
    }),
    masterPrompt: `You are Master Coordinator for StellarForge.
MISSION: Democratize peaceful space mission design tools.
${railsBlock("StellarForge", [
  "Peaceful exploration only - refuse weapons and strike systems.",
  "Validate against public ephemerides/mission data where claimed.",
])}`,
    masterAcceptance: `PASS when:
- >=7 leaves accepted under MIT/Apache-2.0
- Physics design + design modules + >=2 mission packs + validation notes peer-accepted
- LEGAL-RAILS + KIT-INDEX; peaceful-use policy present`,
    leaves: [
      leaf(
        "Ship StellarForge mission + student team onboarding",
        `MISSION.md + STUDENT-ONBOARDING.md: how clubs claim leaves, peaceful-use policy, prerequisites honesty.`,
        [
          "MISSION + student onboarding",
          "Peaceful-use summary",
          "Prereq honesty",
          "FAQ",
          "MIT/Apache note",
        ],
        { tokens: 40000, tags: "docs,education,good-first", goodFirst: true }
      ),
      leaf(
        "Author LEGAL-RAILS + peaceful-use + export-awareness notes",
        `LEGAL-RAILS.md: weapons refuse, high-level export-awareness (not legal advice), sample refusals, footer.`,
        [
          "LEGAL-RAILS",
          "Peaceful-use policy",
          "3 refusals",
          "Disclaimer on export notes",
          "Header",
        ],
        { tokens: 50000, tags: "legal,rails,space", goodFirst: true }
      ),
      leaf(
        "Core orbital / multi-body physics module design pack",
        `PHYSICS.md + interfaces: two-body, perturbations notes, multi-body scope, units, validation against public ephemerides plan, API sketch.`,
        [
          "PHYSICS.md",
          "API sketch",
          "Units/conventions",
          "Validation plan",
          "MIT header",
        ],
        { tokens: 110000, tags: "physics,orbital,design" }
      ),
      leaf(
        "Spacecraft/payload/surface design module interfaces",
        `DESIGN-MODULES.md: spacecraft, payload, surface system module interfaces, example CubeSat config YAML, open component library notes.`,
        [
          "Module interfaces",
          "Example CubeSat config",
          "Component library notes",
          "Extension points",
          "Apache-2.0/MIT",
        ],
        { tokens: 100000, tags: "spacecraft,design,cubesat" }
      ),
      leaf(
        "Mission simulation + optimization framework sketch",
        `OPTIMIZATION.md: objectives, constraints, transparent cost functions, example run config, honesty about local minima.`,
        [
          "Optimizer design",
          "Cost functions",
          "Example run config",
          "Limitations section",
          "MIT header",
        ],
        { tokens: 90000, tags: "optimization,simulation" }
      ),
      leaf(
        "Collaborative design + version control workflow pack",
        `COLLAB.md: multi-team workflows, merge strategy, review checklist, conflict resolution for mission parameters.`,
        [
          "Collab model",
          "Merge strategy",
          "Review checklist",
          "Example team roles",
          "MIT header",
        ],
        { tokens: 70000, tags: "collaboration,process,good-first", goodFirst: true }
      ),
      leaf(
        "Visualization + classroom lab outline",
        `VIZ-EDU.md: visualization needs, 1 classroom lab without proprietary software mandate, accessibility.`,
        [
          "Viz notes",
          "Classroom lab",
          "Accessibility",
          "Assessment idea",
          "MIT header",
        ],
        { tokens: 70000, tags: "education,viz" }
      ),
      leaf(
        "Example mission packs: CubeSat + lunar ISRU concept",
        `mission-packs/cubesat.md + mission-packs/lunar-isru.md with parameters, success criteria, public references, educational depth labels.`,
        [
          "2 mission packs",
          "Parameters + success criteria",
          "Public references",
          "Educational labels",
          "License header",
        ],
        { tokens: 110000, tags: "missions,content,examples" }
      ),
      leaf(
        "Validation against public mission data + KIT-INDEX",
        `VALIDATION.md + PEER-REVIEW-RUBRIC + KIT-INDEX: residual error reporting, public data sources, continuous improvement loop.`,
        [
          "Validation plan",
          "Public data sources",
          "Residual error section",
          "Rubric + KIT-INDEX",
          "Seal checklist",
        ],
        { tokens: 70000, tags: "validation,meta,seal" }
      ),
    ],
  },
];

async function replaceLeaves(projectId: string, rootId: string, leaves: LeafIn[]) {
  // Delete existing non-root tasks (cascade claims/contributions)
  const existingLeaves = await prisma.task.findMany({
    where: { projectId, parentId: { not: null } },
    select: { id: true, status: true },
  });
  const blocked = existingLeaves.filter((t) => t.status !== "OPEN");
  if (blocked.length) {
    throw new Error(
      `Project ${projectId} has non-OPEN leaves; refuse destructive replace: ${blocked
        .map((b) => b.id)
        .join(",")}`
    );
  }
  await prisma.task.deleteMany({
    where: { projectId, parentId: { not: null } },
  });

  let i = 1;
  for (const L of leaves) {
    await prisma.task.create({
      data: {
        projectId,
        parentId: rootId,
        title: L.title,
        prompt: L.prompt,
        acceptanceCriteria: L.acceptanceCriteria,
        estimatedTokens: L.estimatedTokens,
        status: TaskStatus.OPEN,
        sortOrder: i++,
        tags: L.tags,
        goodFirst: !!L.goodFirst,
      },
    });
  }
}

async function enhanceOne(spec: EnhanceSpec) {
  const project = await prisma.project.findUnique({
    where: { slug: spec.slug },
    select: {
      id: true,
      slug: true,
      tasks: {
        where: { parentId: null },
        select: { id: true },
        take: 1,
      },
    },
  });
  if (!project) {
    console.warn("SKIP missing", spec.slug);
    return { slug: spec.slug, ok: false, reason: "missing" };
  }
  const root = project.tasks[0];
  if (!root) {
    console.warn("SKIP no root", spec.slug);
    return { slug: spec.slug, ok: false, reason: "no-root" };
  }

  await prisma.project.update({
    where: { id: project.id },
    data: {
      title: spec.title,
      description: spec.description,
      impactSummary: spec.impactSummary,
      alignmentCheck: spec.alignmentCheck,
      license: spec.license,
      status: "ACTIVE",
    },
  });

  const leafTok = spec.leaves.reduce((s, l) => s + l.estimatedTokens, 0);
  await prisma.task.update({
    where: { id: root.id },
    data: {
      title: `Master goal: ${spec.title}`,
      prompt: spec.masterPrompt,
      acceptanceCriteria: spec.masterAcceptance,
      estimatedTokens: leafTok + 5000,
      status: TaskStatus.OPEN,
      sortOrder: 0,
      tags: "master,coordinator",
      goodFirst: false,
    },
  });

  await replaceLeaves(project.id, root.id, spec.leaves);

  await prisma.ledgerEntry.create({
    data: {
      projectId: project.id,
      kind: "ADJUSTMENT",
      amountCents: 0,
      summary: `Purpose + leaf enhance audit: ${spec.leaves.length} shippable leaves, goodFirst/tags/rails`,
      actorHandle: "SuddenlyJon",
    },
  });

  console.log(
    "enhanced",
    spec.slug,
    "leaves",
    spec.leaves.length,
    "goodFirst",
    spec.leaves.filter((l) => l.goodFirst).length
  );
  return {
    slug: spec.slug,
    ok: true,
    leaves: spec.leaves.length,
    goodFirst: spec.leaves.filter((l) => l.goodFirst).length,
    url: `https://grokforge.app/projects/${spec.slug}`,
  };
}

async function polishAnvil() {
  const project = await prisma.project.findUnique({
    where: { slug: "anvil-infinity" },
    select: {
      id: true,
      tasks: {
        orderBy: { sortOrder: "asc" },
        select: { id: true, parentId: true, title: true, sortOrder: true },
      },
    },
  });
  if (!project) return { ok: false, reason: "missing" };

  const tagMap: Record<string, { tags: string; goodFirst?: boolean }> = {
    "Publish architecture + 11-pillar hierarchical task tree": {
      tags: "architecture,docs,planning",
    },
    "Draft constitutional safety rails and LEGAL-RAILS": {
      tags: "legal,rails,safety,good-first",
      goodFirst: true,
    },
    "Implement core agent loop package (plan-act-observe-critique)": {
      tags: "runtime,python,core",
    },
    "Implement hierarchical supervisor and worker model": {
      tags: "orchestration,runtime",
    },
    "Ship memory layers + knowledge graph substrate v0": {
      tags: "memory,graph,storage",
    },
    "Build task graph engine with parallel dependency dispatch": {
      tags: "dag,orchestration",
    },
    "Ship GrokForge Agent API client + mock claim-submit-seal": {
      tags: "grokforge,api,integration",
    },
    "Build skills runtime discovery versioning composition": {
      tags: "skills,plugins",
    },
    "Ship safety enforcement hooks and red-team suite stubs": {
      tags: "safety,eval",
    },
    "Ship observability schemas dashboard stubs dark-golden theme": {
      tags: "observability,theme,ux",
    },
    "Ship Cosmology domain pack v0 with example quest": {
      tags: "domain,cosmology,science",
    },
    "Ship eval harness CI seal package and monorepo glue": {
      tags: "ci,eval,seal,meta",
    },
  };

  let updated = 0;
  for (const t of project.tasks) {
    if (!t.parentId) {
      await prisma.task.update({
        where: { id: t.id },
        data: { tags: "master,coordinator" },
      });
      updated++;
      continue;
    }
    const m = tagMap[t.title];
    if (m) {
      await prisma.task.update({
        where: { id: t.id },
        data: { tags: m.tags, goodFirst: !!m.goodFirst },
      });
      updated++;
    }
  }

  // Sharpen impact only slightly if needed - keep description
  await prisma.project.update({
    where: { id: project.id },
    data: {
      impactSummary:
        "Open hierarchical multi-agent scientific harness on GrokForge: claimable leaves, knowledge graph, cosmology pack, safety rails. Labor + compute pots only (funding goal $0). Never stores user xAI keys.",
    },
  });

  console.log("anvil polish tasks_tagged", updated);
  return { ok: true, tagged: updated, url: "https://grokforge.app/projects/anvil-infinity" };
}

async function main() {
  const results = [];
  for (const spec of SPECS) {
    results.push(await enhanceOne(spec));
  }
  const anvil = await polishAnvil();

  const active = await prisma.project.count({ where: { status: "ACTIVE" } });
  const openLeaves = await prisma.task.count({
    where: {
      status: "OPEN",
      parentId: { not: null },
      project: { status: "ACTIVE" },
    },
  });
  const goodFirst = await prisma.task.count({
    where: {
      goodFirst: true,
      status: "OPEN",
      parentId: { not: null },
      project: { status: "ACTIVE" },
    },
  });

  console.log(
    JSON.stringify(
      { results, anvil, active, openLeaves, goodFirstOpen: goodFirst },
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
