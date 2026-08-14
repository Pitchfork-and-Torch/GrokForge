/**
 * Server-side Grok helpers only.
 * Never accept or persist end-user xAI / SuperGrok credentials.
 */

export type DecomposedSubtask = {
  title: string;
  prompt: string;
  acceptanceCriteria: string;
  estimatedTokens: number;
};

export type DecomposeResult = {
  masterPrompt: string;
  masterAcceptance: string;
  subtasks: DecomposedSubtask[];
  source: "grok" | "heuristic";
  model?: string;
};

function heuristicDecompose(
  title: string,
  description: string,
  category: string
): DecomposeResult {
  const base = description.slice(0, 400);
  return {
    source: "heuristic",
    masterPrompt: `Coordinate hierarchical multi-agent work for "${title}" (${category}). ${base}\n\nMerge only verified open-license contributions. Prefer public sources. No paywalled scraping.`,
    masterAcceptance:
      "Nested leaf tasks accepted via peer review; open-license artifact published; public ledger reflects labor and capital events.",
    subtasks: [
      {
        title: "Scope & open-source inventory",
        prompt: `For project "${title}", inventory relevant open datasets, papers, repos, or tools. Tag each with license and URL. Context: ${base}`,
        acceptanceCriteria:
          "Markdown table with >=8 entries; license + URL per row; no proprietary-only sources without free tier note.",
        estimatedTokens: 12000,
      },
      {
        title: "Core research / design synthesis",
        prompt: `Synthesize the core approach for "${title}". Extract claims or design decisions with sources. Flag uncertainty. Category: ${category}.`,
        acceptanceCriteria:
          ">=6 sourced claims or design points; uncertainty notes; CC-BY/MIT-friendly prose.",
        estimatedTokens: 20000,
      },
      {
        title: "Contributor-ready sub-protocol",
        prompt: `Write a short protocol so other Grok users can run sub-agents on "${title}" without sharing API keys: inputs, outputs, acceptance checks.`,
        acceptanceCriteria:
          "1-2 page protocol; input/output envelopes; safety/ToS notes; open license header.",
        estimatedTokens: 10000,
      },
      {
        title: "Public demo artifact draft",
        prompt: `Produce a demo-ready artifact (README section, schema, lesson, or module outline) for "${title}" under the project open license.`,
        acceptanceCriteria:
          "Standalone artifact draft with license; links to prior task outputs; ready for peer review.",
        estimatedTokens: 15000,
      },
    ],
  };
}

function extractJsonObject(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const raw = fenced ? fenced[1].trim() : text.trim();
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start >= 0 && end > start) {
    return JSON.parse(raw.slice(start, end + 1));
  }
  return JSON.parse(raw);
}

export async function decomposeProjectWithGrok(input: {
  title: string;
  description: string;
  category: string;
  license: string;
}): Promise<DecomposeResult> {
  const apiKey = process.env.XAI_API_KEY?.trim();
  if (!apiKey) {
    return heuristicDecompose(input.title, input.description, input.category);
  }

  const system = `You are GrokForge's task architect. Decompose greater-good projects into hierarchical multi-agent work packages.
Rules:
- Greater good only (climate, open science, education, public goods software, health).
- Outputs must be open-license friendly (${input.license}).
- Contributors run Grok with THEIR own keys; never request API keys.
- Return ONLY valid JSON matching the schema. No prose outside JSON.`;

  const user = `Project title: ${input.title}
Category: ${input.category}
License: ${input.license}
Description:
${input.description}

JSON schema:
{
  "masterPrompt": string,
  "masterAcceptance": string,
  "subtasks": [
    {
      "title": string,
      "prompt": string,
      "acceptanceCriteria": string,
      "estimatedTokens": number
    }
  ]
}
Provide 3-6 leaf subtasks under the master goal. estimatedTokens between 3000 and 80000.`;

  try {
    const res = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.XAI_MODEL || "grok-3-mini",
        temperature: 0.4,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    });

    if (!res.ok) {
      console.warn("[grok] decompose HTTP", res.status, await res.text().catch(() => ""));
      return heuristicDecompose(input.title, input.description, input.category);
    }

    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
      model?: string;
    };
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      return heuristicDecompose(input.title, input.description, input.category);
    }

    const parsed = extractJsonObject(content) as {
      masterPrompt?: string;
      masterAcceptance?: string;
      subtasks?: DecomposedSubtask[];
    };

    const subtasks = (parsed.subtasks || [])
      .filter((s) => s?.title && s?.prompt && s?.acceptanceCriteria)
      .map((s) => ({
        title: String(s.title).slice(0, 120),
        prompt: String(s.prompt).slice(0, 4000),
        acceptanceCriteria: String(s.acceptanceCriteria).slice(0, 2000),
        estimatedTokens: Math.min(
          80000,
          Math.max(3000, Number(s.estimatedTokens) || 10000)
        ),
      }));

    if (subtasks.length < 2) {
      return heuristicDecompose(input.title, input.description, input.category);
    }

    return {
      source: "grok",
      model: data.model || process.env.XAI_MODEL || "grok-3-mini",
      masterPrompt:
        String(parsed.masterPrompt || "").slice(0, 4000) ||
        heuristicDecompose(input.title, input.description, input.category)
          .masterPrompt,
      masterAcceptance:
        String(parsed.masterAcceptance || "").slice(0, 2000) ||
        heuristicDecompose(input.title, input.description, input.category)
          .masterAcceptance,
      subtasks,
    };
  } catch (err) {
    console.warn("[grok] decompose failed", err);
    return heuristicDecompose(input.title, input.description, input.category);
  }
}
