import { beforeEach, describe, expect, it, vi } from "vitest";

const projectFindFirst = vi.fn();
const publishPkg = vi.fn();

vi.mock("@/lib/rate-limit", () => ({
  rateLimitAsync: vi.fn(async () => ({ ok: true })),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    project: { findFirst: (...args: unknown[]) => projectFindFirst(...args) },
  },
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/seal-ops", () => ({
  loadPackageFilesForProject: vi.fn(),
}));

vi.mock("@/lib/github-publish", () => ({
  githubPublishConfigured: () => true,
  getPublishOrg: () => "example-org",
  getPublishToken: () => "not-a-live-token",
  publishPackageToGitHub: (...args: unknown[]) => publishPkg(...args),
  repoNameFromSlug: (s: string) => s,
  defaultRepoDescription: () => "sealed package",
  defaultTopics: () => [],
}));

import { publishSealedToGitHubForUser } from "@/lib/github-ship-ops";

describe("publishSealedToGitHubForUser secret scan", () => {
  beforeEach(() => {
    projectFindFirst.mockReset();
    publishPkg.mockReset();
  });

  it("rejects a synthetic gf_ PAT in repoName without hitting the DB or GitHub", async () => {
    const fake = "gf_" + "z".repeat(32);
    const res = await publishSealedToGitHubForUser(
      { id: "user_1", handle: "tester", name: "Tester" },
      { projectId: "proj_1", repoName: fake },
      { via: "api" }
    );
    expect(res).toEqual(
      expect.objectContaining({
        error: expect.stringMatching(/GrokForge PAT/i),
      })
    );
    expect(projectFindFirst).not.toHaveBeenCalled();
    expect(publishPkg).not.toHaveBeenCalled();
  });
});
