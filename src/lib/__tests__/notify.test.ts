import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const create = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    notification: {
      create: (...args: unknown[]) => create(...args),
    },
  },
}));

import { notifyUser } from "@/lib/notify";

describe("notifyUser secret scan", () => {
  const captured: { url: string; init: RequestInit }[] = [];
  const prev = {
    hook: process.env.NOTIFY_WEBHOOK_URL,
    token: process.env.NOTIFY_WEBHOOK_TOKEN,
    fmt: process.env.NOTIFY_WEBHOOK_FORMAT,
  };

  beforeEach(() => {
    create.mockReset();
    create.mockResolvedValue({ id: "n_1" });
    captured.length = 0;
    process.env.NOTIFY_WEBHOOK_URL = "https://hooks.example.com/notify";
    delete process.env.NOTIFY_WEBHOOK_TOKEN;
    delete process.env.NOTIFY_WEBHOOK_FORMAT;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        captured.push({ url: String(input), init: init ?? {} });
        return new Response(null, { status: 204 });
      })
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    if (prev.hook === undefined) delete process.env.NOTIFY_WEBHOOK_URL;
    else process.env.NOTIFY_WEBHOOK_URL = prev.hook;
    if (prev.token === undefined) delete process.env.NOTIFY_WEBHOOK_TOKEN;
    else process.env.NOTIFY_WEBHOOK_TOKEN = prev.token;
    if (prev.fmt === undefined) delete process.env.NOTIFY_WEBHOOK_FORMAT;
    else process.env.NOTIFY_WEBHOOK_FORMAT = prev.fmt;
  });

  function payload() {
    expect(captured).toHaveLength(1);
    return JSON.parse(String(captured[0].init.body)) as {
      title: string;
      body: string;
    };
  }

  it("persists a clean title and body", async () => {
    await notifyUser({
      userId: "user_1",
      type: "CLAIM_EXPIRED",
      title: "Claim expired: Write the open brief",
      body: 'Your claim window closed on Open civic kit.',
      href: "/projects/civic-kit",
    });
    expect(create).toHaveBeenCalled();
    const arg = create.mock.calls[0][0] as {
      data: { title: string; body: string };
    };
    expect(arg.data.title).toBe("Claim expired: Write the open brief");
    expect(arg.data.body).toBe("Your claim window closed on Open civic kit.");
    expect(payload().title).toBe("Claim expired: Write the open brief");
  });

  it("replaces a synthetic gf_ PAT copied from a pre-scan task title", async () => {
    const fake = "gf_" + "z".repeat(32);
    await notifyUser({
      userId: "user_1",
      type: "CLAIM_EXPIRED",
      title: `Claim expired: ${fake}`,
      body: `Your claim window closed on ${fake}.`,
      href: "/projects/civic-kit",
    });
    const arg = create.mock.calls[0][0] as {
      data: { title: string; body: string };
    };
    expect(arg.data.title).toBe("Notification");
    expect(arg.data.body).toBe("Activity recorded");
    expect(arg.data.title.includes("gf_")).toBe(false);
    expect(arg.data.body.includes("gf_")).toBe(false);
    const sent = payload();
    expect(sent.title).toBe("Notification");
    expect(sent.body).toBe("Activity recorded");
    expect(JSON.stringify(sent).includes("gf_")).toBe(false);
  });

  it("replaces a synthetic gf_ PAT in a comment snippet and still writes", async () => {
    const fake = "gf_" + "z".repeat(32);
    await notifyUser({
      userId: "creator_1",
      type: "COMMENT",
      title: "New comment on Open civic kit",
      body: `@tester: oops ${fake}`,
      href: "/projects/civic-kit",
    });
    const arg = create.mock.calls[0][0] as {
      data: { title: string; body: string };
    };
    expect(arg.data.title).toBe("New comment on Open civic kit");
    expect(arg.data.body).toBe("Activity recorded");
    expect(create).toHaveBeenCalled();
  });
});
