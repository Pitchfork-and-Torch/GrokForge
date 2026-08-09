import { describe, expect, it } from "vitest";
import { projectTweetIntent } from "@/components/share-project-button";

describe("projectTweetIntent", () => {
  it("builds a tweet intent with title, url, and hashtags", () => {
    const href = projectTweetIntent({
      title: "Ocean mesh",
      slug: "ocean-mesh",
      category: "CLIMATE",
      proposerHandle: "SuddenlyJon",
    });
    expect(href.startsWith("https://x.com/intent/tweet?text=")).toBe(true);
    const text = decodeURIComponent(href.split("text=")[1] || "");
    expect(text).toContain("Ocean mesh on GrokForge");
    expect(text).toContain("climate");
    expect(text).toContain("@SuddenlyJon");
    expect(text).toContain("https://grokforge.app/projects/ocean-mesh");
    expect(text).toContain("#GrokForge");
  });

  it("uses featured lead-in when flagged", () => {
    const href = projectTweetIntent({
      title: "Pinned good",
      slug: "pinned-good",
      featured: true,
    });
    const text = decodeURIComponent(href.split("text=")[1] || "");
    expect(text).toContain("Featured on GrokForge: Pinned good");
  });
});
