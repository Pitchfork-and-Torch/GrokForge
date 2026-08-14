import { describe, expect, it } from "vitest";
import {
  projectTweetIntent,
  secondBuilderInviteIntent,
} from "@/components/share-project-button";

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

  it("builds second-builder invite intent", () => {
    const href = secondBuilderInviteIntent({
      title: "PulseNet",
      slug: "pulsenet",
      proposerHandle: "SuddenlyJon",
      openLeaves: 3,
      pendingReviews: 2,
    });
    const text = decodeURIComponent(href.split("text=")[1] || "");
    expect(text).toContain("Need a second builder");
    expect(text).toContain("PulseNet");
    expect(text).toContain("?invite=1");
    expect(text).toContain("3 open leaves");
  });
});
