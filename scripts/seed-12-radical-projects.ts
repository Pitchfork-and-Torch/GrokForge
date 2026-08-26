/**
 * Publish the Desktop GrokForge_12_Projects_Package on live GrokForge.
 * Idempotent by slug. Founder = SuddenlyJon.
 * Banners: promo JPGs from the package (Vercel Blob when token present).
 *
 * Run from repo root:
 *   npx tsx scripts/seed-12-radical-projects.ts
 */
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import {
  FundType,
  LedgerKind,
  PrismaClient,
  ProjectCategory,
  TaskStatus,
} from "@prisma/client";

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

const PROMO_DIR = resolve(
  process.env.USERPROFILE || process.env.HOME || "",
  "Desktop/GrokForge_12_Projects_Package/grokforge_projects_package/promo_graphics"
);

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
  impactSummary: string;
  alignmentCheck: string;
  masterPrompt: string;
  masterAcceptance: string;
  bannerFile: string;
  leaves: Omit<Leaf, "sortOrder">[];
};

function leaf(
  title: string,
  prompt: string,
  acceptanceCriteria: string,
  estimatedTokens = 12000
): Omit<Leaf, "sortOrder"> {
  return { title, prompt, acceptanceCriteria, estimatedTokens };
}

/** 12 radical greater-good projects from the operator package. */
const SPECS: Spec[] = [
  {
    slug: "echovault-global-bioacoustic-archive-decoder",
    title: "EchoVault: Global Bioacoustic Archive & Decoder",
    description:
      "Build the definitive open hierarchical archive of planetary bioacoustics with AI-native decoding models. Tasks span data standards, massive annotation, foundation model development, real-time ecosystem monitoring tools, and ethical frameworks. Final sealed package will contain datasets, models, software, and protocols that let both humans and AIs listen to, understand, and protect the living soundscape of Earth. Greater-good, open by default, multi-agent ready.",
    category: ProjectCategory.CLIMATE,
    license: "CC-BY-SA-4.0 / MIT",
    impactSummary:
      "Open bioacoustic archive + decoder models for biodiversity early warning and multi-modal AI understanding of living ecosystems.",
    alignmentCheck:
      "PASS: conservation science public good; open data/code licenses; no civilian surveillance.",
    masterPrompt:
      "Coordinate hierarchical multi-agent work on EchoVault: open bioacoustic data standards, annotation frameworks, open models, monitoring tools, ethics, and packaging. Merge only verified open contributions. Funding goal $0 - labor + compute only.",
    masterAcceptance:
      "Nested leaves accepted under open licenses; schema + sample data + model recipes + ethics docs shippable; public ledger complete.",
    bannerFile: "01_EchoVault.jpg",
    leaves: [
      leaf(
        "Data acquisition & metadata standards",
        "Define protocols, metadata schemas, and citizen/sensor pipelines for bioacoustic capture at global scale. Prefer existing open standards; document gaps.",
        "Schema doc + pipeline notes + sources; open license header; no private wildlife location leakage rules."
      ),
      leaf(
        "Annotation & labeling frameworks",
        "Design species, behavior, context, and quality labeling frameworks for multi-agent and human annotators.",
        "Label taxonomy + inter-annotator rubric + example labeled clips metadata; MIT/CC-BY."
      ),
      leaf(
        "Open model training & evaluation suite",
        "Specify self-supervised, supervised, and zero-shot evaluation suites for bioacoustic foundation models.",
        "Eval harness design + baseline metrics + public dataset pointers; no closed weights required."
      ),
      leaf(
        "Real-time monitoring & anomaly detection",
        "Design tools that detect biodiversity anomalies and anthropogenic noise events from streaming audio.",
        "Architecture + alert policy + false-positive rails; open-source stack notes."
      ),
      leaf(
        "Visualization, query, and education UI",
        "Specify query/visualization and educational interfaces so humans and AIs can explore the archive.",
        "Wireframes + API sketch + accessibility notes; MIT UI notes."
      ),
      leaf(
        "Legal/ethical frameworks for sensitive data",
        "Draft ethical frameworks for indigenous knowledge, sensitive habitats, and dual-use risk of acoustic monitoring.",
        "Ethics brief + consent checklist + redaction policy; CC-BY."
      ),
      leaf(
        "Packaging, docs, continuous update protocol",
        "Define sealed-package layout, documentation, and continuous update protocols for EchoVault releases.",
        "Package manifest + update SOP + citation of Forged on GrokForge."
      ),
    ],
  },
  {
    slug: "forgemind-open-multi-agent-alignment-gym",
    title: "ForgeMind: Open Multi-Agent Alignment Gym",
    description:
      "Construct a production-grade, open hierarchical multi-agent simulation gym focused on cooperation, truth-seeking, and value alignment. Leaf tasks cover engine development, rich scenario design, rigorous evaluation metrics, baseline agents, and continuous challenge infrastructure. The sealed package becomes the public proving ground where humans and AIs can stress-test and improve multi-agent systems for the greater good.",
    category: ProjectCategory.PUBLIC_GOODS_SOFTWARE,
    license: "Apache-2.0",
    impactSummary:
      "Open multi-agent alignment gym for cooperation, truth-seeking, and verifiable evaluation.",
    alignmentCheck:
      "PASS: AI safety research infrastructure; open license; no weapons or surveillance tooling.",
    masterPrompt:
      "Coordinate ForgeMind: simulation engine, scenarios, metrics, baselines, viz/replay, hybrid eval, and leaderboard. Open Apache-2.0 only. Funding goal $0.",
    masterAcceptance:
      "Engine + scenarios + metrics + baselines documented; peer-accepted leaves; Apache-2.0 artifacts.",
    bannerFile: "02_ForgeMind.jpg",
    leaves: [
      leaf(
        "Core simulation engine & agent interfaces",
        "Specify core multi-agent simulation engine APIs and agent interfaces for reproducible runs.",
        "API sketch + minimal loop pseudocode + license header."
      ),
      leaf(
        "Scenario library pack",
        "Design scenario packs: common-pool resources, debate, scientific collaboration, crisis response.",
        "At least 4 scenario specs with success metrics and open datasets where needed."
      ),
      leaf(
        "Evaluation metrics & scoring",
        "Define truthfulness, fairness, robustness, and scalability metrics with honest uncertainty.",
        "Metric definitions + scoring rubric + anti-gaming notes."
      ),
      leaf(
        "Baseline agent implementations",
        "Specify baseline agents and training loops suitable as public reference implementations.",
        "Baseline catalog + training notes + evaluation hooks."
      ),
      leaf(
        "Visualization, logging, and replay tools",
        "Design logging, replay, and visualization for multi-agent runs.",
        "Schema for logs + replay UX notes + sample trace format."
      ),
      leaf(
        "Human-in-the-loop hybrid evaluation",
        "Protocols for hybrid human+AI evaluation of multi-agent behavior.",
        "Protocol doc + rater instructions + inter-rater reliability plan."
      ),
      leaf(
        "Challenge generation & leaderboard",
        "Continuous challenge generation and public leaderboard infrastructure design.",
        "Leaderboard schema + challenge generator outline + abuse prevention."
      ),
    ],
  },
  {
    slug: "terraweave-living-open-planetary-digital-twin",
    title: "TerraWeave: Living Open Planetary Digital Twin",
    description:
      "Engineer the first truly open, continuously updated hierarchical digital twin of Earth systems. Tasks include multi-source data fusion, multi-resolution twin architecture, domain-specific layers, AI prediction modules, provenance-rich APIs, and validation frameworks. The sealed package delivers tools and data that let humanity and AIs see, understand, and steward the planet as a coherent whole.",
    category: ProjectCategory.CLIMATE,
    license: "MIT",
    impactSummary:
      "Open living planetary digital twin with provenance, domain layers, and AI nowcasting for climate stewardship.",
    alignmentCheck:
      "PASS: climate / earth systems public good; open data fusion; no dual-use harm.",
    masterPrompt:
      "Coordinate TerraWeave digital twin: ingestion, core architecture, domain layers, AI modules, APIs, validation, governance. Funding goal $0.",
    masterAcceptance:
      "Architecture + schemas + sample layers + validation plan accepted under MIT / open data licenses.",
    bannerFile: "03_TerraWeave.jpg",
    leaves: [
      leaf(
        "Data ingestion & harmonization standards",
        "Design multi-source ingestion pipelines and harmonization standards for satellite, ground, and citizen data.",
        "Pipeline design + schema + public data source list."
      ),
      leaf(
        "Core twin architecture",
        "Specify multi-resolution spatial-temporal twin core (graph/voxel/hybrid) with versioning.",
        "Architecture ADR + data model sketch + update protocol."
      ),
      leaf(
        "Domain layers pack",
        "Define domain layers: atmosphere, ocean, land, biosphere, cryosphere, anthroposphere.",
        "Layer specs + interop rules + sample regional deep-dive outline."
      ),
      leaf(
        "AI synthesis, nowcast, projection modules",
        "Design AI modules for synthesis, nowcasting, and long-term projections with uncertainty.",
        "Module interfaces + uncertainty reporting + baseline recipes."
      ),
      leaf(
        "Query, visualization, and API layers",
        "Specify query APIs and visualization layers for humans and agents.",
        "OpenAPI sketch + viz requirements + rate/fair-use notes."
      ),
      leaf(
        "Validation, UQ, and provenance",
        "Validation, uncertainty quantification, and full provenance for twin outputs.",
        "Validation plan + provenance schema + UQ checklist."
      ),
      leaf(
        "Open governance & continuous updates",
        "Governance and continuous update protocols for the open twin.",
        "Governance brief + contribution ladder + release cadence."
      ),
    ],
  },
  {
    slug: "mythosengine-endangered-knowledge-myth-forge",
    title: "MythosEngine: Endangered Knowledge & Myth Preservation Forge",
    description:
      "Build hierarchical open tools and processes to preserve, structure, and revitalize endangered oral traditions, languages, and indigenous knowledge. Tasks cover ethics, capture pipelines, knowledge graphs, generative AI for cultural continuity, educational experiences, and community-controlled archival packages. The sealed result becomes a living forge for human cultural memory that both people and AIs can learn from and help sustain.",
    category: ProjectCategory.EDUCATION,
    license: "CC-BY-NC-SA",
    impactSummary:
      "Ethical open tools to preserve and revitalize endangered languages, myths, and indigenous knowledge.",
    alignmentCheck:
      "PASS: cultural heritage preservation; community consent first; no extractive scraping of sacred material without permission.",
    masterPrompt:
      "Coordinate MythosEngine: ethics, capture, knowledge graphs, generative revitalization, education, archival packaging, community governance. Respect community overrides. Funding goal $0.",
    masterAcceptance:
      "Ethics + capture + KG schema + templates peer-accepted; community governance documented.",
    bannerFile: "04_MythosEngine.jpg",
    leaves: [
      leaf(
        "Ethical frameworks & community partnership",
        "Draft ethical frameworks and community partnership protocols with free, prior, informed consent.",
        "Ethics protocol + consent templates + veto rights for communities."
      ),
      leaf(
        "Recording, transcription, translation pipelines",
        "Design recording, transcription, and translation pipelines for oral traditions.",
        "Pipeline design + tool recommendations + quality gates."
      ),
      leaf(
        "Knowledge graph schemas (myth, kinship, ecology)",
        "Define KG schemas for myth, kinship, ecology, and ritual with provenance.",
        "Schema JSON/YAML + example graph fragment + license notes."
      ),
      leaf(
        "AI generation, translation, interactive storytelling",
        "Specify AI models/workflows for generation, translation, and interactive storytelling under community control.",
        "Workflow + safety rails + community approval hooks."
      ),
      leaf(
        "Educational & immersive experience templates",
        "Create educational and immersive experience templates for revitalization.",
        "Templates + sample lesson + accessibility notes."
      ),
      leaf(
        "Archival packaging & long-term preservation",
        "Archival packaging and long-term preservation strategies for sealed cultural packages.",
        "Package layout + medium recommendations + checksum/provenance plan."
      ),
      leaf(
        "Community governance and access tools",
        "Community governance and access control tools that keep final authority with knowledge holders.",
        "Governance model + access matrix + open-source tool notes."
      ),
    ],
  },
  {
    slug: "vitalforge-open-hardware-ai-global-diagnostics",
    title: "VitalForge: Open Hardware & AI Protocols for Global Diagnostics",
    description:
      "Create a hierarchical open ecosystem of repairable, low-cost diagnostic devices and AI analysis pipelines for global health equity. Leaf tasks span needs analysis, hardware design and simulation, local manufacturing docs, AI models, validation protocols, and training kits. The sealed package empowers communities and AIs to bring high-quality diagnostics to the places that need them most.",
    category: ProjectCategory.HEALTH,
    license: "CERN-OHL / MIT",
    impactSummary:
      "Open repairable diagnostic hardware + AI analysis for global health equity.",
    alignmentCheck:
      "PASS: global health public good; open hardware; not a consumer medical device claim without validation.",
    masterPrompt:
      "Coordinate VitalForge: needs, hardware, manufacturing, calibration, AI analysis, clinical validation research, training kits. Educational/research framing; no unvalidated clinical claims. Funding goal $0.",
    masterAcceptance:
      "Designs + BOMs + AI recipes + validation research + training materials under open licenses.",
    bannerFile: "05_VitalForge.jpg",
    leaves: [
      leaf(
        "Needs assessment & use-case prioritization",
        "Global health needs assessment and prioritization of diagnostic use cases for resource-limited settings.",
        "Ranked use cases + sources + equity criteria."
      ),
      leaf(
        "Hardware design + simulation pack",
        "Open hardware design (CAD/electronics/optics/microfluidics) plus simulation notes.",
        "Design brief + BOM sketch + simulation approach; CERN-OHL/MIT."
      ),
      leaf(
        "Manufacturing & repair manuals",
        "Local fabrication and repair manuals for community manufacturing.",
        "Manufacture steps + repair guide + parts alternatives."
      ),
      leaf(
        "Data acquisition protocols & calibration",
        "Data acquisition protocols and calibration procedures for diagnostic sensors.",
        "Protocol doc + calibration checklist + uncertainty notes."
      ),
      leaf(
        "AI analysis models (class/quant/anomaly)",
        "AI analysis model recipes for classification, quantification, and anomaly detection.",
        "Model recipes + eval metrics + dataset licensing notes."
      ),
      leaf(
        "Clinical validation & regulatory pathways research",
        "Research clinical validation frameworks and regulatory pathways (not legal advice).",
        "Research brief + checklist + jurisdiction placeholders + disclaimer."
      ),
      leaf(
        "Training materials and deployment kits",
        "Training curricula and deployment kits for local teams.",
        "Curriculum outline + kit checklist + open license."
      ),
    ],
  },
  {
    slug: "chronossim-verified-historical-multi-agent-sim",
    title: "ChronosSim: Verified Historical Multi-Agent Simulation Platform",
    description:
      "Develop an open hierarchical platform for source-grounded multi-agent simulations of historical societies and events. Tasks include the core engine, provenance systems, period packs, evidence-based agent models, educational interfaces, and counterfactual tools. The sealed package turns history into a living, queryable laboratory for humans and AIs seeking deeper understanding of the human story.",
    category: ProjectCategory.EDUCATION,
    license: "MIT / CC-BY",
    impactSummary:
      "Source-grounded historical multi-agent simulations for education, research, and cultural understanding.",
    alignmentCheck:
      "PASS: education/history research; source-cited; no historical denialism or harassment.",
    masterPrompt:
      "Coordinate ChronosSim: engine, source grounding, period packs, agent models, education UI, counterfactuals, validation. Prefer primary sources. Funding goal $0.",
    masterAcceptance:
      "Engine design + provenance + at least one period pack outline + validation plan accepted.",
    bannerFile: "06_ChronosSim.jpg",
    leaves: [
      leaf(
        "Core multi-agent historical simulation engine",
        "Specify the core multi-agent historical simulation engine and time model.",
        "Engine design + agent interface + tick model."
      ),
      leaf(
        "Source grounding & citation infrastructure",
        "Infrastructure for primary-source grounding and full citation of claims.",
        "Citation schema + example linked claim + anti-fabrication rails."
      ),
      leaf(
        "Period / content packs",
        "Design period or event content packs with uncertainty tags.",
        "At least 1 full period pack outline + source list."
      ),
      leaf(
        "Evidence-based agent behavior models",
        "Agent behavior models derived from historical evidence, not stereotypes.",
        "Model notes + evidence map + bias caution."
      ),
      leaf(
        "Visualization, narrative, education interfaces",
        "Educational interfaces, narrative generation, and visualization.",
        "UX notes + classroom use case + accessibility."
      ),
      leaf(
        "Counterfactual experiment frameworks",
        "Frameworks for counterfactual experiments with clear epistemic limits.",
        "Experiment protocol + guardrails against myth-making."
      ),
      leaf(
        "Validation against known outcomes",
        "Validation against known outcomes and expert review workflows.",
        "Validation plan + expert review checklist."
      ),
    ],
  },
  {
    slug: "novaarchive-interstellar-multimillennial-data-resilience",
    title: "NovaArchive: Interstellar & Multi-Millennial Data Resilience Protocol",
    description:
      "Engineer open hierarchical protocols and tools for data that survives civilizations and interplanetary distances. Tasks cover threat models, self-describing formats, resilient encoding, medium strategies, future-proof decoding, and pilot scientific/cultural archives. The sealed package becomes humanity's and AI's insurance policy against forgetting.",
    category: ProjectCategory.OPEN_SCIENCE,
    license: "CC0 / MIT",
    impactSummary:
      "Open long-horizon archival protocols for multi-millennial and interplanetary data survival.",
    alignmentCheck:
      "PASS: open science / archival public good; no dual-use weapons content.",
    masterPrompt:
      "Coordinate NovaArchive: threat models, formats, FEC/encoding, media, decode protocols, reference impls, pilot archives. Funding goal $0.",
    masterAcceptance:
      "Protocol specs + reference impl outline + pilot archive plan under CC0/MIT.",
    bannerFile: "07_NovaArchive.jpg",
    leaves: [
      leaf(
        "Threat modeling (bit rot to cultural discontinuity)",
        "Threat model for bit rot, format obsolescence, cultural discontinuity, radiation, and more.",
        "Threat matrix + prioritized mitigations + sources."
      ),
      leaf(
        "Self-describing format design & metadata",
        "Self-describing formats and metadata schemas for future finders.",
        "Format sketch + metadata schema + example payload."
      ),
      leaf(
        "Error-correcting multi-redundant encoding",
        "Error-correcting and multi-redundant encoding strategies (e.g. RS-class).",
        "Encoding design + parameters + decode notes."
      ),
      leaf(
        "Medium recommendations",
        "Medium recommendations: optical, DNA, ceramic, stone, space-qualified storage.",
        "Medium comparison table + tradeoffs + pilot candidates."
      ),
      leaf(
        "Decoding and discovery protocols",
        "Protocols so future finders can discover and decode archives without modern context.",
        "Discovery ladder + bootstrap instructions + test cases."
      ),
      leaf(
        "Reference implementations and test suites",
        "Reference encode/decode libraries and test suites.",
        "API sketch + test vectors + MIT header."
      ),
      leaf(
        "Pilot scientific & cultural archives",
        "Pilot archives of high-value scientific and cultural data using the protocol.",
        "Pilot selection + packaging plan + integrity receipts."
      ),
    ],
  },
  {
    slug: "synthcivic-ai-augmented-open-deliberation-toolkit",
    title: "SynthCivic: AI-Augmented Open Deliberation & Consensus Toolkit",
    description:
      "Build hierarchical open tools and protocols for large-scale, transparent, AI-assisted collective deliberation and consensus. Tasks include protocol design, facilitation agents, bias detection, consensus methods, simulation testing, and ready-to-deploy kits. The sealed package helps humans and AIs deliberate better together for the greater good of complex societies.",
    category: ProjectCategory.PUBLIC_GOODS_SOFTWARE,
    license: "MIT / Apache-2.0",
    impactSummary:
      "Transparent AI-assisted deliberation and consensus tools with human final authority and public ledgers.",
    alignmentCheck:
      "PASS: civic tech / democracy capacity; human final authority; no manipulation tooling marketed as influence ops.",
    masterPrompt:
      "Coordinate SynthCivic: deliberation protocols, facilitation agents, bias detection, consensus methods, sims, audit ledgers, deployment kits. Funding goal $0.",
    masterAcceptance:
      "Protocols + toolkit design + bias modules + deployment kit peer-accepted under MIT/Apache-2.0.",
    bannerFile: "08_SynthCivic.jpg",
    leaves: [
      leaf(
        "Core deliberation protocol design",
        "Design core large-group deliberation protocols with transparency requirements.",
        "Protocol spec + roles + public-ledger requirements."
      ),
      leaf(
        "AI facilitation, summarization, synthesis agents",
        "AI facilitation and synthesis agents that do not seize final authority.",
        "Agent prompts + human override rules + audit log format."
      ),
      leaf(
        "Bias, polarization, manipulation detection",
        "Modules for bias, polarization, and manipulation detection with honest false-positive rates.",
        "Detector design + evaluation plan + misuse warnings."
      ),
      leaf(
        "Multi-scale consensus & preference aggregation",
        "Multi-scale consensus and preference aggregation methods with explainability.",
        "Method notes + fairness criteria + worked example."
      ),
      leaf(
        "Simulation environments for protocol testing",
        "Simulation environments to stress-test deliberation protocols before deployment.",
        "Sim design + metrics + sample scenario pack."
      ),
      leaf(
        "Transparency, audit, and public ledger integration",
        "Audit trails and public ledger integration for decisions and AI interventions.",
        "Ledger schema + audit checklist + privacy balance."
      ),
      leaf(
        "Deployment kits for NGOs and local governments",
        "Deployment kits for NGOs, local governments, and online communities.",
        "Kit checklist + pilot plan + open license."
      ),
    ],
  },
  {
    slug: "aetherbench-open-embodied-spatial-ai-challenge-suite",
    title: "AetherBench: Open Embodied & Spatial AI Challenge Suite",
    description:
      "Construct a hierarchical open suite of high-fidelity environments and benchmarks for embodied and spatial AI across scales. Tasks cover simulation engines, diverse environments, rigorous tasks/metrics, baselines, transfer tools, and continuous evaluation infrastructure. The sealed package becomes the shared proving ground that accelerates safe, capable physical intelligence for humanity and AIs.",
    category: ProjectCategory.PUBLIC_GOODS_SOFTWARE,
    license: "Apache-2.0",
    impactSummary:
      "Open embodied and spatial AI benchmarks from household robotics to planetary exploration.",
    alignmentCheck:
      "PASS: research infrastructure for robotics; open benchmarks; no autonomous weapons.",
    masterPrompt:
      "Coordinate AetherBench: sim frameworks, environments, tasks/metrics, baselines, domain randomization, sim2real, leaderboards. No weapons scenarios. Funding goal $0.",
    masterAcceptance:
      "Env library outline + benchmarks + baselines + eval infra design under Apache-2.0.",
    bannerFile: "09_AetherBench.jpg",
    leaves: [
      leaf(
        "Core simulation & physics frameworks",
        "Core simulation and physics framework choices for reproducible embodied AI.",
        "Framework decision + integration notes + license compatibility."
      ),
      leaf(
        "Environment library (indoor to extraterrestrial)",
        "Environment library spanning household, warehouse, outdoor, multi-robot, planetary.",
        "Env catalog + asset license rules + difficulty tiers."
      ),
      leaf(
        "Task & benchmark definitions with metrics",
        "Task and benchmark definitions with fair, reproducible metrics.",
        "Benchmark specs + metrics + anti-overfit splits."
      ),
      leaf(
        "Baseline agents and learning algorithms",
        "Baseline agents and learning algorithms for fair comparison.",
        "Baseline catalog + training configs + results format."
      ),
      leaf(
        "Domain randomization & robustness testing",
        "Domain randomization and robustness testing suites.",
        "Randomization axes + robustness protocol + report template."
      ),
      leaf(
        "Real-to-sim / sim-to-real transfer tools",
        "Tools and protocols for real-to-sim and sim-to-real transfer studies.",
        "Transfer playbook + evaluation metrics + safety notes."
      ),
      leaf(
        "Leaderboard, eval server, continuous challenges",
        "Evaluation server, leaderboard, and continuous challenge generation.",
        "Server design + leaderboard schema + abuse prevention."
      ),
    ],
  },
  {
    slug: "lumenlex-universal-open-scientific-claim-graph",
    title: "LumenLex: Universal Open Scientific Claim Graph",
    description:
      "Build the hierarchical open knowledge graph that links scientific claims to their evidence, methods, and data with full provenance. Tasks include extraction pipelines, relation modeling, versioning, cross-domain alignment, query tools, and continuous curation. The sealed package lights the path for humans and AIs through the expanding universe of scientific knowledge.",
    category: ProjectCategory.OPEN_SCIENCE,
    license: "CC-BY / MIT",
    impactSummary:
      "Versioned scientific claim graph linking claims to evidence, methods, code, and data.",
    alignmentCheck:
      "PASS: open science; provenance-first; no paywall bypass or harassment of authors.",
    masterPrompt:
      "Coordinate LumenLex: claim extraction, evidence linking, versioning, ontology alignment, query/synthesis, curation, open-science integrations. Funding goal $0.",
    masterAcceptance:
      "Extraction + graph schema + query tools + curation protocol accepted under CC-BY/MIT.",
    bannerFile: "10_LumenLex.jpg",
    leaves: [
      leaf(
        "Claim extraction pipelines",
        "Pipelines that extract claims from papers, preprints, and code with confidence tags.",
        "Pipeline design + schema + 2 open-access worked examples."
      ),
      leaf(
        "Evidence linking and support/contradiction",
        "Link evidence and model support/contradiction relations between claims.",
        "Relation ontology + examples + uncertainty modeling."
      ),
      leaf(
        "Versioning, provenance, confidence modeling",
        "Versioning, provenance, and confidence modeling for evolving claims.",
        "Version model + provenance fields + confidence rubric."
      ),
      leaf(
        "Cross-domain ontology alignment",
        "Align claims across scientific domains without false unification.",
        "Alignment strategy + conflict handling + examples."
      ),
      leaf(
        "Query, synthesis, and visualization interfaces",
        "Query, synthesis, and visualization interfaces for humans and agents.",
        "API sketch + viz notes + synthesis honesty rails."
      ),
      leaf(
        "Continuous update and community curation",
        "Continuous update and community curation tools.",
        "Curation workflow + reputation/review hooks + spam controls."
      ),
      leaf(
        "Integration with open science infrastructure",
        "Integration plan with existing open science infrastructure (preprints, code, data repos).",
        "Integration matrix + adapter notes + license compliance."
      ),
    ],
  },
  {
    slug: "pulsenet-decentralized-open-health-signal-synthesis",
    title: "PulseNet: Decentralized Open Health Signal Synthesis",
    description:
      "Design hierarchical privacy-first protocols and tools that turn personal health signals into collective insights without compromising individual control. Tasks cover contribution protocols, signal standards, synthesis models, user controls, early-warning systems, and governance. The sealed package enables safer, more responsive public health powered by both humans and AIs.",
    category: ProjectCategory.HEALTH,
    license: "MIT",
    impactSummary:
      "Privacy-preserving population health insights from wearables and optional clinical signals.",
    alignmentCheck:
      "PASS: public health with privacy-first design; differential privacy / local processing; not surveillance of civilians.",
    masterPrompt:
      "Coordinate PulseNet: privacy-preserving contribution, signal standards, population models, user dashboards, early warning, ethics/legal research, pilots. Funding goal $0.",
    masterAcceptance:
      "Protocols + software design + privacy guarantees + governance docs peer-accepted under MIT.",
    bannerFile: "11_PulseNet.jpg",
    leaves: [
      leaf(
        "Privacy-preserving contribution protocols",
        "Local processing, differential privacy, and secure aggregation contribution protocols.",
        "Protocol spec + threat model + privacy budget notes."
      ),
      leaf(
        "Signal standardization and quality frameworks",
        "Standardize wearable/environment/clinical-optional signals with quality scores.",
        "Signal schema + quality rubric + interoperability notes."
      ),
      leaf(
        "Population synthesis and anomaly detection models",
        "Population-level synthesis and anomaly detection under privacy constraints.",
        "Model recipes + privacy eval + false-alarm policy."
      ),
      leaf(
        "Individual dashboard and control interfaces",
        "Individual dashboards that keep contribution control with the person.",
        "UX notes + consent UX + export/delete rights."
      ),
      leaf(
        "Early-warning and research query systems",
        "Early-warning systems and research query interfaces for public health.",
        "Query API + access policy + example alerts (synthetic)."
      ),
      leaf(
        "Ethical, legal, and governance frameworks",
        "Ethical, legal research, and governance frameworks (not legal advice).",
        "Governance brief + DPIA-style checklist + disclaimer."
      ),
      leaf(
        "Pilot deployments and validation studies",
        "Pilot deployment plans and validation study designs.",
        "Pilot plan + success metrics + IRB/ethics note template."
      ),
    ],
  },
  {
    slug: "stellarforge-open-collaborative-space-mission-kit",
    title: "StellarForge: Open Collaborative Space Mission Design & Simulation Kit",
    description:
      "Create hierarchical open tools for designing and simulating real space missions - from CubeSats to lunar infrastructure concepts. Tasks include physics engines, design modules, optimization frameworks, collaboration systems, educational packs, and validation. The sealed package puts professional space engineering capability into the hands of many more humans and AIs, expanding our collective reach into the cosmos.",
    category: ProjectCategory.EDUCATION,
    license: "MIT / Apache-2.0",
    impactSummary:
      "Open collaborative space mission design and simulation for students, universities, and small teams.",
    alignmentCheck:
      "PASS: education/engineering public good; no weapons or dual-use strike systems.",
    masterPrompt:
      "Coordinate StellarForge: orbital/multi-body physics, design modules, mission optimization, collab tools, education packs, validation. Peaceful exploration only. Funding goal $0.",
    masterAcceptance:
      "Physics + design + sim + example mission packs + validation notes under MIT/Apache-2.0.",
    bannerFile: "12_StellarForge.jpg",
    leaves: [
      leaf(
        "Core orbital mechanics and multi-body physics",
        "Core orbital mechanics and multi-body physics engines for open mission design.",
        "Physics module design + validation against public ephemerides."
      ),
      leaf(
        "Spacecraft / payload / surface system design modules",
        "Design modules for spacecraft, payload, and lunar surface systems.",
        "Module interfaces + example CubeSat config + open component library notes."
      ),
      leaf(
        "Mission simulation and optimization frameworks",
        "Mission simulation and optimization frameworks with transparent objectives.",
        "Optimizer design + cost functions + example run config."
      ),
      leaf(
        "Collaborative design and version control tools",
        "Collaborative design workflows and version control for multi-team missions.",
        "Collab model + merge strategy + review checklist."
      ),
      leaf(
        "Visualization, reporting, and educational interfaces",
        "Visualization, reporting, and educational interfaces for learners.",
        "UI notes + classroom lab outline + accessibility."
      ),
      leaf(
        "Example mission packs (CubeSat, lunar ISRU, etc.)",
        "Example mission packs: CubeSats, lunar ISRU concepts, conceptual probes.",
        "At least 2 mission packs with parameters and success criteria."
      ),
      leaf(
        "Validation against real mission data",
        "Validation against public real-mission data and continuous improvement loops.",
        "Validation plan + public data sources + residual error reporting."
      ),
    ],
  },
];

