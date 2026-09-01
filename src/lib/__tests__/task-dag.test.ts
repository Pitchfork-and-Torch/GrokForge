import { describe, expect, it } from "vitest";
import { computeReadySet, readyOpenLeaves } from "@/lib/task-dag";

describe("task-dag ready-set", () => {
  const tasks = [
    {
      id: "root",
      title: "Master",
      status: "OPEN",
      parentId: null,
      sortOrder: 0,
    },
    {
      id: "a",
      title: "Leaf A",
      status: "OPEN",
      parentId: "root",
      sortOrder: 1,
      estimatedTokens: 1000,
      goodFirst: true,
    },
    {
      id: "b",
      title: "Leaf B",
      status: "OPEN",
      parentId: "root",
      sortOrder: 2,
      dependsOnJson: JSON.stringify(["a"]),
      estimatedTokens: 5000,
    },
    {
      id: "c",
      title: "Leaf C done",
      status: "ACCEPTED",
      parentId: "root",
      sortOrder: 3,
    },
  ];

  it("marks independent open leaves ready", () => {
    const ready = readyOpenLeaves(tasks);
    expect(ready.some((r) => r.id === "a")).toBe(true);
  });

  it("blocks leaves until deps accepted", () => {
    const all = computeReadySet(tasks);
    const b = all.find((r) => r.id === "b");
    expect(b?.ready).toBe(false);
    expect(b?.blockedBy.some((x) => x.id === "a")).toBe(true);
  });

  it("unblocks after dep accepted", () => {
    const unlocked = tasks.map((t) =>
      t.id === "a" ? { ...t, status: "ACCEPTED" } : t
    );
    const b = computeReadySet(unlocked).find((r) => r.id === "b");
    expect(b?.ready).toBe(true);
  });
});
