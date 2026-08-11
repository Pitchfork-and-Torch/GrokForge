import { describe, expect, it } from "vitest";
import { scanForSecrets } from "@/lib/secret-scan";

describe("secret-scan", () => {
  it("allows clean markdown", () => {
    const r = scanForSecrets("# Deliverable\nWe used public data only.");
    expect(r.ok).toBe(true);
  });

  it("blocks ghp tokens", () => {
    const r = scanForSecrets("token ghp_abcdefghijklmnopqrstuvwxyz0123456789");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.hits.some((h) => h.includes("GitHub"))).toBe(true);
  });

  it("blocks sk- keys", () => {
    const r = scanForSecrets("openai sk-abcdefghijklmnopqrstuvwxyz012345");
    expect(r.ok).toBe(false);
  });
});
