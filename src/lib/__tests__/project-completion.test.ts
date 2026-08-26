import { describe, expect, it } from "vitest";
import { planParentStatusUpdates } from "@/lib/project-completion";

describe("planParentStatusUpdates", () => {
  it("accepts master root when all leaves are ACCEPTED", () => {
    const plan = planParentStatusUpdates([
      { id: "root", status: "OPEN", parentId: null },
      { id: "a", status: "ACCEPTED", parentId: "root" },
      { id: "b", status: "ACCEPTED", parentId: "root" },
    ]);
    expect(plan.accept).toContain("root");
    expect(plan.reopen).toEqual([]);
  });

  it("does not accept parent while a leaf is still OPEN", () => {
    const plan = planParentStatusUpdates([
      { id: "root", status: "OPEN", parentId: null },
      { id: "a", status: "ACCEPTED", parentId: "root" },
      { id: "b", status: "OPEN", parentId: "root" },
    ]);
    expect(plan.accept).toEqual([]);
  });

  it("reopens parent when a leaf is no longer ACCEPTED", () => {
    const plan = planParentStatusUpdates([
      { id: "root", status: "ACCEPTED", parentId: null },
      { id: "a", status: "ACCEPTED", parentId: "root" },
      { id: "b", status: "OPEN", parentId: "root" },
    ]);
    expect(plan.reopen).toContain("root");
  });
});
