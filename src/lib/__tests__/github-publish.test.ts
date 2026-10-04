import { describe, expect, it } from "vitest";
import {
  defaultRepoDescription,
  defaultTopics,
  repoNameFromSlug,
} from "@/lib/github-publish";
import {
  buildGithubReadyGuide,
  buildNotice,
  enhancePackageForGitHub,
  type PackageFile,
} from "@/lib/seal-package";

describe("github-publish helpers", () => {
  it("sanitizes repo names from slugs", () => {
    expect(repoNameFromSlug("Open Source Protection!!")).toBe(
      "open-source-protection"
    );
    expect(repoNameFromSlug("../../etc")).toMatch(/^[a-z0-9._-]+$/);
  });

  it("builds topics and description", () => {
    const topics = defaultTopics("EDUCATION");
    expect(topics).toContain("grokforge");
    expect(topics).toContain("forged-on-grokforge");
    expect(topics).toContain("education");
    const d = defaultRepoDescription(
      "Civic Kit",
      "Helps newsrooms protect sources with open tools."
    );
    expect(d).toContain("Forged on GrokForge");
    expect(d.length).toBeLessThanOrEqual(350);
  });
});

describe("github-ready package extras", () => {
  it("builds NOTICE and GITHUB.md", () => {
    const notice = buildNotice({
      title: "Demo Kit",
      license: "MIT",
      shipUrl: "https://grokforge.app/projects/demo/ship",
      year: 2026,
    });
    expect(notice).toContain("Forged on GrokForge");
    expect(notice).toContain("MIT");

    const guide = buildGithubReadyGuide({
      slug: "demo-kit",
      title: "Demo Kit",
      shipUrl: "https://grokforge.app/projects/demo-kit/ship",
      org: "Pitchfork-and-Torch",
    });
    expect(guide).toContain("git push");
    expect(guide).toContain("Pitchfork-and-Torch");
  });

  it("enhances package files without duplicating NOTICE", () => {
    const base: PackageFile[] = [
      { path: "README.md", content: "# x\n" },
      { path: "NOTICE", content: "already\n" },
    ];
    const out = enhancePackageForGitHub(base, {
      slug: "demo",
      title: "Demo",
      shipUrl: "https://grokforge.app/projects/demo/ship",
      downloadUrl: "https://grokforge.app/api/projects/demo/package",
      license: "MIT",
      version: "v1.0.0",
    });
    expect(out.filter((f) => f.path === "NOTICE")).toHaveLength(1);
    expect(out.some((f) => f.path === "GITHUB.md")).toBe(true);
    expect(out.find((f) => f.path === "NOTICE")!.content).toBe("already\n");
  });
});
