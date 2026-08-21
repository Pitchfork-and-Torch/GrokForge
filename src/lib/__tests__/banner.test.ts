import { describe, expect, it } from "vitest";
import {
  buildBannerPrompt,
  validateImageBuffer,
} from "@/lib/banner";

describe("buildBannerPrompt", () => {
  it("includes title, category visual, and no-text instruction", () => {
    const prompt = buildBannerPrompt({
      title: "Ocean plastic mesh",
      description: "Open sensor network for coastal plastic detection with multi-agent review.",
      category: "CLIMATE",
      impactSummary: "Cleaner coasts via open hardware",
    });
    expect(prompt).toContain("Ocean plastic mesh");
    expect(prompt).toContain("earth systems");
    expect(prompt).toContain("no text");
    expect(prompt).toContain("GrokForge");
  });

  it("falls back for unknown category", () => {
    const prompt = buildBannerPrompt({
      title: "Test project alpha",
      description: "A longer description that explains the greater-good open work package clearly.",
      category: "UNKNOWN_CAT",
    });
    expect(prompt).toContain("abstract greater-good");
  });
});

describe("validateImageBuffer", () => {
  it("accepts JPEG magic bytes", () => {
    const buf = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46]);
    const r = validateImageBuffer(buf, "image/jpeg");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.mime).toBe("image/jpeg");
  });

  it("rejects empty and unknown formats", () => {
    expect(validateImageBuffer(Buffer.alloc(0)).ok).toBe(false);
    expect(validateImageBuffer(Buffer.from([0x00, 0x01, 0x02, 0x03])).ok).toBe(
      false
    );
  });

  it("rejects oversized buffers", () => {
    const big = Buffer.alloc(1_000_000, 0xff);
    big[0] = 0xff;
    big[1] = 0xd8;
    big[2] = 0xff;
    expect(validateImageBuffer(big).ok).toBe(false);
  });
});
