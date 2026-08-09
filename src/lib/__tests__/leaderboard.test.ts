import { describe, expect, it } from "vitest";
import {
  computeImpactScore,
  rankContributors,
  tokensToHours,
  xUrls,
} from "../leaderboard";
import { isDemoBotUser, isFounderHandle } from "../identity";

describe("leaderboard ranking", () => {
  it("maps tokens to hours", () => {
    expect(tokensToHours(0)).toBe(0);
    expect(tokensToHours(2000)).toBe(1);
    expect(tokensToHours(5000)).toBe(2.5);
  });

  it("builds safe X URLs", () => {
    expect(xUrls("suddenlyjon").xProfileUrl).toBe("https://x.com/suddenlyjon");
    expect(xUrls("@alice_1").followUrl).toContain("screen_name=alice_1");
    expect(xUrls("bad handle!").xProfileUrl).toBeNull();
    expect(xUrls(null).followUrl).toBeNull();
  });

  it("filters demo bots and flags founders", () => {
    expect(isDemoBotUser({ email: "alice@grokforge.demo", handle: "alice_rivers" })).toBe(
      true
    );
    expect(isDemoBotUser({ email: null, handle: "SuddenlyJon" })).toBe(false);
    // Real handle must rank even if leftover demo email from early auth
    expect(
      isDemoBotUser({
        email: "x_builder@x-demo.grokforge.local",
        handle: "SuddenlyJon",
      })
    ).toBe(false);
    expect(isDemoBotUser({ email: "x_builder@x-demo.grokforge.local", handle: "x_builder" })).toBe(
      true
    );
    expect(isFounderHandle("SuddenlyJon")).toBe(true);
    expect(isFounderHandle("bob_publicgoods")).toBe(false);
  });

  it("ranks capital + labor higher than empty users", () => {
    const rows = rankContributors([
      {
        userId: "1",
        handle: "donor",
        name: "Donor",
        image: null,
        reputation: 0,
        donationCents: 10000,
        acceptedContributions: 0,
        estimatedTokens: 0,
        reviewsGiven: 0,
      },
      {
        userId: "2",
        handle: "builder",
        name: "Builder",
        image: null,
        reputation: 20,
        donationCents: 0,
        acceptedContributions: 4,
        estimatedTokens: 8000,
        reviewsGiven: 2,
      },
      {
        userId: "3",
        handle: "idle",
        name: "Idle",
        image: null,
        reputation: 0,
        donationCents: 0,
        acceptedContributions: 0,
        estimatedTokens: 0,
        reviewsGiven: 0,
      },
    ]);
    expect(rows[0].rank).toBe(1);
    expect(rows.every((r) => r.handle !== "idle" || r.score > 0)).toBe(true);
    expect(computeImpactScore(rows[0])).toBeGreaterThan(0);
    expect(rows.length).toBeGreaterThanOrEqual(2);
  });
});
