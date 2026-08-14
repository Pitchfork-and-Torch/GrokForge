import { beforeEach, describe, expect, it, vi } from "vitest";

const requireUser = vi.fn();
const userUpdate = vi.fn();
const userFindUnique = vi.fn();

vi.mock("@/lib/session", () => ({
  requireUser: () => requireUser(),
  requireXUser: vi.fn(),
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

import { updateProfileAction } from "@/lib/actions";

function profileForm(overrides?: Record<string, string>) {
  const fd = new FormData();
  fd.set("bio", "Builder working on open greater-good tasks.");
  fd.set("capacityNotes", "Evenings UTC");
  fd.set("handle", "tester");
  for (const [k, v] of Object.entries(overrides || {})) {
    fd.set(k, v);
  }
  return fd;
}

describe("updateProfileAction secret scan", () => {
  beforeEach(() => {
    requireUser.mockReset();
    userUpdate.mockReset();
    userFindUnique.mockReset();
    requireUser.mockResolvedValue({
      id: "user_1",
      handle: "tester",
      name: "Tester",
    });
  });

  it("rejects a synthetic gf_ PAT in the public bio without hitting the DB", async () => {
    const fake = "gf_" + "z".repeat(32);
    const res = await updateProfileAction(
      profileForm({ bio: `Hello from the forge ${fake}` })
    );
    expect(res).toEqual(
      expect.objectContaining({
        error: expect.stringMatching(/GrokForge PAT/i),
      })
    );
    expect(userFindUnique).not.toHaveBeenCalled();
    expect(userUpdate).not.toHaveBeenCalled();
  });
});
