import { beforeEach, describe, expect, it, vi } from "vitest";

const requireUser = vi.fn();
const projectFindUnique = vi.fn();
const taskCreate = vi.fn();

vi.mock("@/lib/session", () => ({
  requireUser: () => requireUser(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    project: { findUnique: (...args: unknown[]) => projectFindUnique(...args) },
    task: {
      findFirst: vi.fn(),
      aggregate: vi.fn(),
      create: (...args: unknown[]) => taskCreate(...args),
    },
    ledgerEntry: { create: vi.fn() },
  },
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/edit-history", () => ({
  recordProjectEdit: vi.fn(),
}));

import { addLeafTaskAction } from "@/lib/expansion-actions";

function leafForm(overrides?: Record<string, string>) {
  const fd = new FormData();
  fd.set("projectId", "proj_1");
  fd.set("title", "Public leaf title");
  fd.set("prompt", "Write a short open-license brief from public sources.");
  fd.set("acceptanceCriteria", "Markdown brief with sources.");
  for (const [k, v] of Object.entries(overrides || {})) {
    fd.set(k, v);
  }
  return fd;
}

describe("addLeafTaskAction secret scan", () => {
  beforeEach(() => {
    requireUser.mockReset();
    projectFindUnique.mockReset();
    taskCreate.mockReset();
    requireUser.mockResolvedValue({
      id: "user_1",
      handle: "tester",
      name: "Tester",
    });
  });

  it("rejects a synthetic gf_ PAT in the prompt without hitting the DB", async () => {
    const fake = "gf_" + "z".repeat(32);
    const res = await addLeafTaskAction(
      leafForm({ prompt: `Use this agent token ${fake} then write the brief.` })
    );
    expect(res).toEqual(
      expect.objectContaining({
        error: expect.stringMatching(/GrokForge PAT/i),
      })
    );
    expect(projectFindUnique).not.toHaveBeenCalled();
    expect(taskCreate).not.toHaveBeenCalled();
  });
});
