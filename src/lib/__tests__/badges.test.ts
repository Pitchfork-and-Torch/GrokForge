import { describe, expect, it } from "vitest";
import { badgeGallery, computeBadges } from "@/lib/badges";

describe("computeBadges", () => {
  it("unlocks whale and forger tiers", () => {
    const b = computeBadges({
      donationCents: 6000,
      acceptedCount: 2,
      reviewCount: 0,
      projectCount: 0,
      currentStreak: 0,
      longestStreak: 0,
    });
    const ids = b.map((x) => x.id);
    expect(ids).toContain("whale");
    expect(ids).toContain("forger");
    expect(ids).toContain("bee");
  });

  it("unlocks founder and leviathan", () => {
    const b = computeBadges({
      donationCents: 30000,
      acceptedCount: 12,
      reviewCount: 20,
      projectCount: 2,
      currentStreak: 3,
      longestStreak: 10,
      isFounder: true,
      isPioneer: true,
    });
    const ids = b.map((x) => x.id);
    expect(ids).toContain("founder");
    expect(ids).toContain("leviathan");
    expect(ids).toContain("master_forger");
    expect(ids).toContain("peer_oracle");
    expect(ids).toContain("architect");
    expect(ids).toContain("streak_keeper");
    expect(ids).toContain("pioneer");
  });

  it("builds gallery with progress for locked badges", () => {
    const g = badgeGallery({
      donationCents: 2500,
      acceptedCount: 0,
      reviewCount: 1,
      projectCount: 0,
      currentStreak: 0,
      longestStreak: 0,
    });
    expect(g.length).toBeGreaterThan(8);
    const whale = g.find((x) => x.id === "whale");
    expect(whale?.earned).toBe(false);
    expect(whale?.progressPct).toBeGreaterThan(0);
    expect(whale?.progressPct).toBeLessThan(100);
  });
});
