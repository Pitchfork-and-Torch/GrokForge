import { describe, expect, it } from "vitest";
import { formatCents, formatTokens, slugify } from "@/lib/utils";

describe("utils", () => {
  it("slugifies titles", () => {
    expect(slugify("Open Climate Synthesis Atlas!")).toBe("open-climate-synthesis-atlas");
  });

  it("formats money from cents", () => {
    expect(formatCents(12500)).toContain("125");
  });

  it("formats token estimates", () => {
    expect(formatTokens(25000)).toBe("25.0k");
    expect(formatTokens(500)).toBe("500");
  });
});

describe("task claim rules (pure)", () => {
  it("enforces max active claims per project", () => {
    const maxActive = 3;
    const activeClaims = 3;
    const canClaim = activeClaims < maxActive;
    expect(canClaim).toBe(false);
  });

  it("records donation amounts as positive cents", () => {
    const amountUsd = 10;
    const amountCents = Math.round(amountUsd * 100);
    expect(amountCents).toBe(1000);
    expect(amountCents).toBeGreaterThan(0);
  });
});

describe("alignment pre-check sketch", () => {
  function check(text: string, license: string) {
    const banned = ["malware for hire"];
    if (banned.some((b) => text.toLowerCase().includes(b))) return false;
    if (!license) return false;
    return true;
  }

  it("passes greater-good climate projects", () => {
    expect(check("Open climate synthesis for education", "CC-BY-4.0")).toBe(true);
  });

  it("fails disallowed patterns", () => {
    expect(check("malware for hire marketplace", "MIT")).toBe(false);
  });
});
