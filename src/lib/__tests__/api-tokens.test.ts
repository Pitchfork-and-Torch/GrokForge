import { describe, expect, it } from "vitest";
import {
  FOUNDER_ELEVATED_SCOPES,
  FOUNDER_ONLY_SCOPES,
  generateRawToken,
  hashToken,
  hasScope,
  parseScopes,
  rejectXaiKeyFields,
} from "@/lib/api-tokens";

describe("api-tokens", () => {
  it("generates gf_ secrets and stable hashes", () => {
    const a = generateRawToken();
    expect(a.raw.startsWith("gf_")).toBe(true);
    expect(a.prefix.length).toBe(12);
    expect(hashToken(a.raw)).toBe(a.hash);
    expect(hashToken(a.raw + "x")).not.toBe(a.hash);
  });

  it("parses and checks scopes", () => {
    const s = "tasks:read claims:write contributions:write";
    expect(parseScopes(s)).toHaveLength(3);
    expect(hasScope(s, "claims:write")).toBe(true);
    expect(hasScope(s, "admin")).toBe(false);
  });

  it("includes founder elevated moderation scopes", () => {
    expect(FOUNDER_ONLY_SCOPES).toContain("moderation:write");
    expect(FOUNDER_ELEVATED_SCOPES).toContain("moderation:write");
    expect(FOUNDER_ELEVATED_SCOPES).toContain("tasks:read");
    expect(hasScope(FOUNDER_ELEVATED_SCOPES.join(" "), "moderation:write")).toBe(
      true
    );
  });

  it("rejects xAI key smuggling fields", () => {
    expect(rejectXaiKeyFields({ body: "ok" })).toBeNull();
    expect(rejectXaiKeyFields({ XAI_API_KEY: "sk-x" })).toMatch(/never accepts/i);
    expect(rejectXaiKeyFields({ superGrokKey: "x" })).toMatch(/never accepts/i);
  });
});
