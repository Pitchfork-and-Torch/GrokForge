import { describe, expect, it } from "vitest";
import {
  isGitHubUrl,
  normalizeGitHubUrl,
  parseGitHubRepo,
  titleFromGitHubUrl,
} from "@/lib/github-link";

describe("github-link", () => {
  it("normalizes and parses repo URLs", () => {
    const n = normalizeGitHubUrl("github.com/Pitchfork-and-Torch/GrokForge");
    expect(n).toBe("https://github.com/Pitchfork-and-Torch/GrokForge");
    expect(parseGitHubRepo(n!)).toBe("Pitchfork-and-Torch/GrokForge");
    expect(isGitHubUrl(n!)).toBe(true);
  });

  it("rejects non-github", () => {
    expect(normalizeGitHubUrl("https://gitlab.com/foo/bar")).toBeNull();
    expect(isGitHubUrl("https://example.com")).toBe(false);
  });

  it("titles PRs", () => {
    expect(
      titleFromGitHubUrl("https://github.com/acme/app/pull/12")
    ).toContain("PR12");
  });
});
