/**
 * Build installable Agent Skill packs from sealed GrokForge packages
 * and accepted leaf deliverables.
 */
import type { PackageFile } from "@/lib/seal-package";

export type SkillPackFile = { path: string; content: string };

function yamlEscape(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

/**
 * Extract existing SKILL.md trees from a sealed package file list.
 */
export function extractSkillsFromPackageFiles(
  files: PackageFile[]
): SkillPackFile[] {
  const out: SkillPackFile[] = [];
  for (const f of files) {
    const norm = f.path.replace(/\\/g, "/");
    if (/(^|\/)SKILL\.md$/i.test(norm) || /(^|\/)skills\/.+\.md$/i.test(norm)) {
      out.push({ path: norm.startsWith("skills/") ? norm : `skills/${norm}`, content: f.content });
    }
  }
  return out;
}

/**
 * Generate a root skill pack from project metadata + accepted leaf titles/bodies.
 */
export function buildGeneratedSkillPack(input: {
  slug: string;
  title: string;
  description: string;
  license: string;
  leaves: {
    title: string;
    prompt: string;
    acceptanceCriteria: string;
    body?: string | null;
  }[];
}): SkillPackFile[] {
  const name = input.slug
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64) || "grokforge-pack";

  const skillMd = `---
name: ${name}
description: >
  ${yamlEscape(input.description.slice(0, 280))}
  Install from GrokForge sealed package. Differentiator: forged on GrokForge project ${input.slug}.
metadata:
  short-description: "GrokForge sealed skill pack: ${yamlEscape(input.title.slice(0, 80))}"
  tags:
    - grokforge
    - sealed-pack
  forged-on: https://grokforge.app/projects/${input.slug}
  license: ${input.license}
---

# ${input.title}

Forged on [GrokForge](https://grokforge.app/projects/${input.slug}).

${input.description.slice(0, 2000)}

## Leaves (accepted work)

${input.leaves
  .map(
    (l, i) => `### ${i + 1}. ${l.title}

**Prompt (summary):** ${l.prompt.slice(0, 400)}

**Acceptance:** ${l.acceptanceCriteria.slice(0, 400)}

${l.body ? `**Deliverable excerpt:**\n\n${l.body.slice(0, 1500)}\n` : ""}`
  )
  .join("\n")}

## Install

Copy this folder to \`~/.grok/skills/${name}/\` (or your agent skills root) and restart the agent.

## Rails

- Never store SuperGrok / xAI user keys on GrokForge
- Open license: ${input.license}
`;

  const readme = `# ${input.title} - skill pack

Generated from sealed GrokForge project \`${input.slug}\`.

Install: copy to your agent skills directory as \`${name}/\`.

License: ${input.license}
`;

  const manifest = JSON.stringify(
    {
      name,
      slug: input.slug,
      title: input.title,
      license: input.license,
      forgedOn: `https://grokforge.app/projects/${input.slug}`,
      leafCount: input.leaves.length,
      files: ["SKILL.md", "README.md", "manifest.json"],
    },
    null,
    2
  );

  return [
    { path: `${name}/SKILL.md`, content: skillMd },
    { path: `${name}/README.md`, content: readme },
    { path: `${name}/manifest.json`, content: manifest + "\n" },
  ];
}
