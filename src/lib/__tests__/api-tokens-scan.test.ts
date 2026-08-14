import { beforeEach, describe, expect, it, vi } from "vitest";

const tokenCount = vi.fn();
const tokenCreate = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    apiToken: {
      count: (...args: unknown[]) => tokenCount(...args),
      create: (...args: unknown[]) => tokenCreate(...args),
    },
  },
}));

import { createApiToken } from "@/lib/api-tokens";

describe("createApiToken secret scan", () => {
  beforeEach(() => {
    tokenCount.mockReset();
    tokenCreate.mockReset();
  });

  it("rejects a synthetic gf_ PAT in the token name without hitting the DB", async () => {
    const fake = "gf_" + "z".repeat(32);
    await expect(
      createApiToken({
        userId: "user_1",
        name: `local worker ${fake}`,
      })
    ).rejects.toThrow(/GrokForge PAT/i);
    expect(tokenCount).not.toHaveBeenCalled();
    expect(tokenCreate).not.toHaveBeenCalled();
  });
});
