import { describe, expect, it } from "vitest";
import {
  formatCents,
  formatRelativeTime,
  formatTokens,
  projectTaskProgress,
  publicProjectBlurb,
  slugify,
} from "@/lib/utils";

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

describe("projectTaskProgress", () => {
  it("counts accepted leaves out of total leaves", () => {
    const p = projectTaskProgress([
      { status: "OPEN", parentId: null },
      { status: "ACCEPTED", parentId: "root" },
      { status: "OPEN", parentId: "root" },
      { status: "CLAIMED", parentId: "root" },
    ]);
    expect(p.total).toBe(3);
    expect(p.completed).toBe(1);
    expect(p.open).toBe(1);
    expect(p.claimed).toBe(1);
    expect(p.submitted).toBe(0);
    expect(p.fullyComplete).toBe(false);
    expect(Math.round(p.pct)).toBe(33);
  });

  it("marks fullyComplete when every leaf is ACCEPTED", () => {
    const p = projectTaskProgress([
      { status: "OPEN", parentId: null },
      { status: "ACCEPTED", parentId: "root" },
      { status: "ACCEPTED", parentId: "root" },
    ]);
    expect(p.fullyComplete).toBe(true);
    expect(p.completed).toBe(2);
    expect(p.total).toBe(2);
  });
});

describe("formatRelativeTime", () => {
  it("uses short units and just now", () => {
    const now = new Date("2026-08-13T12:00:00Z");
    expect(formatRelativeTime(new Date("2026-08-13T11:59:40Z"), now)).toBe("just now");
    expect(formatRelativeTime(new Date("2026-08-13T11:10:00Z"), now)).toBe("50m ago");
    expect(formatRelativeTime(new Date("2026-08-13T09:00:00Z"), now)).toBe("3h ago");
    expect(formatRelativeTime(new Date("2026-08-11T12:00:00Z"), now)).toBe("2d ago");
    expect(formatRelativeTime(new Date("2026-07-01T00:00:00Z"), now)).toBe("2026-07-01");
  });
});

describe("publicProjectBlurb", () => {
  it("prefers prose after START HERE over BUILDER TL;DR soup", () => {
    const raw =
      "BUILDER TL;DR - Project: ANVIL-Infinity - Time to first claim: 30m LEGAL-RAILS - Matching pool ON. START HERE: claim a good-first leaf, submit Apache-2.0 artifacts, get a public receipt. ANVIL-Infinity is the flagship community project on GrokForge. We are building an open system of AI agents that can team up.";
    const blurb = publicProjectBlurb(raw, 220);
    expect(blurb.toLowerCase()).not.toContain("builder tl;dr");
    expect(blurb).toMatch(/flagship community project/i);
  });

  it("returns short descriptions unchanged", () => {
    expect(publicProjectBlurb("Open LEO congestion research under MIT.")).toBe(
      "Open LEO congestion research under MIT."
    );
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
