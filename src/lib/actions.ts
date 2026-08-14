"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  FundType,
  LedgerKind,
  ProjectCategory,
  TaskStatus,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser, requireXUser } from "@/lib/session";
import { rateLimitAsync } from "@/lib/rate-limit";
import { notifyProjectWatchers, notifyUser } from "@/lib/notify";
import { slugify } from "@/lib/utils";
import {
  generateImagineBanner,
  getBannerFile,
  storeUploadedBanner,
} from "@/lib/banner";
import { rejectSecretPaste } from "@/lib/secret-scan";
import { checkPublicHttpsWebhookUrl } from "@/lib/webhook-url";

const projectSchema = z.object({
  title: z.string().min(5).max(120),
  description: z.string().min(40).max(8000),
  category: z.nativeEnum(ProjectCategory),
  license: z.string().min(2).max(40).default("MIT"),
  impactSummary: z.string().max(2000).optional(),
  masterPrompt: z.string().min(20).max(4000),
  masterAcceptance: z.string().min(10).max(2000),
  subtasksJson: z.string().optional(),
});

const subtaskSchema = z.array(
  z.object({
    title: z.string().min(3).max(120),
    prompt: z.string().min(10).max(4000),
    acceptanceCriteria: z.string().min(5).max(2000),
    estimatedTokens: z.number().int().min(0).max(10_000_000).default(5000),
  })
);

function alignmentPreCheck(title: string, description: string, license: string) {
  const text = `${title} ${description}`.toLowerCase();
  const banned = ["steal", "malware for hire", "surveillance of civilians", "weaponize"];
  const hit = banned.find((b) => text.includes(b));
  if (hit) {
    return {
      ok: false as const,
      message: `FAIL: blocked pattern near "${hit}". GrokForge is greater-good only.`,
    };
  }
  if (!license || license.length < 2) {
    return { ok: false as const, message: "FAIL: open license commitment required." };
  }
  return {
    ok: true as const,
    message: `PASS: greater-good intent signals OK; open license "${license}" committed. Human moderation may still review.`,
  };
}

export async function createProjectAction(formData: FormData) {
  let user;
  try {
    user = await requireXUser();
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "X_AUTH_REQUIRED") {
      return {
        error:
          "Sign in with X is required to propose projects. Email-only accounts can browse and donate, not propose.",
      };
    }
    return { error: "Sign in required" };
  }
  const rl = await rateLimitAsync(`create-project:${user.id}`, { limit: 20, windowMs: 60 * 60 * 1000 });
  if (!rl.ok) return { error: `Rate limit: try again in ${rl.retryAfterSec}s` };
  const raw = {

    title: String(formData.get("title") || ""),
    description: String(formData.get("description") || ""),
    category: String(formData.get("category") || "OTHER"),
    license: String(formData.get("license") || "MIT"),
    impactSummary: String(formData.get("impactSummary") || ""),
    masterPrompt: String(formData.get("masterPrompt") || ""),
    masterAcceptance: String(formData.get("masterAcceptance") || ""),
    subtasksJson: String(formData.get("subtasksJson") || "[]"),
  };

  const parsed = projectSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.flatten().formErrors.join("; ") || "Invalid project" };
  }

  const data = parsed.data;
  const check = alignmentPreCheck(data.title, data.description, data.license);
  if (!check.ok) return { error: check.message };

  let subtasks: z.infer<typeof subtaskSchema> = [];
  try {
    subtasks = subtaskSchema.parse(JSON.parse(data.subtasksJson || "[]"));
  } catch {
    return { error: "Subtasks JSON invalid" };
  }

  const leak = rejectSecretPaste(
    [
      data.title,
      data.description,
      data.impactSummary || "",
      data.masterPrompt,
      data.masterAcceptance,
      ...subtasks.flatMap((t) => [t.title, t.prompt, t.acceptanceCriteria]),
    ].join("\n")
  );
  if (leak) return leak;

  let slug = slugify(data.title);
  if (!slug) slug = `project-${Date.now()}`;
  const existing = await prisma.project.findUnique({ where: { slug } });
  if (existing) slug = `${slug}-${Date.now().toString(36)}`;

  // No USD fundraising goal - progress is accepted tasks / open-license ship.
  const fundingGoalCents = 0;

  // Optional user banner upload (wins over auto-Imagine)
  let bannerUrl: string | null = null;
  let bannerSource: string | null = null;
  const bannerFile = getBannerFile(formData);
  if (bannerFile) {
    const stored = await storeUploadedBanner(
      bannerFile,
      `${user.id}/new-${Date.now().toString(36)}`
    );
    if (!stored.ok) return { error: stored.error };
    bannerUrl = stored.url;
    bannerSource = stored.source;
  }

  const wantImagine =
    !bannerUrl &&
    (formData.get("autoImagineBanner") === "1" ||
      formData.get("autoImagineBanner") === "on");

  const project = await prisma.project.create({
    data: {
      slug,
      title: data.title,
      description: data.description,
      category: data.category,
      license: data.license,
      fundingGoalCents,
      impactSummary: data.impactSummary || null,
      alignmentCheck: check.message,
      bannerUrl,
      bannerSource,
      proposerId: user.id,
      fundPots: {
        create: [
          {
            type: FundType.API_CREDITS,
            label: "API / token credits (compute)",
            balanceCents: 0,
          },
          {
            type: FundType.SUPERGROK_SPONSOR,
            label: "SuperGrok sponsorship for builders",
            balanceCents: 0,
          },
          {
            type: FundType.COMPUTE,
            label: "Compute pool",
            balanceCents: 0,
          },
        ],
      },
      milestones: {
        create: [
          {
            title: "Kickoff deliverable",
            description: "First accepted hierarchical batch of tasks.",
            targetCents: 0,
            sortOrder: 0,
          },
          {
            title: "Midpoint review",
            description: "Peer-reviewed contributions cover core goals.",
            targetCents: 0,
            sortOrder: 1,
          },
          {
            title: "Open release",
            description: "Artifacts published under committed open license.",
            targetCents: 0,
            sortOrder: 2,
          },
        ],
      },
    },
  });

  const root = await prisma.task.create({
    data: {
      projectId: project.id,
      title: `Master goal: ${data.title}`,
      prompt: data.masterPrompt,
      acceptanceCriteria: data.masterAcceptance,
      estimatedTokens: subtasks.reduce((s, t) => s + (t.estimatedTokens || 0), 5000),
      sortOrder: 0,
    },
  });

  if (subtasks.length) {
    await prisma.task.createMany({
      data: subtasks.map((t, i) => ({
        projectId: project.id,
        parentId: root.id,
        title: t.title,
        prompt: t.prompt,
        acceptanceCriteria: t.acceptanceCriteria,
        estimatedTokens: t.estimatedTokens || 5000,
        sortOrder: i + 1,
      })),
    });
  }

  await prisma.ledgerEntry.create({
    data: {
      projectId: project.id,
      kind: LedgerKind.ADJUSTMENT,
      amountCents: 0,
      summary: `Project created by @${user.handle || user.name}`,
      actorHandle: user.handle,
    },
  });

  revalidatePath("/projects");
  revalidatePath(`/projects/${project.slug}`);
  // Async Imagine after redirect keeps create snappy; client kicks generate
  const qs = wantImagine ? "?banner=gen" : "";
  redirect(`/projects/${project.slug}${qs}`);
}

/** Creator: generate or regenerate project banner via Grok Imagine. */
export async function generateProjectBannerAction(projectId: string) {
  try {
    const user = await requireUser();
    const rl = await rateLimitAsync(`banner-imagine:${user.id}`, {
      limit: 8,
      windowMs: 60 * 60 * 1000,
    });
    if (!rl.ok) {
      return { error: `Rate limit: try again in ${rl.retryAfterSec}s` };
    }

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: {
        id: true,
        slug: true,
        title: true,
        description: true,
        category: true,
        impactSummary: true,
        proposerId: true,
        status: true,
      },
    });
    if (!project) return { error: "Project not found" };
    if (project.proposerId !== user.id) {
      return { error: "Only the creator can generate a banner" };
    }
    if (project.status === "ARCHIVED") {
      return { error: "Restore the project before generating a banner" };
    }

    const stored = await generateImagineBanner({
      title: project.title,
      description: project.description,
      category: project.category,
      impactSummary: project.impactSummary,
      pathHint: `${user.id}/${project.id}`,
    });
    if (!stored.ok) return { error: stored.error };

    await prisma.project.update({
      where: { id: project.id },
      data: {
        bannerUrl: stored.url,
        bannerSource: stored.source,
      },
    });
    await prisma.ledgerEntry.create({
      data: {
        projectId: project.id,
        kind: LedgerKind.ADJUSTMENT,
        amountCents: 0,
        summary: `@${user.handle || user.name} set project banner via Grok Imagine`,
        actorHandle: user.handle,
      },
    });

    revalidatePath(`/projects/${project.slug}`);
    revalidatePath("/projects");
    revalidatePath("/");
    revalidatePath("/dashboard");
    return { ok: true as const };
  } catch (e) {
    console.error("[generateProjectBannerAction]", e);
    return { error: "Banner generation failed" };
  }
}

/** Creator: clear banner. */
export async function clearProjectBannerAction(projectId: string) {
  try {
    const user = await requireUser();
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, slug: true, proposerId: true },
    });
    if (!project) return { error: "Project not found" };
    if (project.proposerId !== user.id) {
      return { error: "Only the creator can remove the banner" };
    }

    await prisma.project.update({
      where: { id: project.id },
      data: { bannerUrl: null, bannerSource: null },
    });
    revalidatePath(`/projects/${project.slug}`);
    revalidatePath("/projects");
    revalidatePath("/");
    return { ok: true as const };
  } catch (e) {
    console.error("[clearProjectBannerAction]", e);
    return { error: "Could not clear banner" };
  }
}

