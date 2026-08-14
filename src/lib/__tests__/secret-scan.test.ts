import { describe, expect, it } from "vitest";
import { rejectSecretPaste, scanForSecrets } from "@/lib/secret-scan";

describe("secret-scan", () => {
  it("allows clean markdown", () => {
    const r = scanForSecrets("# Deliverable\nWe used public data only.");
    expect(r.ok).toBe(true);
  });

  it("blocks ghp tokens", () => {
    // Synthetic pattern for tests only (not a live credential)
    const fake = "ghp_" + "x".repeat(36);
    const r = scanForSecrets(`token ${fake}`);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.hits.some((h) => h.includes("GitHub"))).toBe(true);
  });

  it("blocks sk- keys", () => {
    const fake = "sk-" + "y".repeat(32);
    const r = scanForSecrets(`openai ${fake}`);
    expect(r.ok).toBe(false);
  });

  it("blocks Stripe live/test secrets and webhook secrets", () => {
    const live = "sk_live_" + "a".repeat(24);
    const test = "sk_test_" + "b".repeat(24);
    const wh = "whsec_" + "c".repeat(24);
    for (const fake of [live, test, wh]) {
      const r = scanForSecrets(`stripe ${fake}`);
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.hits.some((h) => h.includes("Stripe"))).toBe(true);
    }
  });

  it("blocks Slack bot tokens", () => {
    const fake = "xoxb-" + "1".repeat(12) + "-" + "2".repeat(12);
    const r = scanForSecrets(`slack ${fake}`);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.hits.some((h) => h.includes("Slack"))).toBe(true);
  });

  it("blocks vercel_ tokens", () => {
    const fake = "vercel_" + "d".repeat(24);
    const r = scanForSecrets(`deploy ${fake}`);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.hits.some((h) => h.includes("Vercel"))).toBe(true);
  });

  it("blocks postgres URLs with user:password", () => {
    const fake = "postgresql://demo_user:demo_pass_not_real@localhost:5432/app";
    const r = scanForSecrets(`dsn ${fake}`);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.hits.some((h) => h.includes("PostgreSQL"))).toBe(true);
  });

  it("allows postgres URLs without a password", () => {
    const r = scanForSecrets("dsn postgresql://localhost:5432/app");
    expect(r.ok).toBe(true);
  });

  it("does not flag short gf_ placeholders", () => {
    const r = scanForSecrets("set Authorization: Bearer gf_your_token");
    expect(r.ok).toBe(true);
  });

  it("rejectSecretPaste is null for clean review notes", () => {
    expect(rejectSecretPaste("Ship it — clear provenance and MIT header.")).toBeNull();
  });

  it("rejectSecretPaste blocks raw gf_ PATs in review notes", () => {
    const fake = "gf_" + "z".repeat(32);
    const r = rejectSecretPaste(`lgtm ${fake}`);
    expect(r).not.toBeNull();
    expect(r?.error).toMatch(/GrokForge PAT/i);
  });
});
