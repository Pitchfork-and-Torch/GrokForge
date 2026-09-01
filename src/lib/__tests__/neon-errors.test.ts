import { describe, expect, it } from "vitest";
import { isNeonQuotaError } from "@/lib/neon-errors";

describe("isNeonQuotaError", () => {
  it("classifies Neon compute-quota 402s", () => {
    expect(
      isNeonQuotaError(
        new Error(
          'Server error (HTTP status 402): {"message":"Your account or project has exceeded the compute time quota. Upgrade your plan to increase limits."}'
        )
      )
    ).toBe(true);
    expect(isNeonQuotaError(new Error("connection timed out"))).toBe(false);
  });
});