/** Creator: upload a custom banner image (project page quick action). */
export async function uploadProjectBannerAction(formData: FormData) {
  try {
    const user = await requireUser();
    const rl = await rateLimitAsync(`banner-upload:${user.id}`, {
      limit: 20,
      windowMs: 60 * 60 * 1000,
    });
    if (!rl.ok) {
      return { error: `Rate limit: try again in ${rl.retryAfterSec}s` };
    }

    const projectId = String(formData.get("projectId") || "");
    if (!projectId) return { error: "Missing project" };

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, slug: true, proposerId: true, status: true },
    });
    if (!project) return { error: "Project not found" };
    if (project.proposerId !== user.id) {
      return { error: "Only the creator can upload a banner" };
    }
    if (project.status === "ARCHIVED") {
      return { error: "Restore the project before uploading a banner" };
    }

    const bannerFile = getBannerFile(formData);
    if (!bannerFile) {
      return { error: "Choose a JPEG, PNG, or WebP image first." };
    }

    const stored = await storeUploadedBanner(
      bannerFile,
      `${user.id}/${project.id}`
    );
    if (!stored.ok) return { error: stored.error };

    await prisma.project.update({
      where: { id: project.id },
      data: {
        bannerUrl: stored.url,
        bannerSource: stored.source,
      },
    });
    await prisma.ledgerEntry.create({
      data: {
        projectId: project.id,
        kind: LedgerKind.ADJUSTMENT,
        amountCents: 0,
        summary: `@${user.handle || user.name} uploaded a custom project banner`,
        actorHandle: user.handle,
      },
    });

    revalidatePath(`/projects/${project.slug}`);
    revalidatePath("/projects");
    revalidatePath("/");
    revalidatePath("/dashboard");
    return { ok: true as const };
  } catch (e) {
    console.error("[uploadProjectBannerAction]", e);
    return { error: "Banner upload failed" };
  }
}

export async function claimTaskAction(taskId: string) {
  const user = await requireUser();
  const { claimTaskForUser } = await import("@/lib/task-ops");
  const res = await claimTaskForUser(user, taskId);
  if ("error" in res) return { error: res.error };
  return { ok: true as const };
}

export async function cancelClaimAction(taskId: string) {
  const user = await requireUser();
  const { releaseClaimForUser } = await import("@/lib/task-ops");
  const res = await releaseClaimForUser(user, taskId);
  if ("error" in res) return { error: res.error };
  return { ok: true as const };
}

const editProjectSchema = z.object({
  projectId: z.string().min(1),
  title: z.string().min(5).max(120),
  description: z.string().min(40).max(8000),
  impactSummary: z.string().max(2000).optional(),
  license: z.string().min(2).max(40),
});

/**
 * Creator-only edit of public project name (title) + description after publish.
 * Allowed for ACTIVE / FUNDED / COMPLETED / DRAFT. Blocked only when ARCHIVED.
 * Slug is never changed (stable public URL).
 */
export async function updateProjectAction(formData: FormData) {
  const user = await requireUser();
  const rl = await rateLimitAsync(`edit-project:${user.id}`, {
    limit: 30,
    windowMs: 60 * 60 * 1000,
  });
  if (!rl.ok) return { error: `Rate limit: try again in ${rl.retryAfterSec}s` };

  const parsed = editProjectSchema.safeParse({
    projectId: String(formData.get("projectId") || ""),
    title: String(formData.get("title") || "").trim(),
    description: String(formData.get("description") || "").trim(),
    impactSummary: String(formData.get("impactSummary") || "").trim(),
    license: String(formData.get("license") || "MIT").trim(),
  });
  if (!parsed.success) {
    return {
      error:
        parsed.error.flatten().formErrors.join("; ") ||
        "Invalid fields (title 5-120, description 40-8000)",
    };
  }

  const project = await prisma.project.findUnique({
    where: { id: parsed.data.projectId },
  });
  if (!project) return { error: "Project not found" };
  if (project.proposerId !== user.id) {
    return { error: "Only the project creator can edit the name and description" };
  }
  if (project.status === "ARCHIVED") {
    return { error: "Restore the project before editing" };
  }

  const leak = rejectSecretPaste(
    `${parsed.data.title}\n${parsed.data.description}\n${parsed.data.impactSummary || ""}`
  );
  if (leak) return leak;

  const check = alignmentPreCheck(
    parsed.data.title,
    parsed.data.description,
    parsed.data.license
  );
  if (!check.ok) return { error: check.message };

  const clearBanner = formData.get("clearBanner") === "1";
  const bannerFile = getBannerFile(formData);
  let bannerPatch: { bannerUrl?: string | null; bannerSource?: string | null } =
    {};
  if (clearBanner) {
    bannerPatch = { bannerUrl: null, bannerSource: null };
  } else if (bannerFile) {
    const stored = await storeUploadedBanner(
      bannerFile,
      `${user.id}/${project.id}`
    );
    if (!stored.ok) return { error: stored.error };
    bannerPatch = { bannerUrl: stored.url, bannerSource: stored.source };
  }

  const titleChanged = project.title !== parsed.data.title;
  const descChanged = project.description !== parsed.data.description;
  const impactChanged =
    (project.impactSummary || "") !== (parsed.data.impactSummary || "");
  const licenseChanged = project.license !== parsed.data.license;

  await prisma.project.update({
    where: { id: project.id },
    data: {
      title: parsed.data.title,
      description: parsed.data.description,
      impactSummary: parsed.data.impactSummary || null,
      license: parsed.data.license,
      alignmentCheck: check.message,
      ...bannerPatch,
    },
  });

  // Keep master-goal task title in sync when creator renames the project
  if (titleChanged) {
    const root = await prisma.task.findFirst({
      where: { projectId: project.id, parentId: null },
      orderBy: { sortOrder: "asc" },
      select: { id: true, title: true },
    });
    if (root && /^Master goal:/i.test(root.title)) {
      await prisma.task.update({
        where: { id: root.id },
        data: { title: `Master goal: ${parsed.data.title}` },
      });
    }
  }

  const who = user.handle || user.name || "creator";
  let summary = `@${who} updated project name/description`;
  if (titleChanged && descChanged) {
    summary = `@${who} updated project name and description`;
  } else if (titleChanged) {
    summary = `@${who} renamed project to "${parsed.data.title.slice(0, 80)}"`;
  } else if (descChanged) {
    summary = `@${who} updated project description`;
  }
  if (bannerFile) summary += " + banner";
  if (clearBanner) summary += " (banner removed)";

  const { recordProjectEdit } = await import("@/lib/edit-history");
  if (titleChanged) {
    await recordProjectEdit({
      projectId: project.id,
      actorId: user.id,
      actorHandle: user.handle,
      field: "title",
      oldValue: project.title,
      newValue: parsed.data.title,
      summary: `Title → ${parsed.data.title.slice(0, 120)}`,
    });
  }
  if (descChanged) {
    await recordProjectEdit({
      projectId: project.id,
      actorId: user.id,
      actorHandle: user.handle,
      field: "description",
      oldValue: project.description.slice(0, 500),
      newValue: parsed.data.description.slice(0, 500),
      summary: "Description updated",
    });
  }
  if (impactChanged) {
    await recordProjectEdit({
      projectId: project.id,
      actorId: user.id,
      actorHandle: user.handle,
      field: "impact",
      oldValue: project.impactSummary,
      newValue: parsed.data.impactSummary || null,
      summary: "Impact summary updated",
    });
  }
  if (licenseChanged) {
    await recordProjectEdit({
      projectId: project.id,
      actorId: user.id,
      actorHandle: user.handle,
      field: "license",
      oldValue: project.license,
      newValue: parsed.data.license,
      summary: `License → ${parsed.data.license}`,
    });
  }
  if (bannerFile || clearBanner) {
    await recordProjectEdit({
      projectId: project.id,
      actorId: user.id,
      actorHandle: user.handle,
      field: "banner",
      summary: clearBanner ? "Banner removed" : "Banner updated",
    });
  }

  await prisma.ledgerEntry.create({
    data: {
      projectId: project.id,
      kind: LedgerKind.ADJUSTMENT,
      amountCents: 0,
      summary,
      actorHandle: user.handle,
    },
  });

  revalidatePath(`/projects/${project.slug}`);
  revalidatePath(`/u/${user.handle || ""}`);
  revalidatePath("/projects");
  revalidatePath("/dashboard");
  revalidatePath("/");
  return { ok: true as const };
}

export async function submitContributionAction(formData: FormData) {
  try {
    const user = await requireUser();
    const { submitContributionForUser } = await import("@/lib/task-ops");
    const res = await submitContributionForUser(user, {
      taskId: String(formData.get("taskId") || ""),
      body: String(formData.get("body") || ""),
      sources: String(formData.get("sources") || ""),
      contentType: String(formData.get("contentType") || "markdown"),
    });
    if ("error" in res) return { error: res.error };
    return { ok: true, contributionId: res.contributionId };
  } catch (e) {
    console.error("[submitContributionAction]", e);
    const msg = e instanceof Error ? e.message : "Submit failed";
    return { error: msg.slice(0, 300) };
  }
}

/**
 * Seal & Ship: proposer (or founder) seals a COMPLETED project into a downloadable package.
 */
export async function sealProjectAction(formData: FormData) {
  try {
    const user = await requireUser();
    const projectId = String(formData.get("projectId") || "");
    const sealNote = String(formData.get("sealNote") || "");
    const leak = rejectSecretPaste(sealNote);
    if (leak) return leak;
    const version = String(formData.get("version") || "v1.0.0");
    const packageTitle = String(formData.get("packageTitle") || "").trim() || undefined;
    const { sealProjectForUser } = await import("@/lib/seal-ops");
    const res = await sealProjectForUser(
      { id: user.id, handle: user.handle, name: user.name },
      { projectId, sealNote, version, packageTitle },
      { via: "ui", founderOverride: true }
    );
    if ("error" in res) return { error: res.error };
    return {
      ok: true as const,
      artifactId: res.artifactId,
      version: res.version,
      contentHash: res.contentHash,
      shipPath: res.shipPath,
      downloadPath: res.downloadPath,
    };
  } catch (e) {
    console.error("[sealProjectAction]", e);
    return {
      error: e instanceof Error ? e.message.slice(0, 300) : "Seal failed",
    };
  }
}

