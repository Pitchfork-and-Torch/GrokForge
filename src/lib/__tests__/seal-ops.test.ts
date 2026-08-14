import { beforeEach, describe, expect, it, vi } from "vitest";

const projectFindUnique = vi.fn();

vi.mock("@/lib/rate-limit", () => ({
  rateLimitAsync: vi.fn(async () => ({ ok: true })),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    project: { findUnique: (...args: unknown[]) => projectFindUnique(...args) },
  },
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/notify", () => ({
  notifyUser: vi.fn(),
}));

import { sealProjectForUser } from "@/lib/seal-ops";

describe("sealProjectForUser secret scan", () => {
  beforeEach(() => {
    projectFindUnique.mockReset();
  });

  it("rejects a synthetic gf_ PAT in the seal note without hitting the DB", async () => {
    const fake = "gf_" + "z".repeat(32);
    const res = await sealProjectForUser(
      { id: "user_1", handle: "tester", name: "Tester" },
      {
        projectId: "proj_1",
        sealNote: `Sealed for public release. Token ${fake} must not ship.`,
      },
      { via: "api" }
    );
    expect(res).toEqual(
      expect.objectContaining({
        error: expect.stringMatching(/GrokForge PAT/i),
      })
    );
    expect(projectFindUnique).not.toHaveBeenCalled();
  });
});
