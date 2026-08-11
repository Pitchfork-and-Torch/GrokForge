/**
 * Deliverable quality rails for human + agent submissions.
 * Rejects empty stubs so the always-on worker cannot fill the ledger with junk.
 */

export type QualityInput = {
  body: string;
  sources?: string | null;
  contentType?: string | null;
  taskTitle?: string | null;
  acceptanceCriteria?: string | null;
};

export type QualityResult =
  | { ok: true; agent: boolean; reasons: string[] }
  | { ok: false; agent: boolean; error: string; reasons: string[] };

const STUB_MARKERS = [
  /partial stub for (ci\/)?worker plumbing/i,
  /offline stub/i,
  /local model unavailable/i,
  /worker plumbing only/i,
  /replace with real work/i,
  /padding\n+worker ensured minimum body/i,
  /deliverable \(offline stub\)/i,
];

const AGENT_MARKERS = [
  /local-agent-worker/i,
  /agent-worker/i,
  /vps-hetzner/i,
  /^agent\//i,
  /model:\s*tinyllama/i,
  /model:\s*llama/i,
  /ollama/i,
];

export function isAgentSubmission(input: {
  sources?: string | null;
  contentType?: string | null;
}): boolean {
  const blob = `${input.sources || ""}\n${input.contentType || ""}`;
  return AGENT_MARKERS.some((re) => re.test(blob));
}

export function assessDeliverableQuality(input: QualityInput): QualityResult {
  const body = (input.body || "").trim();
  const sources = (input.sources || "").trim();
  const agent = isAgentSubmission(input);
  const reasons: string[] = [];

  if (body.length < 20) {
    return {
      ok: false,
      agent,
      error: "Submission needs at least 20 characters.",
      reasons: ["too_short"],
    };
  }

  for (const re of STUB_MARKERS) {
    if (re.test(body)) {
      return {
        ok: false,
        agent,
        error:
          "Rejected as plumbing stub. Produce a real deliverable that meets acceptance criteria (no offline-stub boilerplate).",
        reasons: ["stub_marker"],
      };
    }
  }

  // Very low information density (repeated filler)
  const uniqueWords = new Set(
    body
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2)
  );
  if (body.length > 80 && uniqueWords.size < 12) {
    return {
      ok: false,
      agent,
      error: "Submission looks like low-signal filler. Expand with concrete content.",
      reasons: ["low_lexical_diversity"],
    };
  }

  if (agent) {
    if (body.length < 280) {
      return {
        ok: false,
        agent,
        error:
          "Agent submits need ≥280 characters of real content (structured markdown).",
        reasons: ["agent_too_short"],
      };
    }

    const headings = (body.match(/^#{1,3}\s+\S+/gm) || []).length;
    if (headings < 2) {
      return {
        ok: false,
        agent,
        error:
          "Agent submits need at least two markdown headings (## ...) for structure.",
        reasons: ["agent_no_structure"],
      };
    }

    const hasLicenseish =
      /\b(mit|apache|cc-by|cc0|bsd|mpl|open license|license)\b/i.test(body) ||
      /\b(mit|apache|cc-by)\b/i.test(sources);
    if (!hasLicenseish) {
      reasons.push("agent_missing_license_note");
      // Soft: require mention of license OR sources section
      const hasSourcesSection =
        /^#+\s*sources/im.test(body) ||
        /provenance/i.test(body) ||
        sources.length >= 8;
      if (!hasSourcesSection) {
        return {
          ok: false,
          agent,
          error:
            "Agent submits need a license note or Sources/provenance section (or fill the sources field).",
          reasons: [...reasons, "agent_missing_provenance"],
        };
      }
    }

    // Reject if body is almost only the task title restated
    const title = (input.taskTitle || "").trim().toLowerCase();
    if (title.length > 12) {
      const bodyLower = body.toLowerCase();
      const withoutTitle = bodyLower.split(title).join(" ").trim();
      if (withoutTitle.length < 120) {
        return {
          ok: false,
          agent,
          error: "Agent body is mostly the task title. Expand the deliverable.",
          reasons: ["agent_title_only"],
        };
      }
    }
  } else {
    // Human bar stays lighter
    if (body.length < 40) {
      reasons.push("human_short");
    }
  }

  return { ok: true, agent, reasons };
}

/** Tag for contentType / sources when worker submits */
export function agentContentType(model?: string): string {
  const m = (model || "local").replace(/[^\w.\-:+]/g, "").slice(0, 40);
  return `agent/markdown;model=${m || "local"}`;
}
