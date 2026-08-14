"use server";

/**
 * Expansion actions: post-publish leaves, peer review, dispute/reopen.
 */
import { revalidatePath } from "next/cache";
import { LedgerKind, TaskStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { recordProjectEdit } from "@/lib/edit-history";
import { tierForReputation } from "@/lib/reputation-tiers";
import { isFounderHandle } from "@/lib/identity";
import { rejectSecretPaste } from "@/lib/secret-scan";

/** Creator: add a nested OPEN leaf after publish */
export async function addLeafTaskAction(formData: FormData) {
  try {
    const user = await requireUser();
    const projectId = String(formData.get("projectId") || "");
    const title = String(formData.get("title") || "").trim();
    const prompt = String(formData.get("prompt") || "").trim();
    const acceptanceCriteria = String(
      formData.get("acceptanceCriteria") || ""
    ).trim();
    const estimatedTokens = Math.max(
      0,
      Math.min(10_000_000, Number(formData.get("estimatedTokens") || 8000))
    );
    const tags = String(formData.get("tags") || "").trim().slice(0, 200);
    const goodFirst = String(formData.get("goodFirst") || "") === "1";
    if (title.length < 3 || prompt.length < 10 || acceptanceCriteria.length < 5) {
      return { error: "Leaf needs title (3+), prompt (10+), acceptance (5+)" };
    }
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, slug: true, proposerId: true, status: true },
    });
    if (!project) return { error: "Project not found" };
    if (project.proposerId !== user.id) return { error: "Only creator can add leaves" };
    if (project.status === "ARCHIVED") return { error: "Restore project first" };
    const root = await prisma.task.findFirst({
      where: { projectId, parentId: null },
      orderBy: { sortOrder: "asc" },
    });
    if (!root) return { error: "Master task missing" };
    const maxSort = await prisma.task.aggregate({
      where: { projectId, parentId: root.id },
      _max: { sortOrder: true },
    });
    const task = await prisma.task.create({
      data: {
        projectId,
        parentId: root.id,
        title: title.slice(0, 120),
        prompt: prompt.slice(0, 4000),
        acceptanceCriteria: acceptanceCriteria.slice(0, 2000),
        estimatedTokens,
        tags: tags || null,
        goodFirst,
        sortOrder: (maxSort._max.sortOrder || 0) + 1,
        status: TaskStatus.OPEN,
      },
    });
    await recordProjectEdit({
      projectId,
      actorId: user.id,
      actorHandle: user.handle,
      field: "task_add",
      newValue: title,
      summary: `Added leaf: ${title.slice(0, 80)}`,
    });
    await prisma.ledgerEntry.create({
      data: {
        projectId,
        kind: LedgerKind.ADJUSTMENT,
        amountCents: 0,
        summary: `@${user.handle || user.name} added leaf "${title.slice(0, 60)}"`,
        actorHandle: user.handle,
      },
    });
    revalidatePath(`/projects/${project.slug}`);
    revalidatePath("/tasks");
    return { ok: true as const, taskId: task.id };
  } catch (e) {
    return { error: e instanceof Error ? e.message.slice(0, 300) : "Add leaf failed" };
  }
}

/** Creator: edit OPEN leaf title/prompt/acceptance/tags */
export async function editLeafTaskAction(formData: FormData) {
  try {
    const user = await requireUser();
    const taskId = String(formData.get("taskId") || "");
    const title = String(formData.get("title") || "").trim();
    const prompt = String(formData.get("prompt") || "").trim();
    const acceptanceCriteria = String(
      formData.get("acceptanceCriteria") || ""
    ).trim();
    const tags = String(formData.get("tags") || "").trim().slice(0, 200);
    const goodFirst = String(formData.get("goodFirst") || "") === "1";
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        project: { select: { id: true, slug: true, proposerId: true } },
      },
    });
    if (!task) return { error: "Task not found" };
    if (task.project.proposerId !== user.id) {
      return { error: "Only creator can edit leaves" };
    }
    if (task.status !== TaskStatus.OPEN) {
      return { error: "Only OPEN leaves can be edited" };
    }
    if (title.length < 3 || prompt.length < 10 || acceptanceCriteria.length < 5) {
      return { error: "Invalid leaf fields" };
    }
    await prisma.task.update({
      where: { id: taskId },
      data: {
        title: title.slice(0, 120),
        prompt: prompt.slice(0, 4000),
        acceptanceCriteria: acceptanceCriteria.slice(0, 2000),
        tags: tags || null,
        goodFirst,
      },
    });
    await recordProjectEdit({
      projectId: task.projectId,
      actorId: user.id,
      actorHandle: user.handle,
      field: "task_edit",
      oldValue: task.title,
      newValue: title,
      summary: `Edited leaf: ${title.slice(0, 80)}`,
    });
    revalidatePath(`/projects/${task.project.slug}`);
    revalidatePath("/tasks");
    return { ok: true as const };
  } catch (e) {
    return { error: e instanceof Error ? e.message.slice(0, 300) : "Edit leaf failed" };
  }
}