/** Founder/admin: push sealed package to org GitHub (GITHUB_PUBLISH_TOKEN). */
export async function publishToGitHubAction(formData: FormData) {
  try {
    const user = await requireUser();
    const projectId = String(formData.get("projectId") || "");
    const repoName =
      String(formData.get("repoName") || "").trim() || undefined;
    const { publishSealedToGitHubForUser } = await import(
      "@/lib/github-ship-ops"
    );
    const res = await publishSealedToGitHubForUser(
      { id: user.id, handle: user.handle, name: user.name },
      { projectId, repoName },
      { via: "ui" }
    );
    if ("error" in res) return { error: res.error };
    return {
      ok: true as const,
      htmlUrl: res.htmlUrl,
      fullName: res.fullName,
      commitSha: res.commitSha,
      created: res.created,
      artifactId: res.artifactId,
    };
  } catch (e) {
    console.error("[publishToGitHubAction]", e);
    return {
      error: e instanceof Error ? e.message.slice(0, 300) : "GitHub publish failed",
    };
  }
}

export async function createAgentTokenAction(formData: FormData) {
  try {
    const user = await requireUser();
    const rl = await rateLimitAsync(`create-token:${user.id}`, {
      limit: 10,
      windowMs: 60 * 60 * 1000,
    });
    if (!rl.ok) return { error: `Rate limit: try again in ${rl.retryAfterSec}s` };

    const name = String(formData.get("name") || "Grok Build");
    const daysRaw = String(formData.get("expiresInDays") || "90");
    let expiresInDays: number | null = 90;
    if (daysRaw === "never" || daysRaw === "0") expiresInDays = null;
    else {
      const n = Number(daysRaw);
      if (!Number.isFinite(n) || n < 1 || n > 365) {
        return { error: "expiresInDays must be 1-365 or never" };
      }
      expiresInDays = n;
    }

    const elevated = String(formData.get("elevated") || "") === "1";
    const {
      createApiToken,
      DEFAULT_SCOPES,
      FOUNDER_ELEVATED_SCOPES,
    } = await import("@/lib/api-tokens");
    const { isFounderHandle } = await import("@/lib/identity");
    if (elevated && !isFounderHandle(user.handle)) {
      return { error: "Elevated founder tokens are only available to the founder" };
    }
    const created = await createApiToken({
      userId: user.id,
      name: elevated ? `${name} (founder elevated)`.slice(0, 80) : name,
      expiresInDays,
      scopes: elevated ? [...FOUNDER_ELEVATED_SCOPES] : [...DEFAULT_SCOPES],
      actorHandle: user.handle,
    });
    revalidatePath("/dashboard");
    return {
      ok: true as const,
      token: created.token,
      id: created.id,
      tokenPrefix: created.tokenPrefix,
      expiresAt: created.expiresAt?.toISOString() ?? null,
      name: created.name,
      scopes: created.scopes,
      elevated: elevated || false,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Create token failed";
    return { error: msg.slice(0, 300) };
  }
}

export async function revokeAgentTokenAction(tokenId: string) {
  try {
    const user = await requireUser();
    const { revokeApiToken } = await import("@/lib/api-tokens");
    const res = await revokeApiToken(user.id, tokenId);
    if ("error" in res) return { error: res.error };
    revalidatePath("/dashboard");
    return { ok: true as const };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Revoke failed";
    return { error: msg.slice(0, 300) };
  }
}

const scoreField = z.coerce.number().int().min(1).max(5);
const noteField = z.string().max(1000).optional();

/**
 * Upsert official weighted ranking scorecard for a project.
 * Creator or founder only. Total = sum(score * weight), max 5.00.
 */
export async function saveProjectScorecardAction(formData: FormData) {
  try {
    const user = await requireUser();
    const rl = await rateLimitAsync(`scorecard:${user.id}`, {
      limit: 40,
      windowMs: 60 * 60 * 1000,
    });
    if (!rl.ok) return { error: `Rate limit: try again in ${rl.retryAfterSec}s` };

    const projectId = String(formData.get("projectId") || "");
    if (!projectId) return { error: "Missing project" };

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, slug: true, proposerId: true, title: true },
    });
    if (!project) return { error: "Project not found" };

    const { isFounderHandle } = await import("@/lib/identity");
    const canEdit =
      project.proposerId === user.id || isFounderHandle(user.handle);
    if (!canEdit) {
      return { error: "Only the project creator or founder can set the ranking scorecard" };
    }

    const parsed = z
      .object({
        strategicAlignment: scoreField,
        technicalFeasibility: scoreField,
        businessValue: scoreField,
        effortDemand: scoreField,
        riskUncertainty: scoreField,
        timeSensitivity: scoreField,
        strategicNote: noteField,
        technicalNote: noteField,
        businessNote: noteField,
        effortNote: noteField,
        riskNote: noteField,
        timeNote: noteField,
      })
      .safeParse({
        strategicAlignment: formData.get("strategicAlignment"),
        technicalFeasibility: formData.get("technicalFeasibility"),
        businessValue: formData.get("businessValue"),
        effortDemand: formData.get("effortDemand"),
        riskUncertainty: formData.get("riskUncertainty"),
        timeSensitivity: formData.get("timeSensitivity"),
        strategicNote: String(formData.get("strategicNote") || ""),
        technicalNote: String(formData.get("technicalNote") || ""),
        businessNote: String(formData.get("businessNote") || ""),
        effortNote: String(formData.get("effortNote") || ""),
        riskNote: String(formData.get("riskNote") || ""),
        timeNote: String(formData.get("timeNote") || ""),
      });

    if (!parsed.success) {
      return { error: "Each criterion needs a score from 1 to 5" };
    }

    const leak = rejectSecretPaste(
      [
        parsed.data.strategicNote || "",
        parsed.data.technicalNote || "",
        parsed.data.businessNote || "",
        parsed.data.effortNote || "",
        parsed.data.riskNote || "",
        parsed.data.timeNote || "",
      ].join("\n")
    );
    if (leak) return leak;

    const { computeRankingTotal } = await import("@/lib/project-ranking");
    const d = parsed.data;
    const totalScore = computeRankingTotal({
      strategicAlignment: d.strategicAlignment,
      technicalFeasibility: d.technicalFeasibility,
      businessValue: d.businessValue,
      effortDemand: d.effortDemand,
      riskUncertainty: d.riskUncertainty,
      timeSensitivity: d.timeSensitivity,
    });

    const note = (s?: string) => {
      const t = (s || "").trim();
      return t.length ? t.slice(0, 1000) : null;
    };

    await prisma.projectScorecard.upsert({
      where: { projectId: project.id },
      create: {
        projectId: project.id,
        scorerId: user.id,
        strategicAlignment: d.strategicAlignment,
        technicalFeasibility: d.technicalFeasibility,
        businessValue: d.businessValue,
        effortDemand: d.effortDemand,
        riskUncertainty: d.riskUncertainty,
        timeSensitivity: d.timeSensitivity,
        strategicNote: note(d.strategicNote),
        technicalNote: note(d.technicalNote),
        businessNote: note(d.businessNote),
        effortNote: note(d.effortNote),
        riskNote: note(d.riskNote),
        timeNote: note(d.timeNote),
        totalScore,
      },
      update: {
        scorerId: user.id,
        strategicAlignment: d.strategicAlignment,
        technicalFeasibility: d.technicalFeasibility,
        businessValue: d.businessValue,
        effortDemand: d.effortDemand,
        riskUncertainty: d.riskUncertainty,
        timeSensitivity: d.timeSensitivity,
        strategicNote: note(d.strategicNote),
        technicalNote: note(d.technicalNote),
        businessNote: note(d.businessNote),
        effortNote: note(d.effortNote),
        riskNote: note(d.riskNote),
        timeNote: note(d.timeNote),
        totalScore,
      },
    });

    await prisma.ledgerEntry.create({
      data: {
        projectId: project.id,
        kind: LedgerKind.ADJUSTMENT,
        amountCents: 0,
        summary: `@${user.handle || user.name} set ranking scorecard to ${totalScore.toFixed(2)}/5.00`,
        actorHandle: user.handle,
        meta: JSON.stringify({ totalScore }),
      },
    });

    revalidatePath(`/projects/${project.slug}`);
    revalidatePath("/projects");
    revalidatePath("/rankings");
    revalidatePath("/");
    return { ok: true as const, totalScore };
  } catch (e) {
    console.error("[saveProjectScorecardAction]", e);
    const msg = e instanceof Error ? e.message : "Save scorecard failed";
    return { error: msg.slice(0, 300) };
  }
}

export async function reviewContributionAction(
  contributionId: string,
  score: number,
  notes: string
) {
  try {
    const user = await requireUser();
    const leak = rejectSecretPaste(notes || "");
    if (leak) return leak;
    const { peerReviewContributionForUser } = await import(
      "@/lib/peer-review-ops"
    );
    const res = await peerReviewContributionForUser(
      { id: user.id, handle: user.handle, name: user.name },
      contributionId,
      score,
      notes,
      { via: "ui" }
    );
    if ("error" in res) return { error: res.error };
    return { ok: true, accepted: res.accepted, avg: res.avg };
  } catch (e) {
    console.error("[reviewContributionAction]", e);
    return {
      error: e instanceof Error ? e.message.slice(0, 300) : "Review failed",
    };
  }
}

/**
 * Project creator accept/reject of a pending submission.
 * Allows creators to clear the queue even for their own submissions
 * (peer review still preferred when another builder is available).
 * Founders can also moderate via elevated Agent API (see moderation-ops).
 */
