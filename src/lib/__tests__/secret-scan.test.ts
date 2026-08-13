import { describe, expect, it } from "vitest";
import { scanForSecrets } from "@/lib/secret-scan";

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
});

