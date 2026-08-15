import { beforeEach, describe, expect, it, vi } from "vitest";

const create = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    projectEditHistory: {
      create: (...args: unknown[]) => create(...args),
    },
  },
}));

import { recordProjectEdit } from "@/lib/edit-history";

describe("recordProjectEdit secret scan", () => {
  beforeEach(() => {
    create.mockReset();
    create.mockResolvedValue({ id: "eh_1" });
  });

  it("persists clean old/new/summary", async () => {
    await recordProjectEdit({
      projectId: "proj_1",
      field: "title",
      oldValue: "Open greater-good protocol",
      newValue: "Open civic kit",
      summary: "Title → Open civic kit",
    });
    expect(create).toHaveBeenCalled();
    const arg = create.mock.calls[0][0] as {
      data: { oldValue: string | null; newValue: string | null; summary: string };
    };
    expect(arg.data.oldValue).toBe("Open greater-good protocol");
    expect(arg.data.newValue).toBe("Open civic kit");
    expect(arg.data.summary).toBe("Title → Open civic kit");
  });

  it("drops a synthetic gf_ PAT in oldValue and still writes", async () => {
    const fake = "gf_" + "z".repeat(32);
    await recordProjectEdit({
      projectId: "proj_1",
      field: "title",
      oldValue: `legacy title ${fake}`,
      newValue: "Open civic kit",
      summary: "Title → Open civic kit",
    });
    const arg = create.mock.calls[0][0] as {
      data: { oldValue: string | null; newValue: string | null };
    };
    expect(arg.data.oldValue).toBeNull();
    expect(arg.data.newValue).toBe("Open civic kit");
  });

  it("drops a synthetic gf_ PAT in newValue and still writes", async () => {
    const fake = "gf_" + "z".repeat(32);
    await recordProjectEdit({
      projectId: "proj_1",
      field: "description",
      oldValue: "Clean brief",
      newValue: `oops ${fake}`,
      summary: "Description updated",
    });
    const arg = create.mock.calls[0][0] as {
      data: { oldValue: string | null; newValue: string | null };
    };
    expect(arg.data.oldValue).toBe("Clean brief");
    expect(arg.data.newValue).toBeNull();
  });

  it("replaces a synthetic gf_ PAT in summary and still writes", async () => {
    const fake = "gf_" + "z".repeat(32);
    await recordProjectEdit({
      projectId: "proj_1",
      field: "title",
      newValue: "Open civic kit",
      summary: `Title → ${fake}`,
    });
    const arg = create.mock.calls[0][0] as {
      data: { summary: string };
    };
    expect(arg.data.summary).toBe("Updated");
    expect(arg.data.summary.includes("gf_")).toBe(false);
  });
});
