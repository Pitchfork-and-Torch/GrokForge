import { beforeEach, describe, expect, it, vi } from "vitest";

const upsert = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    agentWorkerHeartbeat: {
      upsert: (...args: unknown[]) => upsert(...args),
    },
  },
}));

import { upsertWorkerHeartbeat } from "@/lib/agent-workers";

describe("upsertWorkerHeartbeat secret scan", () => {
  beforeEach(() => {
    upsert.mockReset();
  });

  it("rejects a synthetic gf_ PAT in workerName without hitting the DB", async () => {
    const fake = "gf_" + "z".repeat(32);
    await expect(
      upsertWorkerHeartbeat({
        userId: "user_1",
        workerName: fake,
      })
    ).rejects.toThrow(/GrokForge PAT/i);
    expect(upsert).not.toHaveBeenCalled();
  });

  it("drops a synthetic gf_ PAT in lastError and still heartbeats", async () => {
    const fake = "gf_" + "z".repeat(32);
    upsert.mockResolvedValue({
      workerName: "local-1",
      status: "error",
      lastError: null,
    });
    await upsertWorkerHeartbeat({
      userId: "user_1",
      workerName: "local-1",
      lastError: `claim failed ${fake}`,
      event: "error",
    });
    expect(upsert).toHaveBeenCalled();
    const arg = upsert.mock.calls[0][0] as {
      create: { lastError: string | null };
    };
    expect(arg.create.lastError).toBeNull();
  });

  it("drops a synthetic gf_ PAT in lastProjectSlug and projectFilter", async () => {
    const fake = "gf_" + "z".repeat(32);
    upsert.mockResolvedValue({
      workerName: "local-1",
      status: "idle",
      lastProjectSlug: null,
      projectFilter: null,
    });
    await upsertWorkerHeartbeat({
      userId: "user_1",
      workerName: "local-1",
      lastProjectSlug: fake,
      projectFilter: `civic-kit,${fake}`,
    });
    expect(upsert).toHaveBeenCalled();
    const arg = upsert.mock.calls[0][0] as {
      create: { lastProjectSlug: string | null; projectFilter: string | null };
    };
    expect(arg.create.lastProjectSlug).toBeNull();
    expect(arg.create.projectFilter).toBeNull();
  });

  it("drops a synthetic gf_ PAT in lastTaskId and still heartbeats", async () => {
    const fake = "gf_" + "z".repeat(32);
    upsert.mockResolvedValue({
      workerName: "local-1",
      status: "idle",
      lastTaskId: null,
    });
    await upsertWorkerHeartbeat({
      userId: "user_1",
      workerName: "local-1",
      lastTaskId: fake,
    });
    expect(upsert).toHaveBeenCalled();
    const arg = upsert.mock.calls[0][0] as {
      create: { lastTaskId: string | null };
    };
    expect(arg.create.lastTaskId).toBeNull();
  });
});
