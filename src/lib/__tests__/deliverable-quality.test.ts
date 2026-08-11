import { describe, expect, it } from "vitest";
import {
  assessDeliverableQuality,
  isAgentSubmission,
  scoreDeliverableStrength,
  STRONG_WORKER_AUTO_ACCEPT_STRENGTH,
} from "@/lib/deliverable-quality";

describe("deliverable quality", () => {
  it("detects agent submissions", () => {
    expect(
      isAgentSubmission({
        sources: "local-agent-worker (vps-hetzner-1) + optional ollama",
      })
    ).toBe(true);
    expect(isAgentSubmission({ contentType: "markdown" })).toBe(false);
  });

  it("rejects offline stubs", () => {
    const r = assessDeliverableQuality({
      body: `# Deliverable (offline stub)\n\nPartial stub for worker plumbing only. Replace with real work.\n`,
      sources: "local-agent-worker",
    });
    expect(r.ok).toBe(false);
  });

  it("accepts structured agent markdown", () => {
    const body = `## Overview
This pack documents the legal rails for multi-agent scientific claims.

## Acceptance
- Open license MIT on every file
- No fabricated citations; unknown preferred
- Dual-use refuse note included

## Sources
No external claims in this leaf; scaffold only.

## License
MIT
`;
    const r = assessDeliverableQuality({
      body: body.repeat(2),
      sources: "local-agent-worker + ollama tinyllama",
      contentType: "agent/markdown;model=tinyllama",
      taskTitle: "Author LEGAL-RAILS pack",
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.agent).toBe(true);
      expect(r.strength).toBeGreaterThanOrEqual(
        STRONG_WORKER_AUTO_ACCEPT_STRENGTH
      );
    }
  });

  it("scores strength for strong-worker gate", () => {
    expect(scoreDeliverableStrength({ body: "short" })).toBeLessThan(30);
    const rich = `## A
${"word ".repeat(80)}
## B
- item one
- item two
## Sources
provenance note
## License
MIT
`;
    const s = scoreDeliverableStrength({ body: rich, sources: "https://x" });
    expect(s).toBeGreaterThanOrEqual(50);
  });
});
