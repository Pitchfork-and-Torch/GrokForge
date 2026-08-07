import { describe, expect, it } from "vitest";
import { weeklyChallenges } from "@/lib/challenges";

describe("weeklyChallenges", () => {
  it("tracks progress toward targets", () => {
    const list = weeklyChallenges({
      acceptedLast7: 1,
      reviewsLast7: 1,
      donationsLast7: 0,
      nightcapsLast7: 1,
      commentsLast7: 2,
    });
    expect(list.length).toBe(5);
    const ship = list.find((c) => c.id === "ship-1");
    expect(ship?.progress).toBe(1);
    expect(ship && ship.progress >= ship.target).toBe(true);
    const review = list.find((c) => c.id === "review-3");
    expect(review?.progress).toBe(1);
    expect(review && review.progress >= review.target).toBe(false);
  });
});
