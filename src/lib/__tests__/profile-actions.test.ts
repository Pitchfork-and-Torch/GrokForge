import { beforeEach, describe, expect, it, vi } from "vitest";

const requireUser = vi.fn();
const userFindUnique = vi.fn();
const userUpdate = vi.fn();

vi.mock("@/lib/session", () => ({
  requireUser: () => requireUser(),
  requireXUser: vi.fn(),
}));

vi.mock("@/lib/rate-limit", () => ({
  rateLimitAsync: vi.fn(async () => ({ ok: true })),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: (...args: unknown[]) => userFindUnique(...args),
      update: (...args: unknown[]) => userUpdate(...args),
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

import { updateProfileAction } from "@/lib/actions";

function profileForm(overrides?: Record<string, string>) {
  const fd = new FormData();
  fd.set("handle", "tester");
  fd.set("bio", "Open-license builder. Public sources only.");
  fd.set("capacityNotes", "Evenings UTC, docs and review.");
  for (const [k, v] of Object.entries(overrides || {})) {
    fd.set(k, v);
  }
  return fd;
}

describe("updateProfileAction secret scan", () => {
  beforeEach(() => {
    requireUser.mockReset();
    userFindUnique.mockReset();
    userUpdate.mockReset();
    requireUser.mockResolvedValue({
      id: "user_1",
      handle: "tester",
      name: "Tester",
    });
  });

  it("rejects a synthetic gf_ PAT in bio without hitting the DB", async () => {
    const fake = "gf_" + "z".repeat(32);
    const res = await updateProfileAction(
      profileForm({ bio: `Hello. Token ${fake} must not ship.` })
    );
    expect(res).toEqual(
      expect.objectContaining({
        error: expect.stringMatching(/GrokForge PAT/i),
      })
    );
    expect(userFindUnique).not.toHaveBeenCalled();
    expect(userUpdate).not.toHaveBeenCalled();
  });

  it("rejects a synthetic gf_ PAT pasted as githubHandle", async () => {
    const fake = "gf_" + "z".repeat(32);
    const res = await updateProfileAction(profileForm({ githubHandle: fake }));
    expect(res).toEqual(
      expect.objectContaining({
        error: expect.stringMatching(/GrokForge PAT/i),
      })
    );
    expect(userFindUnique).not.toHaveBeenCalled();
    expect(userUpdate).not.toHaveBeenCalled();
  });
});