export async function creatorModerateContributionAction(
  contributionId: string,
  decision: "accept" | "reject",
  notes?: string
) {
  try {
    const user = await requireUser();
    const { moderateContributionForUser } = await import("@/lib/moderation-ops");
    const res = await moderateContributionForUser(
      { id: user.id, handle: user.handle, name: user.name },
      contributionId,
      decision,
      notes,
      { via: "ui", founderOverride: true }
    );
    if ("error" in res) return { error: res.error };
    return { ok: true, accepted: res.accepted };
  } catch (e) {
    console.error("[creatorModerateContributionAction]", e);
    return { error: e instanceof Error ? e.message.slice(0, 300) : "Moderation failed" };
  }
}

/**
 * Project creator (or founder via shared ops): accept all PENDING submissions.
 */
export async function creatorBulkAcceptPendingAction(projectId: string) {
  try {
    const user = await requireUser();
    const { bulkAcceptPendingForUser } = await import("@/lib/moderation-ops");
    const res = await bulkAcceptPendingForUser(
      { id: user.id, handle: user.handle, name: user.name },
      projectId,
      { via: "ui", founderOverride: true }
    );
    if ("error" in res) return { error: res.error };
    return {
      ok: true,
      accepted: res.accepted,
      skipped: res.skipped,
      skippedReasons: res.skippedReasons,
    };
  } catch (e) {
    console.error("[creatorBulkAcceptPendingAction]", e);
    return {
      error: e instanceof Error ? e.message.slice(0, 300) : "Bulk accept failed",
    };
  }
}

