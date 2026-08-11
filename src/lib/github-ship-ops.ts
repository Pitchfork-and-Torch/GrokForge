/**
 * High-level Ship to GitHub for sealed projects (founder/admin phase 1).
 */
import { revalidatePath } from "next/cache";
import { LedgerKind } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { rateLimitAsync } from "@/lib/rate-limit";
import { isFounderHandle } from "@/lib/identity";
import { loadPackageFilesForProject } from "@/lib/seal-ops";
import {
  defaultRepoDescription,
  defaultTopics,
  getPublishOrg,
  getPublishToken,
  githubPublishConfigured,
  publishPackageToGitHub,
  repoNameFromSlug,
} from "@/lib/github-publish";
import {
  buildGithubReadyGuide,
  enhancePackageForGitHub,
} from "@/lib/seal-package";

type Actor = {
  id: string;
  handle: string | null;
  name: string | null;
};

export type PublishGitHubInput = {
  projectId: string;
  /** Override repo name (optional) */
  repoName?: string;
  siteUrl?: string;
};

/**
 * Publish sealed package to GitHub under the platform org.
 * Phase 1: founder only + server GITHUB_PUBLISH_TOKEN.
 */
export async function publishSealedToGitHubForUser(
  user: Actor,
  input: PublishGitHubInput,
  opts?: { via?: "ui" | "api" }
): Promise<
  | {
      ok: true;
      htmlUrl: string;
      fullName: string;
      commitSha: string;
      created: boolean;
      artifactId: string;
    }
  | { error: string }
