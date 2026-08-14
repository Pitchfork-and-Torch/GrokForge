import { beforeEach, describe, expect, it, vi } from "vitest";

const requireUser = vi.fn();
const commentFindUnique = vi.fn();
const reportCreate = vi.fn();

vi.mock("@/lib/session", () => ({
  requireUser: () => requireUser(),
  requireXUser: vi.fn(),
}));

vi.mock("@/lib/rate-limit", () => ({
  rateLimitAsync: vi.fn(async () => ({ ok: true })),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    projectComment: {
      findUnique: (...args: unknown[]) => commentFindUnique(...args),
    },
    commentReport: {
      create: (...args: unknown[]) => reportCreate(...args),
    },
  },
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

vi.mock("@/lib/notify", () => ({
  notifyUser: vi.fn(),
  notifyProjectWatchers: vi.fn(),
}));

vi.mock("@/lib/banner", () => ({
  generateImagineBanner: vi.fn(),
  getBannerFile: vi.fn(),
  storeUploadedBanner: vi.fn(),
}));

import { reportProjectCommentAction } from "@/lib/actions";

describe("reportProjectCommentAction secret scan", () => {
  beforeEach(() => {
    requireUser.mockReset();
    commentFindUnique.mockReset();
    reportCreate.mockReset();
    requireUser.mockResolvedValue({
      id: "user_1",
      handle: "tester",
      name: "Tester",
    });
  });

  it("rejects a synthetic gf_ PAT in the report reason without hitting the DB", async () => {
    const fake = "gf_" + "z".repeat(32);
    const res = await reportProjectCommentAction(
      "cmt_1",
      `spam plus token ${fake}`
    );
    expect(res).toEqual(
      expect.objectContaining({
        error: expect.stringMatching(/GrokForge PAT/i),
      })
    );
    expect(commentFindUnique).not.toHaveBeenCalled();
    expect(reportCreate).not.toHaveBeenCalled();
  });
});
