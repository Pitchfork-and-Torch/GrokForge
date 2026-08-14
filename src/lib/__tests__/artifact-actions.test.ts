import { beforeEach, describe, expect, it, vi } from "vitest";

const requireUser = vi.fn();
const projectFindUnique = vi.fn();
const artifactCreate = vi.fn();

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
    artifact: { create: (...args: unknown[]) => artifactCreate(...args) },
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

import { linkArtifactAction } from "@/lib/actions";

function artifactForm(overrides?: Record<string, string>) {
  const fd = new FormData();
  fd.set("projectId", "proj_1");
  fd.set("url", "https://github.com/example/public-good");
  fd.set("title", "Open protocol notes");
  fd.set("license", "MIT");
  for (const [k, v] of Object.entries(overrides || {})) {
    fd.set(k, v);
  }
  return fd;
}

describe("linkArtifactAction secret scan", () => {
  beforeEach(() => {
    requireUser.mockReset();
    projectFindUnique.mockReset();
    artifactCreate.mockReset();
    requireUser.mockResolvedValue({
      id: "user_1",
      handle: "tester",
      name: "Tester",
    });
  });

  it("rejects a synthetic gf_ PAT in the title without hitting the DB", async () => {
    const fake = "gf_" + "z".repeat(32);
    const res = await linkArtifactAction(
      artifactForm({ title: `Public deliverable ${fake}` })
    );
    expect(res).toEqual(
      expect.objectContaining({
        error: expect.stringMatching(/GrokForge PAT/i),
      })
    );
    expect(projectFindUnique).not.toHaveBeenCalled();
    expect(artifactCreate).not.toHaveBeenCalled();
  });
});
