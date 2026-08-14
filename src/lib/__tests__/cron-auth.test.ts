import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { authorizeCron } from "@/lib/cron-auth";

const SECRET = "test-cron-secret-not-a-live-credential";

function cronReq(opts?: { auth?: string; url?: string }) {
  const headers = new Headers();
  if (opts?.auth) headers.set("authorization", opts.auth);
  return new NextRequest(
    opts?.url ?? "http://localhost/api/cron/expire-claims",
    { headers }
  );
}

describe("authorizeCron", () => {
  const prevSecret = process.env.CRON_SECRET;
  const prevVercel = process.env.VERCEL_ENV;

  beforeEach(() => {
    process.env.CRON_SECRET = SECRET;
    delete process.env.VERCEL_ENV;
  });

  afterEach(() => {
    if (prevSecret === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = prevSecret;
    if (prevVercel === undefined) delete process.env.VERCEL_ENV;
    else process.env.VERCEL_ENV = prevVercel;
  });

  it("authorizes matching Bearer token", () => {
    expect(authorizeCron(cronReq({ auth: `Bearer ${SECRET}` }))).toBe(true);
  });

  it("rejects missing Authorization", () => {
    expect(authorizeCron(cronReq())).toBe(false);
  });

  it("rejects wrong Bearer token", () => {
    expect(authorizeCron(cronReq({ auth: "Bearer wrong-secret" }))).toBe(false);
  });

  it("ignores query-string secret", () => {
    const withQuery = `http://localhost/api/cron/expire-claims?secret=${SECRET}`;
    expect(authorizeCron(cronReq({ url: withQuery }))).toBe(false);
    expect(
      authorizeCron(cronReq({ auth: "Bearer wrong-secret", url: withQuery }))
    ).toBe(false);
  });

  it("fails closed in production when CRON_SECRET is missing", () => {
    delete process.env.CRON_SECRET;
    process.env.VERCEL_ENV = "production";
    expect(authorizeCron(cronReq({ auth: `Bearer ${SECRET}` }))).toBe(false);
  });

  it("allows missing CRON_SECRET outside production", () => {
    delete process.env.CRON_SECRET;
    process.env.VERCEL_ENV = "preview";
    expect(authorizeCron(cronReq())).toBe(true);
  });
});
