import { beforeEach, describe, expect, it, vi } from "vitest";

const requireUser = vi.fn();
const projectFindUnique = vi.fn();
const scorecardUpsert = vi.fn();

vi.mock("@/lib/session", () => ({
  requireUser: () => requireUser(),
  requireXUser: vi.fn(),
}));

vi.mock("@/lib/rate-limit", () => ({
  rateLimitAsync: vi.fn(async () => ({ ok: true })),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    project: { findUnique: (...args: unknown[]) => projectFindUnique(...args) },
    projectScorecard: {
      upsert: (...args: unknown[]) => scorecardUpsert(...args),
    },
    ledgerEntry: { create: vi.fn() },
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

import { saveProjectScorecardAction } from "@/lib/actions";

function scorecardForm(overrides?: Record<string, string>) {
  const fd = new FormData();
  fd.set("projectId", "proj_1");
  fd.set("strategicAlignment", "3");
  fd.set("technicalFeasibility", "3");
  fd.set("businessValue", "3");
  fd.set("effortDemand", "3");
  fd.set("riskUncertainty", "3");
  fd.set("timeSensitivity", "3");
  for (const [k, v] of Object.entries(overrides || {})) {
    fd.set(k, v);
  }
  return fd;
}

describe("saveProjectScorecardAction secret scan", () => {
  beforeEach(() => {
    requireUser.mockReset();
    projectFindUnique.mockReset();
    scorecardUpsert.mockReset();
    requireUser.mockResolvedValue({
      id: "user_1",
      handle: "tester",
      name: "Tester",
    });
  });

  it("rejects a synthetic gf_ PAT in a criterion note without hitting the DB", async () => {
    const fake = "gf_" + "z".repeat(32);
    const res = await saveProjectScorecardAction(
      scorecardForm({
        strategicNote: `Public ranking rationale. Token ${fake} must not ship.`,
      })
    );
    expect(res).toEqual(
      expect.objectContaining({
        error: expect.stringMatching(/GrokForge PAT/i),
      })
    );
    expect(projectFindUnique).not.toHaveBeenCalled();
    expect(scorecardUpsert).not.toHaveBeenCalled();
  });
});
