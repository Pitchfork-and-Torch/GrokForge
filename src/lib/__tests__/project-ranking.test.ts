import { describe, expect, it } from "vitest";
import {
  clampScore,
  computeRankingTotal,
  rankingBreakdown,
  sortByRankingTotal,
} from "@/lib/project-ranking";

describe("project ranking", () => {
  it("clamps scores to 1-5", () => {
    expect(clampScore(0)).toBe(1);
    expect(clampScore(9)).toBe(5);
    expect(clampScore(3.4)).toBe(3);
  });

  it("all 5s yields 5.00", () => {
    expect(
      computeRankingTotal({
        strategicAlignment: 5,
        technicalFeasibility: 5,
        businessValue: 5,
        effortDemand: 5,
        riskUncertainty: 5,
        timeSensitivity: 5,
      })
    ).toBe(5);
  });

  it("weights match the published system", () => {
    // strategy 5, rest 1: 5*0.2 + 1*(0.2+0.2+0.15+0.15+0.1) = 1 + 0.8 = 1.8
    expect(
      computeRankingTotal({
        strategicAlignment: 5,
        technicalFeasibility: 1,
        businessValue: 1,
        effortDemand: 1,
        riskUncertainty: 1,
        timeSensitivity: 1,
      })
    ).toBe(1.8);
  });

  it("breakdown sums to total", () => {
    const scores = {
      strategicAlignment: 4,
      technicalFeasibility: 3,
      businessValue: 5,
      effortDemand: 2,
      riskUncertainty: 4,
      timeSensitivity: 3,
    };
    const rows = rankingBreakdown(scores, { businessValue: "High adoption" });
    const sum = Math.round(rows.reduce((s, r) => s + r.weighted, 0) * 100) / 100;
    expect(sum).toBe(computeRankingTotal(scores));
    expect(rows.find((r) => r.id === "businessValue")?.note).toBe("High adoption");
  });

  it("sorts unscored last", () => {
    const sorted = sortByRankingTotal([
      { id: "a", totalScore: 2.1 },
      { id: "b", totalScore: null },
      { id: "c", totalScore: 4.2 },
    ]);
    expect(sorted.map((r) => r.id)).toEqual(["c", "a", "b"]);
  });
});