export async function demoDonateAction(formData: FormData) {
  const user = await requireUser();
  const rl = await rateLimitAsync(`donate:${user.id}`, { limit: 30, windowMs: 60 * 60 * 1000 });
  if (!rl.ok) return { error: `Rate limit: try again in ${rl.retryAfterSec}s` };
  const projectId = String(formData.get("projectId") || "");

  const potId = String(formData.get("potId") || "");
  const amountUsd = Number(formData.get("amountUsd") || 0);
  const message = String(formData.get("message") || "");
  const leak = rejectSecretPaste(message);
  if (leak) return leak;

  if (!projectId || !potId || amountUsd < 1) {
    return { error: "Pick a pot and amount of at least $1" };
  }

  const amountCents = Math.round(amountUsd * 100);
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) return { error: "Project not found" };

  const pot = await prisma.fundPot.findFirst({
    where: { id: potId, projectId },
  });
  if (!pot) return { error: "Fund pot not found" };

  // If Stripe is configured, create a Checkout Session (client should redirect).
  // Prefer dedicated Price IDs per pot type when env is set (see stripe-prices.ts).
  if (process.env.STRIPE_SECRET_KEY) {
    const Stripe = (await import("stripe")).default;
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const origin = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const { buildCheckoutLineItem } = await import("@/lib/stripe-prices");
    const lineItem = buildCheckoutLineItem({
      potType: pot.type,
      amountCents,
      productName: `GrokForge: ${project.title} (${pot.label})`,
      productDescription:
        message ||
        (pot.type === "API_CREDITS"
          ? "API / token credits for builders"
          : pot.type === "SUPERGROK_SPONSOR"
            ? "SuperGrok capacity sponsorship"
            : pot.type === "COMPUTE"
              ? "Shared community compute pool"
              : "Greater-good project fund"),
    });
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [lineItem],
      success_url: `${origin}/projects/${project.slug}?donated=1`,
      cancel_url: `${origin}/projects/${project.slug}?canceled=1`,
      metadata: {
        kind: "pot_donation",
        projectId,
        potId,
        potType: pot.type,
        donorId: user.id,
        message: message.slice(0, 400),
      },
    });
    if (session.url) {
      redirect(session.url);
    }
    return { error: "Stripe session missing URL" };
  }

  // Reload project matching fields
  const fullProject = await prisma.project.findUnique({
    where: { id: projectId },
    select: {
      id: true,
      slug: true,
      title: true,
      proposerId: true,
      matchingEnabled: true,
      matchingRatioBps: true,
      matchingRemainingCents: true,
    },
  });
  if (!fullProject) return { error: "Project not found" };

  const { computeMatch } = await import("@/lib/matching-funds");
  const match = computeMatch({
    donationCents: amountCents,
    matchingEnabled: fullProject.matchingEnabled,
    matchingRatioBps: fullProject.matchingRatioBps,
    matchingRemainingCents: fullProject.matchingRemainingCents,
  });

  await prisma.$transaction(async (tx) => {
    await tx.donation.create({
      data: {
        projectId,
        potId,
        donorId: user.id,
        amountCents,
        publicName: user.handle ? `@${user.handle}` : user.name,
        message: message || null,
        stripeSessionId: `demo_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      },
    });
    await tx.fundPot.update({
      where: { id: potId },
      data: { balanceCents: { increment: amountCents } },
    });
    await tx.ledgerEntry.create({
      data: {
        projectId,
        kind: LedgerKind.CAPITAL,
        amountCents,
        summary: `${user.handle ? `@${user.handle}` : user.name} donated $${amountUsd.toFixed(2)} to ${pot.label}`,
        actorHandle: user.handle,
      },
    });
    await tx.user.update({
      where: { id: user.id },
      data: { reputation: { increment: 2 } },
    });
    if (match.matchCents > 0) {
      await tx.project.update({
        where: { id: projectId },
        data: {
          matchingRemainingCents: { decrement: match.matchCents },
        },
      });
      await tx.fundPot.update({
        where: { id: potId },
        data: { balanceCents: { increment: match.matchCents } },
      });
      await tx.ledgerEntry.create({
        data: {
          projectId,
          kind: LedgerKind.CAPITAL,
          amountCents: match.matchCents,
          summary: `Matching funds (${match.ratioLabel}): +$${(match.matchCents / 100).toFixed(2)} to ${pot.label} after @${user.handle || "donor"} gift`,
          actorHandle: "matching-pool",
          meta: JSON.stringify({
            matching: true,
            ratioBps: fullProject.matchingRatioBps,
            donorId: user.id,
            baseDonationCents: amountCents,
          }),
        },
      });
    }
  });

  if (fullProject.proposerId !== user.id) {
    await notifyUser({
      userId: fullProject.proposerId,
      type: "DONATION",
      title: `Support on ${fullProject.title}`,
      body: `${user.handle ? `@${user.handle}` : "Someone"} donated $${amountUsd.toFixed(2)} to ${pot.label}${
        match.matchCents > 0
          ? ` (+$${(match.matchCents / 100).toFixed(2)} matched)`
          : ""
      }`,
      href: `/projects/${fullProject.slug}`,
    });
  }
  await notifyProjectWatchers({
    projectId: fullProject.id,
    excludeUserIds: [user.id, fullProject.proposerId],
    type: "WATCH_DONATION",
    title: `Watched: ${fullProject.title}`,
    body: `${user.handle ? `@${user.handle}` : "Someone"} donated $${amountUsd.toFixed(2)} to ${pot.label}${
      match.matchCents > 0
        ? ` (+$${(match.matchCents / 100).toFixed(2)} matched)`
        : ""
    }`,
    href: `/projects/${fullProject.slug}`,
  });

  revalidatePath(`/projects/${fullProject.slug}`);
  return {
    ok: true as const,
    matchedCents: match.matchCents,
  };
}

/** Creator/founder: toggle matching + set ratio (+ optional dual-key). */
export async function setMatchingFundsAction(formData: FormData) {
  try {
    const user = await requireUser();
    const projectId = String(formData.get("projectId") || "");
    const enabled = String(formData.get("enabled") || "") === "1";
    const ratioBps = Number(formData.get("ratioBps") || 10000);
    const dualRaw = formData.get("requireDualKey");
    const thresholdRaw = formData.get("dualKeyTokenThreshold");
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, slug: true, proposerId: true },
    });
    if (!project) return { error: "Project not found" };
    const { isFounderHandle } = await import("@/lib/identity");
    if (project.proposerId !== user.id && !isFounderHandle(user.handle)) {
      return { error: "Only creator or founder can configure matching" };
    }
    const { clampRatioBps } = await import("@/lib/matching-funds");
    const data: {
      matchingEnabled: boolean;
      matchingRatioBps: number;
      requireDualKey?: boolean;
      dualKeyTokenThreshold?: number;
    } = {
      matchingEnabled: enabled,
      matchingRatioBps: clampRatioBps(ratioBps),
    };
    if (dualRaw !== null && dualRaw !== undefined && String(dualRaw) !== "") {
      data.requireDualKey = String(dualRaw) === "1";
    }
    if (thresholdRaw !== null && thresholdRaw !== undefined && String(thresholdRaw) !== "") {
      const t = Math.max(0, Math.min(10_000_000, Number(thresholdRaw) || 50000));
      data.dualKeyTokenThreshold = t;
    }
    await prisma.project.update({
      where: { id: projectId },
      data,
    });
    await prisma.ledgerEntry.create({
      data: {
        projectId,
        kind: LedgerKind.ADJUSTMENT,
        amountCents: 0,
        summary: `@${user.handle || user.name} set matching funds ${enabled ? "ON" : "OFF"} (${clampRatioBps(ratioBps)} bps)${
          data.requireDualKey != null
            ? `; dual-key ${data.requireDualKey ? "ON" : "OFF"}`
            : ""
        }`,
        actorHandle: user.handle,
        meta: JSON.stringify({
          matchingConfig: true,
          enabled,
          ratioBps: clampRatioBps(ratioBps),
          requireDualKey: data.requireDualKey,
          dualKeyTokenThreshold: data.dualKeyTokenThreshold,
        }),
      },
    });
    revalidatePath(`/projects/${project.slug}`);
    revalidatePath(`/projects/${project.slug}/cockpit`);
    revalidatePath("/cockpit");
    return { ok: true as const };
  } catch (e) {
    return {
      error: e instanceof Error ? e.message.slice(0, 300) : "Matching config failed",
    };
  }
}

/**
 * Any signed-in user: fund matching pool on any live project.
 * Stripe Checkout when configured; otherwise transparent demo ledger credit.
 */
export async function fundMatchingPoolAction(formData: FormData) {
  try {
    const user = await requireUser();
    const projectId = String(formData.get("projectId") || "");
    const amountUsd = Number(formData.get("amountUsd") || 0);
    if (!Number.isFinite(amountUsd) || amountUsd < 1) {
      return { error: "Amount must be at least $1" };
    }
    if (amountUsd > 100_000) return { error: "Amount too large (max $100,000)" };
    const amountCents = Math.round(amountUsd * 100);
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, slug: true, status: true, title: true },
    });
    if (!project) return { error: "Project not found" };
    if (project.status === "ARCHIVED") {
      return { error: "Cannot fund matching pool on an archived project" };
    }

    const rl = await rateLimitAsync(`fund-match:${user.id}`, {
      limit: 40,
      windowMs: 60 * 60 * 1000,
    });
    if (!rl.ok) {
      return { error: `Rate limit: try again in ${rl.retryAfterSec}s` };
    }

    // Real money path
    if (process.env.STRIPE_SECRET_KEY) {
      const Stripe = (await import("stripe")).default;
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
      const origin = process.env.NEXTAUTH_URL || "http://localhost:3000";
      const { buildCheckoutLineItem } = await import("@/lib/stripe-prices");
      const lineItem = buildCheckoutLineItem({
        potType: "MATCHING_POOL",
        amountCents,
        productName: `GrokForge match pool: ${project.title}`,
        productDescription:
          "Matching funds budget - amplifies community compute/pot gifts (labor stays primary)",
      });
      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        line_items: [lineItem],
        success_url: `${origin}/projects/${project.slug}?donated=1&match=1`,
        cancel_url: `${origin}/projects/${project.slug}?canceled=1`,
        metadata: {
          kind: "matching_pool",
          projectId,
          donorId: user.id,
        },
      });
      if (session.url) redirect(session.url);
      return { error: "Stripe session missing URL" };
    }

    // Demo ledger path
    await prisma.project.update({
      where: { id: projectId },
      data: {
        matchingEnabled: true,
        matchingPoolCents: { increment: amountCents },
        matchingRemainingCents: { increment: amountCents },
      },
    });
    const who = user.handle || user.name || "supporter";
    await prisma.ledgerEntry.create({
      data: {
        projectId,
        kind: LedgerKind.CAPITAL,
        amountCents,
        summary: `@${who} funded matching pool +$${amountUsd.toFixed(2)} (demo ledger)`,
        actorHandle: user.handle,
        meta: JSON.stringify({ matchingPoolFund: true, demo: true }),
      },
    });
    revalidatePath(`/projects/${project.slug}`);
    revalidatePath(`/projects/${project.slug}/cockpit`);
    revalidatePath("/cockpit");
    revalidatePath("/dashboard");
    revalidatePath("/leaderboard");
    revalidatePath("/activity");
    return { ok: true as const };
  } catch (e) {
    // redirect() throws NEXT_REDIRECT - rethrow
    if (e && typeof e === "object" && "digest" in e) throw e;
    return {
      error: e instanceof Error ? e.message.slice(0, 300) : "Fund match pool failed",
    };
  }
}

export async function updateProfileAction(formData: FormData) {
  const user = await requireUser();
  const capacityNotes = String(formData.get("capacityNotes") || "").slice(0, 2000);
  const bio = String(formData.get("bio") || "").slice(0, 2000);
  const leak = rejectSecretPaste(`${bio}\n${capacityNotes}`);
  if (leak) return leak;
  const handleRaw = String(formData.get("handle") || "").replace(/^@/, "").slice(0, 32);
  const githubHandle = String(formData.get("githubHandle") || "")
    .replace(/^@/, "")
    .replace(/^https?:\/\/(www\.)?github\.com\//i, "")
    .split("/")[0]
    .replace(/[^A-Za-z0-9-]/g, "")
    .slice(0, 39);

  if (handleRaw && handleRaw !== user.handle) {
    const taken = await prisma.user.findUnique({ where: { handle: handleRaw } });
    if (taken) return { error: "Handle taken" };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      capacityNotes: capacityNotes || null,
      bio: bio || null,
      handle: handleRaw || user.handle,
      githubHandle: githubHandle || null,
    },
  });

  revalidatePath("/dashboard");
  revalidatePath(`/u/${handleRaw || user.handle}`);
  return { ok: true };
}

/**
 * Founder-only: pin a project to the home hero featured slot (right column).
 * Pass null / empty to clear.
 */
export async function pinFeaturedProjectAction(projectId: string | null) {
  try {
    const user = await requireUser();
    const { isFounderHandle } = await import("@/lib/identity");
    if (!isFounderHandle(user.handle)) {
      return { error: "Only the founder can pin a featured project" };
    }
    const rl = await rateLimitAsync(`pin-featured:${user.id}`, {
      limit: 40,
      windowMs: 60 * 60 * 1000,
    });
    if (!rl.ok) return { error: `Rate limit: try again in ${rl.retryAfterSec}s` };

    if (projectId) {
      const project = await prisma.project.findFirst({
        where: {
          id: projectId,
          status: { in: ["ACTIVE", "FUNDED", "COMPLETED"] },
        },
        select: { id: true, slug: true, title: true },
      });
      if (!project) return { error: "Project not found or not public" };

      await prisma.siteStats.upsert({
        where: { id: "global" },
        create: {
          id: "global",
          visitors: 0,
          xBuilders: 0,
          featuredProjectId: project.id,
        },
        update: { featuredProjectId: project.id },
      });

      await prisma.ledgerEntry.create({
        data: {
          projectId: project.id,
          kind: LedgerKind.ADJUSTMENT,
          amountCents: 0,
          summary: `@${user.handle || user.name} pinned "${project.title}" as home featured project`,
          actorHandle: user.handle,
          meta: JSON.stringify({ featuredPin: true, projectId: project.id }),
        },
      });

      revalidatePath("/");
      revalidatePath(`/projects/${project.slug}`);
      revalidatePath("/dashboard");
      return { ok: true, pinned: true, projectId: project.id };
    }

    await prisma.siteStats.upsert({
      where: { id: "global" },
      create: { id: "global", visitors: 0, xBuilders: 0, featuredProjectId: null },
      update: { featuredProjectId: null },
    });
    revalidatePath("/");
    revalidatePath("/projects");
    revalidatePath("/dashboard");
    return { ok: true, pinned: false };
  } catch (e) {
    console.error("[pinFeaturedProjectAction]", e);
    return {
      error: e instanceof Error ? e.message.slice(0, 300) : "Pin failed",
    };
  }
}

/**
 * Founder-only: set public project list order (displayOrder ascending).
 * Pass ordered project ids top-to-bottom as viewers should see them.
 */
export async function reorderProjectsAction(orderedIds: string[]) {
  try {
    const user = await requireUser();
    const { isFounderHandle } = await import("@/lib/identity");
    if (!isFounderHandle(user.handle)) {
      return { error: "Only the founder can reorder the public project list" };
    }
    const rl = await rateLimitAsync(`reorder-projects:${user.id}`, {
      limit: 60,
      windowMs: 60 * 60 * 1000,
    });
    if (!rl.ok) return { error: `Rate limit: try again in ${rl.retryAfterSec}s` };

    const ids = Array.from(
      new Set(
        (orderedIds || [])
          .map((x) => String(x || "").trim())
          .filter(Boolean)
          .slice(0, 500)
      )
    );
    if (ids.length < 1) return { error: "Need at least one project id" };

    const existing = await prisma.project.findMany({
      where: { id: { in: ids } },
      select: { id: true, slug: true },
    });
    if (existing.length !== ids.length) {
      return { error: "One or more projects not found" };
    }

    await prisma.$transaction(
      ids.map((id, index) =>
        prisma.project.update({
          where: { id },
          data: { displayOrder: index },
        })
      )
    );

    await prisma.ledgerEntry.create({
      data: {
        projectId: existing[0].id,
        kind: LedgerKind.ADJUSTMENT,
        amountCents: 0,
        summary: `@${user.handle || user.name} reordered public project list (${ids.length} projects)`,
        actorHandle: user.handle,
        meta: JSON.stringify({
          projectReorder: true,
          count: ids.length,
          topSlug: existing.find((e) => e.id === ids[0])?.slug,
        }),
      },
    });

    revalidatePath("/");
    revalidatePath("/projects");
    revalidatePath("/dashboard");
    revalidatePath("/rankings");
    return { ok: true, count: ids.length };
  } catch (e) {
    console.error("[reorderProjectsAction]", e);
    return {
      error: e instanceof Error ? e.message.slice(0, 300) : "Reorder failed",
    };
  }
}

/** Move one project up/down one slot in curated order (founder). */
export async function nudgeProjectOrderAction(
  projectId: string,
  direction: "up" | "down"
) {
  try {
    const user = await requireUser();
    const { isFounderHandle } = await import("@/lib/identity");
    if (!isFounderHandle(user.handle)) {
      return { error: "Only the founder can reorder projects" };
    }
    const rows = await prisma.project.findMany({
      where: { status: { in: ["ACTIVE", "FUNDED", "COMPLETED"] } },
      orderBy: [{ displayOrder: "asc" }, { createdAt: "desc" }],
      select: { id: true },
    });
    const idx = rows.findIndex((r) => r.id === projectId);
    if (idx < 0) return { error: "Project not in public list" };
    const swapWith = direction === "up" ? idx - 1 : idx + 1;
    if (swapWith < 0 || swapWith >= rows.length) {
      return { ok: true, noop: true };
    }
    const ordered = rows.map((r) => r.id);
    const tmp = ordered[idx];
    ordered[idx] = ordered[swapWith];
    ordered[swapWith] = tmp;
    return reorderProjectsAction(ordered);
  } catch (e) {
    console.error("[nudgeProjectOrderAction]", e);
    return {
      error: e instanceof Error ? e.message.slice(0, 300) : "Nudge failed",
    };
  }
}

/** Optional agent-runtime webhook URL for the signed-in user (public HTTPS only). */
export async function saveWorkerWebhookAction(url: string) {
  try {
    const user = await requireUser();
    const trimmed = (url || "").trim();
    if (!trimmed) {
      await prisma.user.update({
        where: { id: user.id },
        data: { workerWebhookUrl: null },
      });
      revalidatePath("/dashboard");
      return { ok: true };
    }
    const check = checkPublicHttpsWebhookUrl(trimmed);
    if (!check.ok) return { error: check.error };
    await prisma.user.update({
      where: { id: user.id },
      data: { workerWebhookUrl: check.url },
    });
    revalidatePath("/dashboard");
    return { ok: true };
  } catch (e) {
    return {
      error: e instanceof Error ? e.message.slice(0, 200) : "Save failed",
    };
  }
}

/** Persist theme preference for signed-in users (also stored in localStorage). */
export async function saveThemePrefAction(theme: string) {
  const user = await requireUser();
  const { THEME_IDS } = await import("@/lib/themes");
  if (!THEME_IDS.has(theme)) return { error: "Unknown theme" };
  await prisma.user.update({
    where: { id: user.id },
    data: { themePref: theme },
  });
  return { ok: true, theme };
}

/**
 * Self-reported X Money P2P tip (no bank rails on GrokForge).
 * Opens X for the real send; we log CAPITAL with source X_MONEY_P2P.
 */
export async function recordXMoneyTipAction(input: {
  recipientUserId: string;
  amountCents: number;
  projectId?: string;
}) {
  try {
    const user = await requireUser();
    const rl = await rateLimitAsync(`x-money:${user.id}`, {
      limit: 20,
      windowMs: 60 * 60 * 1000,
    });
    if (!rl.ok) return { error: `Rate limit: try again in ${rl.retryAfterSec}s` };

    const amountCents = Math.floor(Number(input.amountCents));
    if (!Number.isFinite(amountCents) || amountCents < 100 || amountCents > 1_000_000) {
      return { error: "Amount must be between $1 and $10,000" };
    }
    if (input.recipientUserId === user.id) {
      return { error: "Cannot tip yourself" };
    }

    const recipient = await prisma.user.findUnique({
      where: { id: input.recipientUserId },
      select: { id: true, handle: true },
    });
    if (!recipient) return { error: "Recipient not found" };

    let projectId = input.projectId || null;
    let projectSlug: string | null = null;
    let projectTitle: string | null = null;
    if (projectId) {
      const p = await prisma.project.findFirst({
        where: {
          id: projectId,
          proposerId: recipient.id,
          status: { in: ["ACTIVE", "FUNDED", "COMPLETED"] },
        },
        select: { id: true, slug: true, title: true },
      });
      if (!p) return { error: "Project not found for this builder" };
      projectId = p.id;
      projectSlug = p.slug;
      projectTitle = p.title;
    }

    const ledgerProjectId = projectId || (await platformLedgerProjectId());
    await prisma.ledgerEntry.create({
      data: {
        projectId: ledgerProjectId,
        kind: LedgerKind.CAPITAL,
        amountCents,
        summary: `@${user.handle || user.name} X Money P2P tip to @${recipient.handle || "builder"}${
          projectTitle ? ` (attributed: ${projectTitle})` : " (general support)"
        } · $${(amountCents / 100).toFixed(2)} self-reported`,
        actorHandle: user.handle,
        meta: JSON.stringify({
          source: "X_MONEY_P2P",
          recipientUserId: recipient.id,
          recipientHandle: recipient.handle,
          amountCents,
          projectId,
          selfReported: true,
        }),
      },
    });

    // Light rep for both sides of transparent social support
    await prisma.user.update({
      where: { id: user.id },
      data: { reputation: { increment: 1 } },
    });
    await prisma.user.update({
      where: { id: recipient.id },
      data: { reputation: { increment: 1 } },
    });

    if (recipient.id !== user.id) {
      await notifyUser({
        userId: recipient.id,
        type: "X_MONEY_TIP",
        title: `X Money tip from @${user.handle || "builder"}`,
        body: `~$${(amountCents / 100).toFixed(2)} self-reported tip initiated (complete on X)`,
        href: user.handle ? `/u/${user.handle}` : "/activity",
      });
    }

    if (projectSlug) revalidatePath(`/projects/${projectSlug}`);
    if (recipient.handle) revalidatePath(`/u/${recipient.handle}`);
    revalidatePath("/activity");
    revalidatePath("/dashboard");
    revalidatePath("/leaderboard");
    return { ok: true, amountCents };
  } catch (e) {
    console.error("[recordXMoneyTipAction]", e);
    return {
      error: e instanceof Error ? e.message.slice(0, 300) : "Tip record failed",
    };
  }
}

/** Light analytics / ledger note when a ranked builder shares their rank tweet. */
export async function noteLeaderboardShareAction(input: {
  handle: string;
  rank: number;
}) {
  try {
    const user = await requireUser();
    const rl = await rateLimitAsync(`share-rank:${user.id}`, {
      limit: 30,
      windowMs: 60 * 60 * 1000,
    });
    if (!rl.ok) return { error: "Rate limited" };

    const h = (input.handle || "").replace(/^@/, "").trim();
    if (!h || user.handle?.toLowerCase() !== h.toLowerCase()) {
      // only log when sharing own rank
      return { ok: true, skipped: true };
    }

    await prisma.ledgerEntry.create({
      data: {
        projectId: await platformLedgerProjectId(),
        kind: LedgerKind.ADJUSTMENT,
        amountCents: 0,
        summary: `@${user.handle} shared leaderboard rank #${input.rank} on X`,
        actorHandle: user.handle,
        meta: JSON.stringify({
          kind: "leaderboard_share",
          rank: input.rank,
          handle: h,
        }),
      },
    });
    revalidatePath("/activity");
    return { ok: true };
  } catch {
    return { ok: true, skipped: true };
  }
}