/** Forger+ tier: peer review notes on contribution */
export async function peerReviewContributionAction(formData: FormData) {
  try {
    const user = await requireUser();
    const contributionId = String(formData.get("contributionId") || "");
    const score = Math.max(1, Math.min(5, Number(formData.get("score") || 3)));
    const notes = String(formData.get("notes") || "").trim().slice(0, 2000);
    const leak = rejectSecretPaste(notes);
    if (leak) return leak;
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { reputation: true, handle: true },
    });
    const tier = tierForReputation(dbUser?.reputation ?? 0);
    if (!tier.canPeerReview && !isFounderHandle(user.handle)) {
      return {
        error: `Need Forger tier (100+ rep) to peer-review (you: ${tier.label})`,
      };
    }
    const c = await prisma.contribution.findUnique({
      where: { id: contributionId },
      include: { task: { include: { project: true } } },
    });
    if (!c) return { error: "Contribution not found" };
    if (c.userId === user.id) return { error: "Cannot peer-review your own work" };
    await prisma.contributionReview.create({
      data: {
        contributionId,
        reviewerId: user.id,
        score,
        notes: notes || null,
      },
    });
    await prisma.user.update({
      where: { id: user.id },
      data: { reputation: { increment: 2 } },
    });
    await prisma.ledgerEntry.create({
      data: {
        projectId: c.task.projectId,
        kind: LedgerKind.LABOR,
        amountCents: 0,
        summary: `@${user.handle || user.name} peer-reviewed submission on "${c.task.title}" (${score}/5) (+2 rep)`,
        actorHandle: user.handle,
        meta: JSON.stringify({ peerReview: true, contributionId, score }),
      },
    });
    revalidatePath(`/c/${contributionId}`);
    revalidatePath(`/projects/${c.task.project.slug}`);
    revalidatePath("/tasks");
    revalidatePath("/dashboard");
    return { ok: true as const };
  } catch (e) {
    return {
      error: e instanceof Error ? e.message.slice(0, 300) : "Peer review failed",
    };
  }
}

/** Contributor or creator: dispute with public rationale */
export async function disputeContributionAction(formData: FormData) {
  try {
    const user = await requireUser();
    const contributionId = String(formData.get("contributionId") || "");
    const note = String(formData.get("note") || "").trim().slice(0, 2000);
    if (note.length < 10) {
      return { error: "Dispute needs a public rationale (10+ chars)" };
    }
    const c = await prisma.contribution.findUnique({
      where: { id: contributionId },
      include: { task: { include: { project: true } } },
    });
    if (!c) return { error: "Contribution not found" };
    const isParty =
      c.userId === user.id || c.task.project.proposerId === user.id;
    if (!isParty && !isFounderHandle(user.handle)) {
      return { error: "Only author, creator, or founder can dispute" };
    }
    await prisma.contribution.update({
      where: { id: contributionId },
      data: { disputedAt: new Date(), disputeNote: note },
    });
    await prisma.ledgerEntry.create({
      data: {
        projectId: c.task.projectId,
        kind: LedgerKind.ADJUSTMENT,
        amountCents: 0,
        summary: `@${user.handle || user.name} disputed submission on "${c.task.title}"`,
        actorHandle: user.handle,
        meta: JSON.stringify({ dispute: true, contributionId }),
      },
    });
    revalidatePath(`/c/${contributionId}`);
    return { ok: true as const };
  } catch (e) {
    return { error: e instanceof Error ? e.message.slice(0, 300) : "Dispute failed" };
  }
}

/** Creator/founder: reopen task to OPEN for rework */
export async function reopenContributionTaskAction(formData: FormData) {
  try {
    const user = await requireUser();
    const contributionId = String(formData.get("contributionId") || "");
    const c = await prisma.contribution.findUnique({
      where: { id: contributionId },
      include: { task: { include: { project: true } } },
    });
    if (!c) return { error: "Contribution not found" };
    if (
      c.task.project.proposerId !== user.id &&
      !isFounderHandle(user.handle)
    ) {
      return { error: "Only creator or founder can reopen" };
    }
    await prisma.$transaction([
      prisma.contribution.update({
        where: { id: contributionId },
        data: {
          status: "REJECTED",
          reopenedAt: new Date(),
        },
      }),
      prisma.task.update({
        where: { id: c.taskId },
        data: { status: TaskStatus.OPEN },
      }),
      prisma.ledgerEntry.create({
        data: {
          projectId: c.task.projectId,
          kind: LedgerKind.ADJUSTMENT,
          amountCents: 0,
          summary: `@${user.handle || user.name} reopened "${c.task.title}" for rework`,
          actorHandle: user.handle,
        },
      }),
    ]);
    revalidatePath(`/c/${contributionId}`);
    revalidatePath(`/projects/${c.task.project.slug}`);
    revalidatePath("/tasks");
    return { ok: true as const };
  } catch (e) {
    return { error: e instanceof Error ? e.message.slice(0, 300) : "Reopen failed" };
  }
}
