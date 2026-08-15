import { beforeEach, describe, expect, it, vi } from "vitest";

const findMany = vi.fn();
const count = vi.fn();
const ledgerCreate = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    taskClaim: {
      findMany: (...args: unknown[]) => findMany(...args),
      count: (...args: unknown[]) => count(...args),
      update: vi.fn().mockResolvedValue({}),
    },
    task: { update: vi.fn().mockResolvedValue({}) },
    ledgerEntry: {
      create: (...args: unknown[]) => ledgerCreate(...args),
    },
    $transaction: async (ops: unknown[]) =>
      Promise.all(ops as Promise<unknown>[]),
  },
}));

vi.mock("@/lib/notify", () => ({
  notifyUser: vi.fn(),
}));

import { expireStaleClaims } from "@/lib/expire-claims";

function staleClaim(title: string) {
  return {
    id: "claim_1",
    taskId: "task_1",
    userId: "user_1",
    task: {
      id: "task_1",
      projectId: "proj_1",
      title,
      project: {
        id: "proj_1",
        slug: "civic-kit",
        title: "Open civic kit",
        proposerId: "creator_1",
      },
    },
    user: { id: "user_1", handle: "tester", name: "Tester" },
  };
}

describe("expireStaleClaims ledger summary secret scan", () => {
  beforeEach(() => {
    findMany.mockReset();
    count.mockReset();
    ledgerCreate.mockReset();
    ledgerCreate.mockResolvedValue({ id: "led_1" });
    count.mockResolvedValue(0);
  });

  it("persists a clean task title on the public tape", async () => {
    findMany.mockResolvedValue([staleClaim("Write the open brief")]);
    await expireStaleClaims({ notify: false });
    expect(ledgerCreate).toHaveBeenCalled();
    const arg = ledgerCreate.mock.calls[0][0] as { data: { summary: string } };
    expect(arg.data.summary).toBe(
      'Claim expired on "Write the open brief" (was @tester)'
    );
  });

  it("replaces a synthetic gf_ PAT copied from a pre-scan task title", async () => {
    const fake = "gf_" + "z".repeat(32);
    findMany.mockResolvedValue([staleClaim(`legacy leaf ${fake}`)]);
    await expireStaleClaims({ notify: false });
    const arg = ledgerCreate.mock.calls[0][0] as { data: { summary: string } };
    expect(arg.data.summary).toBe("Activity recorded");
    expect(arg.data.summary.includes("gf_")).toBe(false);
  });
});
