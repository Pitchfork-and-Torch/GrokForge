import { describe, expect, it } from "vitest";
import {
  extractKeywords,
  rankTasksForUser,
  scoreTaskForUser,
} from "@/lib/task-matching";

const base = {
  id: "1",
  title: "Climate data pack agent",
  estimatedTokens: 2000,
  createdAt: new Date(),
  project: {
    slug: "climate",
    title: "Climate",
    category: "CLIMATE",
    raisedCents: 5000,
  },
};

describe("task matching", () => {
  it("boosts watched + category affinity", () => {
    const ranked = scoreTaskForUser(base, {
      preferredCategories: ["CLIMATE"],
      watchedSlugs: ["climate"],
      proposedSlugs: [],
      pastKeywords: ["climate", "data"],
    });
    expect(ranked.matchScore).toBeGreaterThan(50);
    expect(ranked.matchReasons.some((r) => /watch|category/i.test(r))).toBe(true);
  });

  it("ranks preferred higher than unrelated", () => {
    const other = {
      ...base,
      id: "2",
      title: "Unrelated puzzle",
      project: {
        slug: "other",
        title: "Other",
        category: "OTHER",
        raisedCents: 0,
      },
    };
    const list = rankTasksForUser(
      [other, base],
      {
        preferredCategories: ["CLIMATE"],
        watchedSlugs: ["climate"],
        proposedSlugs: [],
        pastKeywords: [],
      },
      2
    );
    expect(list[0].id).toBe("1");
  });

  it("extracts keywords", () => {
    const k = extractKeywords(["Climate data pack", "Climate agent open data"]);
    expect(k).toContain("climate");
  });
});
