import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireAgentRuntimeWebhook } from "@/lib/agent-workers";

type Captured = { url: string; init: RequestInit };

const PLATFORM = "https://platform.example.com/runtime";
const USER = "https://hooks.example.com/gf";
const TOKEN = "platform-runtime-token-test-not-live";

describe("fireAgentRuntimeWebhook", () => {
  const captured: Captured[] = [];
  const prev = {
    platform: process.env.AGENT_RUNTIME_WEBHOOK_URL,
    token: process.env.AGENT_RUNTIME_WEBHOOK_TOKEN,
    notify: process.env.NOTIFY_WEBHOOK_URL,
    fmt: process.env.NOTIFY_WEBHOOK_FORMAT,
  };

  beforeEach(() => {
    captured.length = 0;
    process.env.AGENT_RUNTIME_WEBHOOK_URL = PLATFORM;
    process.env.AGENT_RUNTIME_WEBHOOK_TOKEN = TOKEN;
    delete process.env.NOTIFY_WEBHOOK_URL;
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
    if (prev.platform === undefined) delete process.env.AGENT_RUNTIME_WEBHOOK_URL;
    else process.env.AGENT_RUNTIME_WEBHOOK_URL = prev.platform;
    if (prev.token === undefined) delete process.env.AGENT_RUNTIME_WEBHOOK_TOKEN;
    else process.env.AGENT_RUNTIME_WEBHOOK_TOKEN = prev.token;
    if (prev.notify === undefined) delete process.env.NOTIFY_WEBHOOK_URL;
    else process.env.NOTIFY_WEBHOOK_URL = prev.notify;
    if (prev.fmt === undefined) delete process.env.NOTIFY_WEBHOOK_FORMAT;
    else process.env.NOTIFY_WEBHOOK_FORMAT = prev.fmt;
  });

  function authOf(url: string) {
    const row = captured.find((c) => c.url === url);
    expect(row, url).toBeTruthy();
    return new Headers(row!.init.headers as HeadersInit).get("authorization");
  }

  it("does not attach AGENT_RUNTIME_WEBHOOK_TOKEN to the user webhook", async () => {
    await fireAgentRuntimeWebhook({
      type: "leaf.ready",
      title: "Ready leaves",
      body: "1 claimable",
      userWebhookUrl: USER,
    });

    expect(authOf(USER)).toBeNull();
    expect(authOf(PLATFORM)).toBe(`Bearer ${TOKEN}`);
    expect(captured).toHaveLength(2);
  });

  it("does not fire a private user webhook", async () => {
    await fireAgentRuntimeWebhook({
      type: "leaf.ready",
      title: "Ready leaves",
      body: "1 claimable",
      userWebhookUrl: "https://127.0.0.1/hook",
    });

    expect(captured.map((c) => c.url)).toEqual([PLATFORM]);
    expect(authOf(PLATFORM)).toBe(`Bearer ${TOKEN}`);
  });
});
