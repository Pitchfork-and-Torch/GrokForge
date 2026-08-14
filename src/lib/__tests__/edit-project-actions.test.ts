import { beforeEach, describe, expect, it, vi } from "vitest";

const requireUser = vi.fn();
const projectFindUnique = vi.fn();
const projectUpdate = vi.fn();

vi.mock("@/lib/session", () => ({
  requireUser: () => requireUser(),
  requireXUser: vi.fn(),
}));

vi.mock("@/lib/rate-limit", () => ({
  rateLimitAsync: vi.fn(async () => ({ ok: true })),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    project: {
      findUnique: (...args: unknown[]) => projectFindUnique(...args),
      update: (...args: unknown[]) => projectUpdate(...args),
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

import { updateProjectAction } from "@/lib/actions";

function editForm(overrides?: Record<string, string>) {
  const fd = new FormData();
  fd.set("projectId", "proj_1");
  fd.set("title", "Open greater-good protocol");
  fd.set(
    "description",
    "A public-license brief that stays on open sources and names no credentials."
  );
  fd.set("impactSummary", "Builders can fork the brief.");
  fd.set("license", "MIT");
  for (const [k, v] of Object.entries(overrides || {})) {
    fd.set(k, v);
  }
  return fd;
}

describe("updateProjectAction secret scan", () => {
  beforeEach(() => {
    requireUser.mockReset();
    projectFindUnique.mockReset();
    projectUpdate.mockReset();
    requireUser.mockResolvedValue({
      id: "user_1",
      handle: "tester",
      name: "Tester",
    });
  });

  it("rejects a synthetic gf_ PAT in the public license without hitting the DB", async () => {
    const fake = "gf_" + "z".repeat(32);
    const res = await updateProjectAction(editForm({ license: fake }));
    expect(res).toEqual(
      expect.objectContaining({
        error: expect.stringMatching(/GrokForge PAT/i),
      })
    );
    expect(projectFindUnique).not.toHaveBeenCalled();
    expect(projectUpdate).not.toHaveBeenCalled();
  });
});
