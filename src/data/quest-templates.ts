/**
 * One-click propose quest templates (greater-good starters).
 */
export type QuestTemplate = {
  id: string;
  title: string;
  category: string;
  license: string;
  description: string;
  impactSummary: string;
  masterPrompt: string;
  masterAcceptance: string;
  leaves: {
    title: string;
    prompt: string;
    acceptanceCriteria: string;
    estimatedTokens: number;
    goodFirst?: boolean;
    tags?: string;
  }[];
};

export const QUEST_TEMPLATES: QuestTemplate[] = [
  {
    id: "cosmology-map",
    title: "Cosmology literature map quest",
    category: "OPEN_SCIENCE",
    license: "Apache-2.0",
    description:
      "Crowdsource an honest, provenance-rich literature map of modern cosmology tensions (H0, S8, model extensions). Nested leaves for scouts, critics, and experiment design. No fabricated citations. Labor + compute only; funding goal $0.",
    impactSummary: "Open science map of cosmology tensions with uncertainty tags",
    masterPrompt:
      "Coordinate open literature mapping of cosmology tensions. Merge only peer-reviewed leaves with sources. Prefer unknown over false certainty.",
    masterAcceptance:
      "At least 4 leaves accepted, sources list present, honest uncertainty section, Apache-2.0 artifacts.",
    leaves: [
      {
        title: "Seed H0 tension brief with sources",
        prompt: "Write a 1-page H0 tension brief using public sources only. Mark confidence.",
        acceptanceCriteria: "Markdown brief + sources; no fabricated papers",
        estimatedTokens: 60000,
        goodFirst: true,
        tags: "science,docs,good-first",
      },
      {
        title: "S8 tension sketch",
        prompt: "Same format for S8 / structure growth tension.",
        acceptanceCriteria: "Brief + sources + uncertainty",
        estimatedTokens: 50000,
        tags: "science,docs",
      },
      {
        title: "Experiment design pack",
        prompt: "Propose public-data follow-ups with success metrics.",
        acceptanceCriteria: "At least 3 experiments, open datasets preferred",
        estimatedTokens: 70000,
        tags: "science,experiment",
      },
      {
        title: "Critic pass + residual unknowns",
        prompt: "Stress-test prior leaves for overclaim; list residual unknowns.",
        acceptanceCriteria: "Checklist + residual list",
        estimatedTokens: 40000,
        tags: "critique",
      },
    ],
  },
  {
    id: "civic-toolkit",
    title: "Open civic toolkit mini-pack",
    category: "PUBLIC_GOODS_SOFTWARE",
    license: "MIT",
    description:
      "Build a small MIT civic toolkit: FOIA request draft pack, meeting minutes template, grant outline, volunteer task tree. Hierarchical claimable leaves.",
    impactSummary: "Reusable civic templates for nonprofits and newsrooms",
    masterPrompt:
      "Coordinate MIT civic templates. No surveillance tooling. Open licenses only.",
    masterAcceptance: "4 leaves accepted with MIT headers and usage notes.",
    leaves: [
      {
        title: "FOIA request draft pack",
        prompt: "Templates for FOIA/public records with jurisdiction notes.",
        acceptanceCriteria: "3+ templates + disclaimer",
        estimatedTokens: 50000,
        goodFirst: true,
        tags: "civic,docs,good-first",
      },
      {
        title: "Meeting minutes template",
        prompt: "Public meeting minutes structure + agent prompt.",
        acceptanceCriteria: "Template + example",
        estimatedTokens: 30000,
        tags: "civic,docs",
      },
      {
        title: "Grant narrative outline",
        prompt: "Nonprofit grant outline pack with sections.",
        acceptanceCriteria: "Outline + checklist",
        estimatedTokens: 40000,
        tags: "civic,docs",
      },
      {
        title: "Volunteer task tree generator prompt",
        prompt: "Prompt pack that expands a campaign goal into claimable leaves.",
        acceptanceCriteria: "Prompt + example tree",
        estimatedTokens: 45000,
        tags: "civic,agents",
      },
    ],
  },
  {
    id: "anime-style-bible",
    title: "Open 1988 anime technique study kit",
    category: "EDUCATION",
    license: "CC-BY-4.0",
    description:
      "Educational style-bible kit for late-1980s theatrical hand-drawn technique analysis (approximation only). No copyrighted frame training.",
    impactSummary: "Open educational style bible for historical animation technique",
    masterPrompt:
      "Coordinate technique analysis only. No IP clones. CC-BY docs.",
    masterAcceptance: "Style bible MD+JSON + sources + legal rails leaf accepted.",
    leaves: [
      {
        title: "Technique sections draft",
        prompt: "Frame rates, multiplane, limited palette, mechanical density notes.",
        acceptanceCriteria: "Sections complete + style approximation disclaimer",
        estimatedTokens: 80000,
        goodFirst: true,
        tags: "education,animation,good-first",
      },
      {
        title: "Legal rails for style study",
        prompt: "Allowed / forbidden / required footer for educational style work.",
        acceptanceCriteria: "LEGAL-RAILS.md with refuse examples",
        estimatedTokens: 30000,
        tags: "legal,docs",
      },
      {
        title: "JSON knowledge base",
        prompt: "Machine-readable JSON of technique claims with source ids.",
        acceptanceCriteria: "Valid JSON + sources field",
        estimatedTokens: 50000,
        tags: "data",
      },
    ],
  },
];

export function getQuestTemplate(id: string) {
  return QUEST_TEMPLATES.find((t) => t.id === id) || null;
}