> {
  if (!githubPublishConfigured()) {
    return {
      error:
        "Ship to GitHub is not configured (set GITHUB_PUBLISH_TOKEN + GITHUB_PUBLISH_ORG on the server)",
    };
  }

  const rl = await rateLimitAsync(`gh-publish:${user.id}`, {
    limit: 15,
    windowMs: 60 * 60 * 1000,
  });
  if (!rl.ok) return { error: `Rate limit: try again in ${rl.retryAfterSec}s` };

  const project = await prisma.project.findFirst({
    where: {
      OR: [{ id: input.projectId }, { slug: input.projectId }],
    },
    select: {
      id: true,
      slug: true,
      title: true,
      description: true,
      license: true,
      category: true,
      impactSummary: true,
      proposerId: true,
      artifacts: {
        where: { source: "package" },
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          id: true,
          version: true,
          sealNote: true,
          contentHash: true,
        },
      },
    },
  });
  if (!project) return { error: "Project not found" };
  if (!project.artifacts.length) {
    return { error: "Project has not been sealed yet. Seal & Ship first." };
  }

  // Phase 2: project creator or founder may publish sealed packages to the org.
  const isCreator = project.proposerId === user.id;
  const isFounder = isFounderHandle(user.handle);
  if (!isCreator && !isFounder) {
    return {
      error:
        "Only the project creator or founder can publish sealed packages to the org GitHub. Others can download the GitHub-ready ZIP.",
    };
  }

  const pack = await loadPackageFilesForProject(project.id, {
    siteUrl: input.siteUrl,
  });
  if ("error" in pack) return pack;

  const siteUrl = (
    input.siteUrl ||
    process.env.NEXTAUTH_URL ||
    process.env.AUTH_URL ||
    "https://grokforge.app"
  ).replace(/\/$/, "");

  const shipUrl = `${siteUrl}/projects/${project.slug}/ship`;
  const files = enhancePackageForGitHub(pack.files, {
    slug: project.slug,
    title: project.title,
    shipUrl,
    downloadUrl: `${siteUrl}/api/projects/${project.slug}/package`,
    license: project.license || "MIT",
    version: pack.version,
  });

  // Ensure GITHUB.md guide is present for humans who clone
  if (!files.some((f) => f.path === "GITHUB.md")) {
    files.push({
      path: "GITHUB.md",
      content: buildGithubReadyGuide({
        slug: project.slug,
        title: project.title,
        shipUrl,
        org: getPublishOrg(),
        repoName: repoNameFromSlug(input.repoName || project.slug),
      }),
    });
    files.sort((a, b) => a.path.localeCompare(b.path));
  }

  const primary = project.artifacts[0];
  const sealNote = primary.sealNote || project.impactSummary || project.description;
  const repoName = repoNameFromSlug(input.repoName || project.slug);

  const published = await publishPackageToGitHub(
    {
      token: getPublishToken(),
      org: getPublishOrg(),
      privateRepo: false,
    },
    {
      repoName,
      description: defaultRepoDescription(project.title, sealNote),
      homepage: shipUrl,
      topics: defaultTopics(String(project.category || "")),
      files,
      allowUpdate: true,
      licenseSpdx: project.license || "MIT",
    }
  );

  if ("error" in published) {
    return { error: published.error };
  }

  // Auto-create GitHub Release tag when version is semver-ish
  try {
    const ver = (pack.version || "").replace(/^v/i, "");
    if (ver && /^[\w.-]+$/.test(ver) && ver.length < 40) {
      const tag = ver.startsWith("v") ? ver : `v${ver}`;
      const [owner, repo] = published.fullName.split("/");
      const token = getPublishToken();
      if (owner && repo && token) {
        await fetch(`https://api.github.com/repos/${owner}/${repo}/releases`, {
          method: "POST",
          headers: {
            Accept: "application/vnd.github+json",
            Authorization: `Bearer ${token}`,
            "X-GitHub-Api-Version": "2022-11-28",
            "User-Agent": "GrokForge-ShipToGitHub/1.0",
          },
          body: JSON.stringify({
            tag_name: tag,
            name: `${project.title} ${tag}`,
            body: `Sealed on GrokForge.\n\n${sealNote.slice(0, 500)}\n\nShip: ${shipUrl}\nForged on GrokForge.`,
            target_commitish: "main",
          }),
        });
      }
    }
  } catch {
    /* release optional */
  }

  // Record github artifact (upsert by githubRepo full name)
  const existingGh = await prisma.artifact.findFirst({
    where: {
      projectId: project.id,
      source: "github",
      githubRepo: published.fullName,
    },
  });

  let artifactId: string;
  if (existingGh) {
    const updated = await prisma.artifact.update({
      where: { id: existingGh.id },
      data: {
        title: `${project.title} on GitHub`.slice(0, 200),
        url: published.htmlUrl.slice(0, 2000),
        version: pack.version,
        contentHash: pack.hash,
        sealedById: user.id,
      },
    });
    artifactId = updated.id;
  } else {
    const art = await prisma.artifact.create({
      data: {
        projectId: project.id,
        title: `${project.title} on GitHub`.slice(0, 200),
        url: published.htmlUrl.slice(0, 2000),
        license: project.license || "MIT",
        source: "github",
        githubRepo: published.fullName,
        version: pack.version,
        contentHash: pack.hash,
        sealedById: user.id,
        isPrimary: false,
      },
    });
    artifactId = art.id;
  }

  await prisma.ledgerEntry.create({
    data: {
      projectId: project.id,
      kind: LedgerKind.MILESTONE,
      amountCents: 0,
      summary: `@${user.handle || user.name || "founder"} published sealed package to GitHub (${published.fullName})`,
      actorHandle: user.handle,
      meta: JSON.stringify({
        shipToGitHub: true,
        fullName: published.fullName,
        htmlUrl: published.htmlUrl,
        commitSha: published.commitSha,
        created: published.created,
        via: opts?.via || "ui",
        packageVersion: pack.version,
        contentHash: pack.hash,
      }),
    },
  });

  revalidatePath(`/projects/${project.slug}`);
  revalidatePath(`/projects/${project.slug}/ship`);
  revalidatePath("/activity");
  revalidatePath("/");

  return {
    ok: true,
    htmlUrl: published.htmlUrl,
    fullName: published.fullName,
    commitSha: published.commitSha,
    created: published.created,
    artifactId,
  };
}

export { githubPublishConfigured, getPublishOrg };
