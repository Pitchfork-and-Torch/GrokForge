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
  | { ok: true; agent: boolean; reasons: string[]; strength: number }
  | {
      ok: false;
      agent: boolean;
      error: string;
      reasons: string[];
      strength: number;
    };

/**
 * 0-100 strength for ranking / strong-worker auto-accept.
 * Higher = denser structure, length, provenance signals.
 */
export function scoreDeliverableStrength(input: QualityInput): number {
  const body = (input.body || "").trim();
  if (body.length < 20) return 0;
  let s = 20;
  s += Math.min(30, Math.floor(body.length / 40));
  const headings = (body.match(/^#{1,3}\s+\S+/gm) || []).length;
  s += Math.min(20, headings * 5);
  const bullets = (body.match(/^[\s]*[-*]\s+\S+/gm) || []).length;
  s += Math.min(10, bullets);
  if (/\b(mit|apache|cc-by|cc0|bsd|mpl|license)\b/i.test(body)) s += 8;
  if (/^#+\s*sources/im.test(body) || /provenance/i.test(body)) s += 7;
  if ((input.sources || "").trim().length >= 8) s += 5;
  const uniqueWords = new Set(
    body
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2)
  );
  if (uniqueWords.size >= 40) s += 10;
  else if (uniqueWords.size >= 20) s += 5;
  return Math.max(0, Math.min(100, s));
}

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
  const strength = scoreDeliverableStrength(input);

  if (body.length < 20) {
    return {
      ok: false,
      agent,
      error: "Submission needs at least 20 characters.",
      reasons: ["too_short"],
      strength: 0,
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
        strength: 0,
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
      strength: Math.min(strength, 15),
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
        strength: Math.min(strength, 25),
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
        strength: Math.min(strength, 30),
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
          strength: Math.min(strength, 40),
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
          strength: Math.min(strength, 20),
        };
      }
    }
  } else {
    // Human bar stays lighter
    if (body.length < 40) {
      reasons.push("human_short");
    }
  }

  return { ok: true, agent, reasons, strength };
}

/** Threshold for Anvil+ strong-worker auto-accept (Network Gravity). */
export const STRONG_WORKER_AUTO_ACCEPT_STRENGTH = 70;

/** Tag for contentType / sources when worker submits */
export function agentContentType(model?: string): string {
  const m = (model || "local").replace(/[^\w.\-:+]/g, "").slice(0, 40);
  return `agent/markdown;model=${m || "local"}`;
}
