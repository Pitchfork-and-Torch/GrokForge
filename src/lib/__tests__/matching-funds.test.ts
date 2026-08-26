import { describe, expect, it } from "vitest";
import {
  clampRatioBps,
  computeMatch,
  matchingProgress,
  ratioLabel,
} from "@/lib/matching-funds";

describe("matching-funds", () => {
  it("clamps ratio and labels", () => {
    expect(clampRatioBps(10000)).toBe(10000);
    expect(clampRatioBps(999999)).toBe(50000);
    expect(ratioLabel(10000)).toBe("1:1");
    expect(ratioLabel(5000)).toBe("50%");
  });

  it("computes 1:1 match capped by remaining pool", () => {
    const r = computeMatch({
      donationCents: 2500,
      matchingEnabled: true,
      matchingRatioBps: 10000,
      matchingRemainingCents: 1000,
    });
    expect(r.matchCents).toBe(1000);
    expect(r.remainingAfter).toBe(0);
  });

  it("skips when disabled or empty pool", () => {
    expect(
      computeMatch({
        donationCents: 1000,
        matchingEnabled: false,
        matchingRatioBps: 10000,
        matchingRemainingCents: 5000,
      }).matchCents
    ).toBe(0);
    expect(
      computeMatch({
        donationCents: 1000,
        matchingEnabled: true,
        matchingRatioBps: 10000,
        matchingRemainingCents: 0,
      }).matchCents
    ).toBe(0);
  });

  it("progress", () => {
    expect(matchingProgress(10000, 2500)).toEqual({ used: 7500, pct: 75 });
  });
});