/**
 * Creator may delete a proposal only if it has never received capital support
 * (no donations with amount > 0, and no positive pot balances).
 */
export async function deleteProjectAction(projectId: string) {
  const user = await requireUser();
  const rl = await rateLimitAsync(`delete-project:${user.id}`, { limit: 10, windowMs: 60 * 60 * 1000 });
  if (!rl.ok) return { error: `Rate limit: try again in ${rl.retryAfterSec}s` };

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      fundPots: { select: { balanceCents: true } },
      donations: { select: { amountCents: true }, take: 1, where: { amountCents: { gt: 0 } } },
    },
  });
  if (!project) return { error: "Project not found" };
  if (project.proposerId !== user.id) {
    return { error: "Only the creator can delete this proposal" };
  }

  const raised = project.fundPots.reduce((s, p) => s + p.balanceCents, 0);
  if (raised > 0 || project.donations.length > 0) {
    return {
      error:
        "This proposal has received support and cannot be deleted. Use Archive instead to hide it from discovery.",
    };
  }

  const slug = project.slug;
  await prisma.project.delete({ where: { id: project.id } });

  revalidatePath("/projects");
  revalidatePath("/");
  revalidatePath("/dashboard");
  revalidatePath(`/projects/${slug}`);
  redirect("/projects");
}

/** Creator can archive any of their projects (supported or not). Unarchive restores ACTIVE. */
export async function archiveProjectAction(projectId: string) {
  const user = await requireUser();
  const rl = await rateLimitAsync(`archive-project:${user.id}`, { limit: 20, windowMs: 60 * 60 * 1000 });
  if (!rl.ok) return { error: `Rate limit: try again in ${rl.retryAfterSec}s` };

  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) return { error: "Project not found" };
  if (project.proposerId !== user.id) {
    return { error: "Only the creator can archive this proposal" };
  }
  if (project.status === "ARCHIVED") {
    return { error: "Already archived" };
  }

  await prisma.project.update({
    where: { id: project.id },
    data: { status: "ARCHIVED" },
  });
  await prisma.ledgerEntry.create({
    data: {
      projectId: project.id,
      kind: LedgerKind.ADJUSTMENT,
      amountCents: 0,
      summary: `@${user.handle || user.name} archived the project`,
      actorHandle: user.handle,
    },
  });

  revalidatePath("/projects");
  revalidatePath("/");
  revalidatePath("/dashboard");
  revalidatePath(`/projects/${project.slug}`);
  return { ok: true };
}

export async function unarchiveProjectAction(projectId: string) {
  const user = await requireUser();
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) return { error: "Project not found" };
  if (project.proposerId !== user.id) {
    return { error: "Only the creator can unarchive this proposal" };
  }
  if (project.status !== "ARCHIVED") {
    return { error: "Project is not archived" };
  }

  await prisma.project.update({
    where: { id: project.id },
    data: { status: "ACTIVE" },
  });
  await prisma.ledgerEntry.create({
    data: {
      projectId: project.id,
      kind: LedgerKind.ADJUSTMENT,
      amountCents: 0,
      summary: `@${user.handle || user.name} restored the project to active`,
      actorHandle: user.handle,
    },
  });

  revalidatePath("/projects");
  revalidatePath("/");
  revalidatePath("/dashboard");
  revalidatePath(`/projects/${project.slug}`);
  return { ok: true };
}

const commentSchema = z.object({
  projectId: z.string().min(1),
  body: z.string().min(2).max(4000),
});