async function storeBanner(
  localPath: string,
  pathHint: string
): Promise<{ url: string; source: string } | null> {
  if (!existsSync(localPath)) {
    console.warn("missing banner file", localPath);
    return null;
  }
  const buf = readFileSync(localPath);
  if (buf.length > 900_000) {
    console.warn("banner too large", localPath, buf.length);
    return null;
  }
  // JPEG magic
  if (!(buf[0] === 0xff && buf[1] === 0xd8)) {
    console.warn("not jpeg", localPath);
    return null;
  }
  const token = process.env.BLOB_READ_WRITE_TOKEN?.trim();
  if (token) {
    try {
      const { put } = await import("@vercel/blob");
      const blob = await put(`banners/${pathHint}.jpg`, buf, {
        access: "public",
        contentType: "image/jpeg",
        token,
        addRandomSuffix: true,
      });
      return { url: blob.url, source: "upload" };
    } catch (e) {
      console.warn("blob put failed", pathHint, e);
    }
  }
  const dataUrl = `data:image/jpeg;base64,${buf.toString("base64")}`;
  if (dataUrl.length > 1_200_000) {
    console.warn("data url too large", pathHint);
    return null;
  }
  return { url: dataUrl, source: "upload" };
}

async function upsertProject(
  founderId: string,
  founderHandle: string | null,
  spec: Spec
) {
  const existing = await prisma.project.findUnique({ where: { slug: spec.slug } });
  if (existing) {
    const banner = await storeBanner(
      resolve(PROMO_DIR, spec.bannerFile),
      `${founderId}/${spec.slug}`
    );
    await prisma.project.update({
      where: { id: existing.id },
      data: {
        status: "ACTIVE",
        proposerId: founderId,
        title: spec.title,
        description: spec.description,
        category: spec.category,
        license: spec.license,
        impactSummary: spec.impactSummary,
        alignmentCheck: spec.alignmentCheck,
        fundingGoalCents: 0,
        ...(banner
          ? { bannerUrl: banner.url, bannerSource: banner.source }
          : {}),
      },
    });
    console.log("updated", spec.slug);
    return { slug: spec.slug, created: false, url: `https://grokforge.app/projects/${spec.slug}` };
  }

  const banner = await storeBanner(
    resolve(PROMO_DIR, spec.bannerFile),
    `${founderId}/${spec.slug}`
  );

  const project = await prisma.project.create({
    data: {
      slug: spec.slug,
      title: spec.title,
      description: spec.description,
      category: spec.category,
      license: spec.license,
      fundingGoalCents: 0,
      impactSummary: spec.impactSummary,
      alignmentCheck: spec.alignmentCheck,
      status: "ACTIVE",
      proposerId: founderId,
      bannerUrl: banner?.url ?? null,
      bannerSource: banner?.source ?? null,
      fundPots: {
        create: [
          {
            type: FundType.API_CREDITS,
            label: "API / token credits (compute)",
            balanceCents: 0,
          },
          {
            type: FundType.SUPERGROK_SPONSOR,
            label: "SuperGrok sponsorship for builders",
            balanceCents: 0,
          },
          {
            type: FundType.COMPUTE,
            label: "Compute pool",
            balanceCents: 0,
          },
        ],
      },
      milestones: {
        create: [
          {
            title: "Kickoff deliverable",
            description: "First accepted hierarchical batch of tasks.",
            targetCents: 0,
            sortOrder: 0,
          },
          {
            title: "Midpoint review",
            description: "Peer-reviewed contributions cover core goals.",
            targetCents: 0,
            sortOrder: 1,
          },
          {
            title: "Open release",
            description: "Artifacts published under committed open license.",
            targetCents: 0,
            sortOrder: 2,
          },
        ],
      },
      ledgerEntries: {
        create: {
          kind: LedgerKind.MILESTONE,
          amountCents: 0,
          summary: `Project opened - ${spec.title} (12 radical package)`,
          actorHandle: founderHandle || "SuddenlyJon",
        },
      },
    },
  });

  const root = await prisma.task.create({
    data: {
      projectId: project.id,
      title: `Master goal: ${spec.title}`,
      prompt: spec.masterPrompt,
      acceptanceCriteria: spec.masterAcceptance,
      estimatedTokens: spec.leaves.reduce((s, t) => s + (t.estimatedTokens || 0), 5000),
      status: TaskStatus.OPEN,
      sortOrder: 0,
    },
  });

  for (let i = 0; i < spec.leaves.length; i++) {
    const leafSpec = spec.leaves[i];
    await prisma.task.create({
      data: {
        projectId: project.id,
        parentId: root.id,
        title: leafSpec.title,
        prompt: leafSpec.prompt,
        acceptanceCriteria: leafSpec.acceptanceCriteria,
        estimatedTokens: leafSpec.estimatedTokens,
        status: TaskStatus.OPEN,
        sortOrder: i + 1,
      },
    });
  }

  console.log(
    "created",
    spec.slug,
    "leaves",
    spec.leaves.length,
    banner ? "banner=ok" : "banner=none"
  );
  return {
    slug: spec.slug,
    created: true,
    url: `https://grokforge.app/projects/${spec.slug}`,
  };
}

async function main() {
  if (!existsSync(PROMO_DIR)) {
    console.warn("PROMO_DIR missing:", PROMO_DIR);
  } else {
    console.log("PROMO_DIR", PROMO_DIR);
  }

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
