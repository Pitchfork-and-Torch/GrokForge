import { describe, expect, it } from "vitest";
import { tierForReputation } from "@/lib/reputation-tiers";

describe("reputation tiers", () => {
  it("starts as newcomer", () => {
    expect(tierForReputation(0).id).toBe("newcomer");
  });
  it("unlocks peer review at forger", () => {
    expect(tierForReputation(100).canPeerReview).toBe(true);
    expect(tierForReputation(99).canPeerReview).toBe(false);
  });
});
