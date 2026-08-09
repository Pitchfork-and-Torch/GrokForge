/**
 * Seal & Ship server operations (proposer seal + package artifact).
 */
import { revalidatePath } from "next/cache";
import { LedgerKind } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { rateLimitAsync } from "@/lib/rate-limit";
import { notifyUser } from "@/lib/notify";
import { isFounderHandle } from "@/lib/identity";
import { projectTaskProgress } from "@/lib/utils";
import {
  buildPackageFiles,
  buildTaskTree,
  contentHash,
  packageZipFilename,
  sanitizeVersion,
  type BuildPackageInput,
  type PackageFile,
} from "@/lib/seal-package";

export type SealInput = {
  projectId: string;
  sealNote: string;
  version?: string;
  packageTitle?: string;
  siteUrl?: string;
};

type Actor = {
  id: string;
  handle: string | null;
  name: string | null;
};

export async function loadPackageFilesForProject(
  projectIdOrSlug: string,
  opts?: {
    sealNote?: string;
    version?: string;
    packageTitle?: string;
    sealedAt?: string;
    siteUrl?: string;
  }
): Promise<
  | {
      ok: true;
      files: PackageFile[];
      hash: string;
      version: string;
      slug: string;
      title: string;
      zipName: string;
      sealNote: string;
    }
  | { error: string }