export async function addProjectCommentAction(formData: FormData) {
  const user = await requireUser();
  const rl = await rateLimitAsync(`project-comment:${user.id}`, { limit: 30, windowMs: 60 * 60 * 1000 });
  if (!rl.ok) return { error: `Rate limit: try again in ${rl.retryAfterSec}s` };

  const parsed = commentSchema.safeParse({
    projectId: String(formData.get("projectId") || ""),
    body: String(formData.get("body") || "").trim(),
  });
  if (!parsed.success) {
    return { error: "Comment must be 2-4000 characters" };
  }

  const leak = rejectSecretPaste(parsed.data.body);
  if (leak) return leak;

  const project = await prisma.project.findUnique({
    where: { id: parsed.data.projectId },
    select: { id: true, slug: true, title: true, status: true, proposerId: true },
  });
  if (!project) return { error: "Project not found" };
  if (project.status === "ARCHIVED") {
    return { error: "Cannot comment on archived projects" };
  }

  // Light spam guard: repeated exact body
  const recent = await prisma.projectComment.findFirst({
    where: {
      userId: user.id,
      projectId: project.id,
      body: parsed.data.body,
      createdAt: { gte: new Date(Date.now() - 10 * 60 * 1000) },
    },
  });
  if (recent) return { error: "Duplicate comment - wait before posting the same text again" };

  await prisma.projectComment.create({
    data: {
      projectId: project.id,
      userId: user.id,
      body: parsed.data.body,
    },
  });

  if (project.proposerId !== user.id) {
    await notifyUser({
      userId: project.proposerId,
      type: "COMMENT",
      title: `New comment on ${project.title}`,
      body: `@${user.handle || "someone"}: ${parsed.data.body.slice(0, 240)}`,
      href: `/projects/${project.slug}`,
    });
  }

  await notifyProjectWatchers({
    projectId: project.id,
    excludeUserIds: [user.id, project.proposerId],
    type: "WATCH_COMMENT",
    title: `Watched: ${project.title}`,
    body: `@${user.handle || "someone"} commented: ${parsed.data.body.slice(0, 200)}`,
    href: `/projects/${project.slug}`,
  });

  revalidatePath(`/projects/${project.slug}`);
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function deleteProjectCommentAction(commentId: string) {
  const user = await requireUser();
  const comment = await prisma.projectComment.findUnique({
    where: { id: commentId },
    include: { project: { select: { slug: true, proposerId: true } } },
  });
  if (!comment) return { error: "Comment not found" };
  if (comment.userId !== user.id && comment.project.proposerId !== user.id) {
    return { error: "You can only delete your own comments (or as project creator)" };
  }
  await prisma.projectComment.delete({ where: { id: commentId } });
  revalidatePath(`/projects/${comment.project.slug}`);
  return { ok: true };
}

/** Creator soft-hides a comment (moderation). Author can still hard-delete their own. */
export async function hideProjectCommentAction(commentId: string) {
  const user = await requireUser();
  const comment = await prisma.projectComment.findUnique({
    where: { id: commentId },
    include: { project: { select: { slug: true, proposerId: true } } },
  });
  if (!comment) return { error: "Comment not found" };
  if (comment.project.proposerId !== user.id) {
    return { error: "Only the project creator can hide comments" };
  }
  await prisma.projectComment.update({
    where: { id: commentId },
    data: { hidden: true },
  });
  revalidatePath(`/projects/${comment.project.slug}`);
  return { ok: true };
}

export async function unhideProjectCommentAction(commentId: string) {
  const user = await requireUser();
  const comment = await prisma.projectComment.findUnique({
    where: { id: commentId },
    include: { project: { select: { slug: true, proposerId: true } } },
  });
  if (!comment) return { error: "Comment not found" };
  if (comment.project.proposerId !== user.id) {
    return { error: "Only the project creator can unhide comments" };
  }
  await prisma.projectComment.update({
    where: { id: commentId },
    data: { hidden: false },
  });
  revalidatePath(`/projects/${comment.project.slug}`);
  return { ok: true };
}

export async function markNotificationsReadAction() {
  const user = await requireUser();
  await prisma.notification.updateMany({
    where: { userId: user.id, read: false },
    data: { read: true },
  });
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function reportProjectCommentAction(commentId: string, reason?: string) {
  const user = await requireUser();
  const rl = await rateLimitAsync(`report-comment:${user.id}`, {
    limit: 20,
    windowMs: 60 * 60 * 1000,
  });
  if (!rl.ok) return { error: `Rate limit: try again in ${rl.retryAfterSec}s` };

  const comment = await prisma.projectComment.findUnique({
    where: { id: commentId },
    include: {
      project: { select: { id: true, slug: true, title: true, proposerId: true } },
      user: { select: { handle: true } },
    },
  });
  if (!comment) return { error: "Comment not found" };
  if (comment.userId === user.id) {
    return { error: "You cannot report your own comment" };
  }
  if (comment.hidden) return { error: "Comment is already hidden" };

  try {
    await prisma.commentReport.create({
      data: {
        commentId,
        reporterId: user.id,
        reason: (reason || "").slice(0, 400) || null,
      },
    });
  } catch {
    return { error: "You already reported this comment" };
  }

  const reportCount = await prisma.commentReport.count({ where: { commentId } });

  // Auto-hide after 3 unique reports (community signal)
  if (reportCount >= 3 && !comment.hidden) {
    await prisma.projectComment.update({
      where: { id: commentId },
      data: { hidden: true },
    });
  }

  if (comment.project.proposerId !== user.id) {
    await notifyUser({
      userId: comment.project.proposerId,
      type: "REPORT",
      title: `Comment reported on ${comment.project.title}`,
      body: `@${user.handle || "someone"} reported a comment by @${comment.user.handle || "anon"} (${reportCount} report${reportCount === 1 ? "" : "s"})${reportCount >= 3 ? " - auto-hidden" : ""}`,
      href: `/projects/${comment.project.slug}`,
    });
  }

  revalidatePath(`/projects/${comment.project.slug}`);
  revalidatePath("/dashboard");
  return {
    ok: true,
    reportCount,
    autoHidden: reportCount >= 3,
  };
}

export async function watchProjectAction(projectId: string) {
  const user = await requireUser();
  const rl = await rateLimitAsync(`watch:${user.id}`, {
    limit: 40,
    windowMs: 60 * 60 * 1000,
  });
  if (!rl.ok) return { error: `Rate limit: try again in ${rl.retryAfterSec}s` };

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true, slug: true, status: true },
  });
  if (!project) return { error: "Project not found" };
  if (project.status === "ARCHIVED" || project.status === "DRAFT") {
    return { error: "Cannot watch archived or draft projects" };
  }

  try {
    await prisma.projectWatch.create({
      data: { userId: user.id, projectId: project.id },
    });
  } catch {
    // already watching
  }
  revalidatePath(`/projects/${project.slug}`);
  revalidatePath("/dashboard");
  revalidatePath("/projects");
  return { ok: true, watching: true };
}

export async function unwatchProjectAction(projectId: string) {
  const user = await requireUser();
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true, slug: true },
  });
  if (!project) return { error: "Project not found" };

  await prisma.projectWatch.deleteMany({
    where: { userId: user.id, projectId: project.id },
  });
  revalidatePath(`/projects/${project.slug}`);
  revalidatePath("/dashboard");
  revalidatePath("/projects");
  return { ok: true, watching: false };
}

/** Toggle thumbs-up on a project (one per signed-in user). */
export async function toggleProjectThumbAction(projectId: string) {
  try {
    const user = await requireUser();
    const rl = await rateLimitAsync(`thumb:${user.id}`, {
      limit: 60,
      windowMs: 60 * 60 * 1000,
    });
    if (!rl.ok) return { error: `Rate limit: try again in ${rl.retryAfterSec}s` };

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, slug: true, status: true },
    });
    if (!project) return { error: "Project not found" };
    if (project.status === "ARCHIVED" || project.status === "DRAFT") {
      return { error: "Cannot thumbs-up archived or draft projects" };
    }

    const existing = await prisma.projectThumb.findUnique({
      where: {
        userId_projectId: { userId: user.id, projectId: project.id },
      },
    });

    if (existing) {
      await prisma.projectThumb.delete({ where: { id: existing.id } });
    } else {
      await prisma.projectThumb.create({
        data: { userId: user.id, projectId: project.id },
      });
    }

    const count = await prisma.projectThumb.count({
      where: { projectId: project.id },
    });

    revalidatePath(`/projects/${project.slug}`);
    revalidatePath("/projects");
    revalidatePath("/");
    revalidatePath("/rankings");
    return { ok: true as const, thumbed: !existing, count };
  } catch (e) {
    console.error("[toggleProjectThumbAction]", e);
    const msg = e instanceof Error ? e.message : "Thumb failed";
    return { error: msg.slice(0, 300) };
  }
}

/** Prefer civic toolkit as ledger anchor for platform gifts; else any active project. */
async function platformLedgerProjectId(): Promise<string> {
  const preferred = await prisma.project.findFirst({
    where: { slug: "open-agent-civic-toolkit" },
    select: { id: true },
  });
  if (preferred) return preferred.id;
  const any = await prisma.project.findFirst({
    where: { status: "ACTIVE" },
    select: { id: true },
    orderBy: { createdAt: "asc" },
  });
  if (!any) throw new Error("No project available for platform ledger anchor");
  return any.id;
}

async function maybeReleaseMilestone(milestoneId: string) {
  const m = await prisma.milestone.findUnique({
    where: { id: milestoneId },
    include: { project: { select: { id: true, slug: true, title: true, proposerId: true } } },
  });
  if (!m || m.released) return m;
  if (m.humanVerifiedAt && m.agentVerifiedAt) {
    const updated = await prisma.milestone.update({
      where: { id: milestoneId },
      data: { released: true, releasedAt: new Date() },
    });
    await prisma.ledgerEntry.create({
      data: {
        projectId: m.projectId,
        kind: LedgerKind.MILESTONE,
        amountCents: m.targetCents,
        summary: `Milestone released (human + agent dual verify): "${m.title}"`,
        meta: JSON.stringify({
          milestoneId: m.id,
          dualVerify: true,
          humanVerifiedAt: m.humanVerifiedAt,
          agentVerifiedAt: m.agentVerifiedAt,
        }),
      },
    });
    await notifyUser({
      userId: m.project.proposerId,
      type: "MILESTONE_RELEASED",
      title: `Milestone released: ${m.title}`,
      body: `Dual verification complete on ${m.project.title}`,
      href: `/projects/${m.project.slug}`,
    });
    revalidatePath(`/projects/${m.project.slug}`);
    revalidatePath("/activity");
    revalidatePath("/dashboard");
    return updated;
  }
  return m;
}

