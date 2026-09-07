import { describe, expect, it } from "vitest";
import { computeStreak, streakBadgeLabel } from "../streaks";

describe("streaks", () => {
  it("counts consecutive UTC days ending today", () => {
    const now = new Date(Date.UTC(2026, 7, 5, 18, 0, 0));
    const days = [0, 1, 2].map(
      (ago) => new Date(Date.UTC(2026, 7, 5 - ago, 12, 0, 0))
    );
    const s = computeStreak(days, now);
    expect(s.current).toBe(3);
    expect(s.longest).toBe(3);
    expect(s.activeToday).toBe(true);
  });

  it("allows streak if last activity was yesterday", () => {
    const now = new Date(Date.UTC(2026, 7, 5, 18, 0, 0));
    const days = [1, 2, 3].map(
      (ago) => new Date(Date.UTC(2026, 7, 5 - ago, 12, 0, 0))
    );
    const s = computeStreak(days, now);
    expect(s.current).toBe(3);
    expect(s.activeToday).toBe(false);
  });

  it("labels badges", () => {
    expect(streakBadgeLabel(0)).toBeNull();
    expect(streakBadgeLabel(1)).toBe("Active today");
    expect(streakBadgeLabel(7)).toBe("7-day streak");
  });
});
