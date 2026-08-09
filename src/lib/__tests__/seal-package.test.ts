import { describe, expect, it } from "vitest";
import {
  buildPackageFiles,
  buildTaskTree,
  buildZipBuffer,
  contentHash,
  extensionForContentType,
  packageZipFilename,
  sanitizePathSegment,
  sanitizeVersion,
} from "@/lib/seal-package";

describe("seal-package", () => {
  it("sanitizes path segments against traversal", () => {
    expect(sanitizePathSegment("../../etc/passwd")).toBe("etc-passwd");
    expect(sanitizePathSegment("..")).toBe("item");
    expect(sanitizePathSegment("Hello World!!")).toBe("hello-world");
  });

  it("maps contentType to extensions", () => {
    expect(extensionForContentType("markdown")).toBe("md");
    expect(extensionForContentType("json")).toBe("json");
    expect(extensionForContentType("typescript")).toBe("ts");
    expect(extensionForContentType("weird", '{"a":1}')).toBe("json");
  });

  it("sanitizes versions", () => {
    expect(sanitizeVersion("1.0.0")).toBe("v1.0.0");
    expect(sanitizeVersion("v2.1")).toBe("v2.1");
    expect(sanitizeVersion("not a version!!!")).toBe("v1.0.0");
  });

  it("builds tree and package with seal note in README", () => {
    const tree = buildTaskTree([
      {
        id: "root",
        title: "Master",
        parentId: null,
        sortOrder: 0,
        status: "OPEN",
        contributions: [],
      },
      {
        id: "leaf1",
        title: "Leaf One",
        parentId: "root",
        sortOrder: 1,
        status: "ACCEPTED",
        contributions: [
          {
            id: "c1",
            body: "# Hello kit\n\nBody here.",
            sources: "https://example.com",
            contentType: "markdown",
            status: "ACCEPTED",
            createdAt: new Date("2026-08-01T00:00:00Z"),
            user: { id: "u1", handle: "alice", name: "Alice" },
          },
        ],
      },
    ]);
    expect(tree).toHaveLength(1);
    expect(tree[0].children?.[0]?.acceptedContribution?.id).toBe("c1");

    const files = buildPackageFiles({
      slug: "demo-kit",
      title: "Demo Kit",
      description: "A demo.",
      license: "MIT",
      version: "v1.0.0",
      sealNote: "This kit helps desks teach source protection honestly.",
      proposerHandle: "SuddenlyJon",
      sealedAt: "2026-08-06T12:00:00.000Z",
      tree,
      siteUrl: "https://grokforge.app",
    });
    const paths = files.map((f) => f.path);
    expect(paths).toContain("README.md");
    expect(paths).toContain("LICENSE");
    expect(paths).toContain("CONTRIBUTORS.md");
    expect(paths).toContain("NOTICE");
    expect(paths).toContain("GITHUB.md");
    expect(paths).toContain("project.json");
    expect(paths.some((p) => p.endsWith("deliverable.md"))).toBe(true);
    const readme = files.find((f) => f.path === "README.md")!.content;
    expect(readme).toContain("source protection honestly");
    expect(readme).toContain("Forged on");
    const contrib = files.find((f) => f.path === "CONTRIBUTORS.md")!.content;
    expect(contrib).toContain("@alice");
    expect(contrib).toContain("/u/alice");

    const hash = contentHash(files);
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
    expect(contentHash(files)).toBe(hash);

    const zip = buildZipBuffer(files);
    expect(zip.length).toBeGreaterThan(100);
    expect(zip.readUInt32LE(0)).toBe(0x04034b50);
    expect(packageZipFilename("demo-kit", "v1.0.0")).toBe("demo-kit-v1.0.0.zip");
  });
});