/**
 * Human leg of dual milestone verification (project creator or peer with rep >= 5).
 */
export async function humanVerifyMilestoneAction(milestoneId: string) {
  try {
    const user = await requireUser();
    const rl = await rateLimitAsync(`ms-human:${user.id}`, {
      limit: 40,
      windowMs: 60 * 60 * 1000,
    });
    if (!rl.ok) return { error: `Rate limit: try again in ${rl.retryAfterSec}s` };

    const m = await prisma.milestone.findUnique({
      where: { id: milestoneId },
      include: { project: true },
    });
    if (!m) return { error: "Milestone not found" };
    if (m.released) return { error: "Already released" };
    if (m.humanVerifiedAt) return { error: "Already human-verified" };

    const isCreator = m.project.proposerId === user.id;
    if (!isCreator && user.reputation < 5) {
      return { error: "Need 5+ reputation (or be the creator) to human-verify" };
    }

    await prisma.milestone.update({
      where: { id: milestoneId },
      data: {
        humanVerifiedAt: new Date(),
        humanVerifiedById: user.id,
      },
    });

    await prisma.ledgerEntry.create({
      data: {
        projectId: m.projectId,
        kind: LedgerKind.MILESTONE,
        amountCents: 0,
        summary: `@${user.handle || user.name} human-verified milestone "${m.title}"`,
        actorHandle: user.handle,
        meta: JSON.stringify({ milestoneId, leg: "human" }),
      },
    });

    const released = await maybeReleaseMilestone(milestoneId);
    revalidatePath(`/projects/${m.project.slug}`);
    revalidatePath("/dashboard");
    return {
      ok: true,
      released: !!released?.released,
      awaitingAgent: !released?.released,
    };
  } catch (e) {
    console.error("[humanVerifyMilestoneAction]", e);
    return { error: e instanceof Error ? e.message.slice(0, 300) : "Verify failed" };
  }
}

/**
 * Multi-agent / platform leg of dual milestone verification.
 * Uses XAI_API_KEY when set; otherwise a transparent heuristic worker.
 */
export async function agentVerifyMilestoneAction(milestoneId: string) {
  try {
    const user = await requireUser();
    const rl = await rateLimitAsync(`ms-agent:${user.id}`, {
      limit: 30,
      windowMs: 60 * 60 * 1000,
    });
    if (!rl.ok) return { error: `Rate limit: try again in ${rl.retryAfterSec}s` };

    const m = await prisma.milestone.findUnique({
      where: { id: milestoneId },
      include: {
        project: {
          include: {
            tasks: { select: { status: true } },
            artifacts: { select: { id: true } },
          },
        },
      },
    });
    if (!m) return { error: "Milestone not found" };
    if (m.released) return { error: "Already released" };
    if (m.agentVerifiedAt) return { error: "Already agent-verified" };

    // Only creator or human-verifier peer may trigger the agent worker
    const isCreator = m.project.proposerId === user.id;
    if (!isCreator && m.humanVerifiedById !== user.id && user.reputation < 10) {
      return { error: "Creator or human verifier should run the agent check" };
    }

    const accepted = await prisma.contribution.count({
      where: { status: "ACCEPTED", task: { projectId: m.projectId } },
    });
    const artifacts = m.project.artifacts.length;
    const openLeft = m.project.tasks.filter((t) => t.status === "OPEN").length;
    const doneish = m.project.tasks.filter((t) =>
      ["ACCEPTED", "SUBMITTED"].includes(t.status)
    ).length;

    let note = "";
    let pass = false;
    const key = process.env.XAI_API_KEY?.trim();

    if (key) {
      try {
        const model = process.env.XAI_MODEL || "grok-3-mini";
        const res = await fetch("https://api.x.ai/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${key}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model,
            temperature: 0,
            messages: [
              {
                role: "system",
                content:
                  "You are a GrokForge milestone verification worker. Reply ONLY JSON {\"pass\":boolean,\"note\":string}. Be strict but fair for open-source greater-good projects.",
              },
              {
                role: "user",
                content: JSON.stringify({
                  milestone: { title: m.title, description: m.description },
                  project: m.project.title,
                  stats: { accepted, artifacts, openLeft, doneish },
                }),
              },
            ],
          }),
        });
        if (res.ok) {
          const data = await res.json();
          const text = data?.choices?.[0]?.message?.content || "";
          const jsonMatch = text.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]) as { pass?: boolean; note?: string };
            pass = !!parsed.pass;
            note = String(parsed.note || "").slice(0, 500);
          }
        }
      } catch {
        /* fall through to heuristic */
      }
    }

    if (!note) {
      // Heuristic multi-agent stand-in: require some accepted labor or artifacts
      pass = accepted >= 1 || artifacts >= 1 || doneish >= 1;
      note = pass
        ? `Heuristic agent worker: pass (${accepted} accepted, ${artifacts} artifacts, ${doneish} progressed tasks).`
        : `Heuristic agent worker: hold - need accepted work or artifacts before release (${accepted} accepted, ${artifacts} artifacts).`;
    }

    if (!pass) {
      return {
        error: note || "Agent verification did not pass yet",
        pass: false,
      };
    }

    await prisma.milestone.update({
      where: { id: milestoneId },
      data: {
        agentVerifiedAt: new Date(),
        agentVerifiedNote: note,
      },
    });

    await prisma.ledgerEntry.create({
      data: {
        projectId: m.projectId,
        kind: LedgerKind.MILESTONE,
        amountCents: 0,
        summary: `Agent-verified milestone "${m.title}" (${key ? "grok-worker" : "heuristic-worker"})`,
        actorHandle: user.handle,
        meta: JSON.stringify({
          milestoneId,
          leg: "agent",
          note,
          source: key ? "xai" : "heuristic",
        }),
      },
    });

    const released = await maybeReleaseMilestone(milestoneId);
    revalidatePath(`/projects/${m.project.slug}`);
    revalidatePath("/dashboard");
    revalidatePath("/activity");
    return {
      ok: true,
      released: !!released?.released,
      note,
      awaitingHuman: !released?.released && !m.humanVerifiedAt,
    };
  } catch (e) {
    console.error("[agentVerifyMilestoneAction]", e);
    return { error: e instanceof Error ? e.message.slice(0, 300) : "Agent verify failed" };
  }
}

/**
 * Link a public artifact (GitHub preferred) to a project.
 * Creators always; any signed-in builder may link if they have an accepted contribution.
 */
export async function linkArtifactAction(formData: FormData) {
  try {
    const user = await requireUser();
    const rl = await rateLimitAsync(`artifact:${user.id}`, {
      limit: 30,
      windowMs: 60 * 60 * 1000,
    });
    if (!rl.ok) return { error: `Rate limit: try again in ${rl.retryAfterSec}s` };

    const projectId = String(formData.get("projectId") || "");
    const rawUrl = String(formData.get("url") || "").trim();
    const titleRaw = String(formData.get("title") || "").trim();
    const license = String(formData.get("license") || "MIT").slice(0, 40);

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, slug: true, proposerId: true, license: true },
    });
    if (!project) return { error: "Project not found" };

    const isCreator = project.proposerId === user.id;
    if (!isCreator) {
      const accepted = await prisma.contribution.count({
        where: {
          userId: user.id,
          status: "ACCEPTED",
          task: { projectId },
        },
      });
      if (accepted < 1) {
        return { error: "Need an accepted contribution on this project (or be the creator)" };
      }
    }

    const { normalizeGitHubUrl, parseGitHubRepo, titleFromGitHubUrl, isGitHubUrl } =
      await import("@/lib/github-link");

    let url = rawUrl;
    let source = "url";
    let githubRepo: string | null = null;

    if (isGitHubUrl(rawUrl) || rawUrl.includes("github.com")) {
      const n = normalizeGitHubUrl(rawUrl);
      if (!n) return { error: "Invalid GitHub URL" };
      url = n;
      source = "github";
      githubRepo = parseGitHubRepo(n);
      try {
        const { validateGithubRepoLink } = await import("@/lib/github-link-validate");
        const check = await validateGithubRepoLink(n);
        if (!check.ok && check.issues.length) {
          return {
            error: `GitHub link check failed: ${check.issues.join("; ")}`,
          };
        }
      } catch {
        /* non-fatal if API rate-limited */
      }
    } else {
      try {
        const u = new URL(rawUrl.startsWith("http") ? rawUrl : `https://${rawUrl}`);
        if (!["http:", "https:"].includes(u.protocol)) {
          return { error: "URL must be http(s)" };
        }
        url = u.toString();
      } catch {
        return { error: "Invalid URL" };
      }
    }

    const title =
      titleRaw ||
      (source === "github" ? titleFromGitHubUrl(url) : url.slice(0, 80));

    const art = await prisma.artifact.create({
      data: {
        projectId,
        title: title.slice(0, 200),
        url: url.slice(0, 2000),
        license: license || project.license || "MIT",
        source,
        githubRepo,
      },
    });

    await prisma.ledgerEntry.create({
      data: {
        projectId,
        kind: LedgerKind.LABOR,
        amountCents: 0,
        summary: `@${user.handle || user.name} linked artifact "${art.title}"${
          githubRepo ? ` (${githubRepo})` : ""
        }`,
        actorHandle: user.handle,
        meta: JSON.stringify({
          artifactId: art.id,
          source,
          githubRepo,
        }),
      },
    });

    revalidatePath(`/projects/${project.slug}`);
    revalidatePath("/activity");
    return { ok: true, artifactId: art.id };
  } catch (e) {
    console.error("[linkArtifactAction]", e);
    return { error: e instanceof Error ? e.message.slice(0, 300) : "Link failed" };
  }
}
