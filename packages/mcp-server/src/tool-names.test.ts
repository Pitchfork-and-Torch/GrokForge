import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { PHASE1_TOOLS } from "./tool-names.js";

describe("PHASE1_TOOLS", () => {
  it("is the closed Phase 1 claim/submit surface (no moderation/seal)", () => {
    assert.deepEqual([...PHASE1_TOOLS], [
      "grokforge_me",
      "grokforge_health",
      "list_open_leaves",
      "get_task",
      "peek_work",
      "claim_work",
      "submit_work",
      "release_claim",
    ]);
    for (const banned of [
      "moderate_contribution",
      "seal_project",
      "publish_github",
      "bulk_accept",
      "agent_heartbeat",
    ]) {
      assert.equal((PHASE1_TOOLS as readonly string[]).includes(banned), false);
    }
  });
});
