import { describe, expect, it } from "vitest";
import {
  MAX_WEBHOOK_URL_LENGTH,
  checkPublicHttpsWebhookUrl,
} from "@/lib/webhook-url";

function ok(url: string) {
  const r = checkPublicHttpsWebhookUrl(url);
  expect(r.ok, r.ok ? url : r.error).toBe(true);
  return r;
}

function denied(url: string) {
  const r = checkPublicHttpsWebhookUrl(url);
  expect(r.ok, url).toBe(false);
  return r;
}

describe("checkPublicHttpsWebhookUrl", () => {
  it("allows a public https webhook", () => {
    const r = ok("https://hooks.example.com/gf");
    if (r.ok) expect(r.url).toBe("https://hooks.example.com/gf");
  });

  it("rejects http", () => {
    const r = denied("http://hooks.example.com/gf");
    if (!r.ok) expect(r.error).toMatch(/https/i);
  });

  it("rejects localhost", () => {
    denied("https://localhost/hook");
    denied("https://localhost./hook");
    denied("https://foo.localhost/hook");
  });

  it("rejects 127.0.0.1", () => {
    denied("https://127.0.0.1/hook");
    denied("https://127.0.0.1:8443/hook");
  });

  it("rejects 10/8", () => {
    denied("https://10.1.2.3/hook");
    denied("https://10.255.255.255/hook");
  });

  it("rejects 169.254.169.254", () => {
    denied("https://169.254.169.254/latest/meta-data/");
  });

  it("rejects metadata host", () => {
    denied("https://metadata.google.internal/computeMetadata/v1/");
    denied("https://metadata/computeMetadata/v1/");
  });

  it("rejects userinfo-in-URL", () => {
    const r = denied("https://user:pass@hooks.example.com/gf");
    if (!r.ok) expect(r.error).toMatch(/credentials/i);
    denied("https://user@hooks.example.com/gf");
  });

  it("rejects fragments", () => {
    denied("https://hooks.example.com/gf#x");
  });

  it("rejects RFC1918, link-local, and .local", () => {
    denied("https://192.168.1.10/hook");
    denied("https://172.16.0.2/hook");
    denied("https://worker.local/hook");
  });

  it("rejects IPv6 loopback and ULA", () => {
    denied("https://[::1]/hook");
    denied("https://[fd12:3456:789a:1::1]/hook");
    denied("https://[fe80::1]/hook");
    denied("https://[::ffff:127.0.0.1]/hook");
  });

  it("rejects dotted-decimal and hex loopback forms", () => {
    denied("https://2130706433/hook");
    denied("https://0x7f000001/hook");
    denied("https://127.1/hook");
  });

  it("rejects obvious DNS-rebinding hosts without a network call", () => {
    denied("https://127.0.0.1.nip.io/hook");
    denied("https://10.0.0.1.sslip.io/hook");
  });

  it("rejects overlong URLs", () => {
    const r = denied(`https://hooks.example.com/${"a".repeat(MAX_WEBHOOK_URL_LENGTH)}`);
    if (!r.ok) expect(r.error).toMatch(/too long/i);
  });

  it("allows a public host with a non-default port", () => {
    ok("https://hooks.example.com:8443/gf");
  });
});
