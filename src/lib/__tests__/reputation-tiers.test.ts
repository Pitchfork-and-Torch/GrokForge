import { describe, expect, it } from "vitest";
import {
  canQualityAutoAccept,
  tierForReputation,
} from "@/lib/reputation-tiers";

describe("reputation tiers", () => {
  it("starts as newcomer", () => {
    expect(tierForReputation(0).id).toBe("newcomer");
    expect(tierForReputation(0).strongWorker).toBe(false);
  });
  it("unlocks peer review at forger", () => {
    expect(tierForReputation(100).canPeerReview).toBe(true);
    expect(tierForReputation(99).canPeerReview).toBe(false);
  });
  it("strong-worker at anvil+", () => {
    expect(canQualityAutoAccept(399)).toBe(false);
    expect(canQualityAutoAccept(400)).toBe(true);
    expect(tierForReputation(400).strongWorker).toBe(true);
    expect(tierForReputation(1000).strongWorker).toBe(true);
  });
});