> {
  const project = await prisma.project.findFirst({
    where: {
      OR: [{ id: projectIdOrSlug }, { slug: projectIdOrSlug }],
    },
    include: {
      proposer: { select: { handle: true } },
      tasks: {
        orderBy: { sortOrder: "asc" },
        include: {
          contributions: {
            where: { status: "ACCEPTED" },
            orderBy: { createdAt: "desc" },
            include: {
              user: {
                select: {
                  id: true,
                  handle: true,
                  name: true,
                  githubHandle: true,
                },
              },
            },
          },
        },
      },
      artifacts: {
        where: { source: "package", isPrimary: true },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });
  if (!project) return { error: "Project not found" };

  const primary = project.artifacts[0];
  const version = sanitizeVersion(
    opts?.version || primary?.version || "v1.0.0"
  );
  const sealNote = (
    opts?.sealNote ||
    primary?.sealNote ||
    project.impactSummary ||
    "Sealed on GrokForge."
  ).trim();
  const packageTitle =
    opts?.packageTitle ||
    (primary?.title?.replace(/\s+package\s*$/i, "") ?? undefined);
  const sealedAt =
    opts?.sealedAt ||
    primary?.createdAt?.toISOString() ||
    new Date().toISOString();

  const tree = buildTaskTree(project.tasks);
  const input: BuildPackageInput = {
    slug: project.slug,
    title: project.title,
    description: project.description,
    license: project.license || "MIT",
    version,
    sealNote,
    packageTitle,
    proposerHandle: project.proposer.handle,
    sealedAt,
    tree,
    siteUrl: opts?.siteUrl || process.env.NEXTAUTH_URL || "https://grokforge.app",
  };
  const files = buildPackageFiles(input);
  const hash = contentHash(files);
  return {
    ok: true,
    files,
    hash,
    version,
    slug: project.slug,
    title: project.title,
    zipName: packageZipFilename(project.slug, version),
    sealNote,
  };
}

/**
 * Proposer (or founder with elevated intent) seals a COMPLETED project.
 */
export async function sealProjectForUser(
  user: Actor,
  input: SealInput,
  opts?: { via?: "ui" | "api"; founderOverride?: boolean }
): Promise<
  | {
      ok: true;
      artifactId: string;
      version: string;
      contentHash: string;
      shipPath: string;
      downloadPath: string;
    }
  | { error: string }
> {
  const rl = await rateLimitAsync(`seal:${user.id}`, {
    limit: 20,
    windowMs: 60 * 60 * 1000,
  });
  if (!rl.ok) return { error: `Rate limit: try again in ${rl.retryAfterSec}s` };

  const sealNote = (input.sealNote || "").trim();
  if (sealNote.length < 20) {
    return { error: "Seal note must be at least 20 characters" };
  }
  if (sealNote.length > 8000) {
    return { error: "Seal note too long (max 8000)" };
  }

  const project = await prisma.project.findUnique({
    where: { id: input.projectId },
    include: {
      proposer: { select: { handle: true } },
      tasks: {
        select: {
          id: true,
          status: true,
          parentId: true,
          title: true,
          sortOrder: true,
          acceptanceCriteria: true,
          contributions: {
            where: { status: "ACCEPTED" },
            orderBy: { createdAt: "desc" },
            include: {
              user: {
                select: {
                  id: true,
                  handle: true,
                  name: true,
                  githubHandle: true,
                },
              },
            },
          },
        },
      },
    },
  });
  if (!project) return { error: "Project not found" };

  const isCreator = project.proposerId === user.id;
  const isFounder = isFounderHandle(user.handle);
  if (!isCreator && !(opts?.founderOverride && isFounder)) {
    return { error: "Only the project creator (or founder) can seal" };
  }

  const progress = projectTaskProgress(project.tasks);
  if (project.status !== "COMPLETED" && !progress.fullyComplete) {
    return {
      error: "Project must be COMPLETED (all claimable tasks accepted) before seal",
    };
  }
  if (progress.completed < 1) {
    return { error: "Need at least one accepted contribution to seal" };
  }

  const version = sanitizeVersion(input.version || "v1.0.0");
  const sealedAt = new Date().toISOString();
  const siteUrl =
    input.siteUrl ||
    process.env.NEXTAUTH_URL ||
    process.env.AUTH_URL ||
    "https://grokforge.app";

  const pack = await loadPackageFilesForProject(project.id, {
    sealNote,
    version,
    packageTitle: input.packageTitle,
    sealedAt,
    siteUrl: siteUrl.replace(/\/$/, ""),
  });
  if ("error" in pack) return pack;

  // Clear previous primary package flags
  await prisma.artifact.updateMany({
    where: { projectId: project.id, source: "package", isPrimary: true },
    data: { isPrimary: false },
  });

  const downloadPath = `/api/projects/${project.slug}/package`;
  const shipPath = `/projects/${project.slug}/ship`;
  const pkgTitle =
    (input.packageTitle?.trim() || project.title).slice(0, 160) +
    ` (${version}) package`;

  const art = await prisma.artifact.create({
    data: {
      projectId: project.id,
      title: pkgTitle.slice(0, 200),
      url: downloadPath.slice(0, 2000),
      license: project.license || "MIT",
      source: "package",
      version,
      sealNote,
      contentHash: pack.hash,
      isPrimary: true,
      sealedById: user.id,
    },
  });

  await prisma.project.update({
    where: { id: project.id },
    data: {
      status: "COMPLETED",
      impactSummary: sealNote.slice(0, 8000),
    },
  });

  await prisma.ledgerEntry.create({
    data: {
      projectId: project.id,
      kind: LedgerKind.MILESTONE,
      amountCents: 0,
      summary: `Project sealed and published by @${user.handle || user.name || "creator"} (${version})`,
      actorHandle: user.handle,
      meta: JSON.stringify({
        seal: true,
        artifactId: art.id,
        version,
        contentHash: pack.hash,
        via: opts?.via || "ui",
      }),
    },
  });

  // Notify unique accepted contributors
  const contributorIds = new Set<string>();
  for (const t of project.tasks) {
    for (const c of t.contributions) {
      if (c.user.id !== user.id) contributorIds.add(c.user.id);
    }
  }
  for (const uid of contributorIds) {
    await notifyUser({
      userId: uid,
      type: "SEALED",
      title: `Sealed: ${project.title}`,
      body: `@${user.handle || "creator"} sealed the project (${version}). Download the package on the ship page.`,
      href: shipPath,
    });
  }

  revalidatePath(`/projects/${project.slug}`);
  revalidatePath(shipPath);
  revalidatePath(`/projects/${project.slug}/seal`);
  revalidatePath("/dashboard");
  revalidatePath("/");
  revalidatePath("/activity");

  return {
    ok: true,
    artifactId: art.id,
    version,
    contentHash: pack.hash,
    shipPath,
    downloadPath,
  };
}
