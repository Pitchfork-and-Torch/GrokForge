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
import { requireUser } from "@/lib/session";
import { rateLimit } from "@/lib/rate-limit";
import { slugify } from "@/lib/utils";


const projectSchema = z.object({
  title: z.string().min(5).max(120),
  description: z.string().min(40).max(8000),
  category: z.nativeEnum(ProjectCategory),
  license: z.string().min(2).max(40).default("MIT"),
  fundingGoalUsd: z.coerce.number().min(0).max(10_000_000),
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
  const user = await requireUser();
  const rl = rateLimit(`create-project:${user.id}`, { limit: 20, windowMs: 60 * 60 * 1000 });
  if (!rl.ok) return { error: `Rate limit: try again in ${rl.retryAfterSec}s` };
  const raw = {

    title: String(formData.get("title") || ""),
    description: String(formData.get("description") || ""),
    category: String(formData.get("category") || "OTHER"),
    license: String(formData.get("license") || "MIT"),
    fundingGoalUsd: formData.get("fundingGoalUsd") || 0,
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

  let slug = slugify(data.title);
  if (!slug) slug = `project-${Date.now()}`;
  const existing = await prisma.project.findUnique({ where: { slug } });
  if (existing) slug = `${slug}-${Date.now().toString(36)}`;

  const fundingGoalCents = Math.round(data.fundingGoalUsd * 100);

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
      proposerId: user.id,
      fundPots: {
        create: [
          { type: FundType.GENERAL, label: "General pot", balanceCents: 0 },
          { type: FundType.API_CREDITS, label: "API / token credits", balanceCents: 0 },
          {
            type: FundType.SUPERGROK_SPONSOR,
            label: "SuperGrok sponsorship for builders",
            balanceCents: 0,
          },
        ],
      },
      milestones: {
        create: [
          {
            title: "Kickoff deliverable",
            description: "First accepted hierarchical batch of tasks.",
            targetCents: Math.round(fundingGoalCents * 0.25),
            sortOrder: 0,
          },
          {
            title: "Midpoint review",
            description: "Peer-reviewed contributions cover core goals.",
            targetCents: Math.round(fundingGoalCents * 0.6),
            sortOrder: 1,
          },
          {
            title: "Open release",
            description: "Artifacts published under committed open license.",
            targetCents: fundingGoalCents,
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
  redirect(`/projects/${project.slug}`);
}

export async function claimTaskAction(taskId: string) {
  const user = await requireUser();
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: { project: true },
  });
  if (!task) return { error: "Task not found" };
  if (task.status !== TaskStatus.OPEN) return { error: "Task is not open" };

  // Rate-limit style eligibility window display: one active claim per user per project
  const activeClaims = await prisma.taskClaim.count({
    where: { userId: user.id, active: true, task: { projectId: task.projectId } },
  });
  if (activeClaims >= 3) {
    return { error: "Capacity guard: max 3 active claims per project (rate-limit friendly)." };
  }

  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);

  await prisma.$transaction([
    prisma.taskClaim.create({
      data: {
        taskId: task.id,
        userId: user.id,
        expiresAt,
        active: true,
      },
    }),
    prisma.task.update({
      where: { id: task.id },
      data: { status: TaskStatus.CLAIMED },
    }),
    prisma.ledgerEntry.create({
      data: {
        projectId: task.projectId,
        kind: LedgerKind.LABOR,
        amountCents: 0,
        summary: `@${user.handle || user.name} claimed "${task.title}"`,
        actorHandle: user.handle,
      },
    }),
  ]);

  revalidatePath(`/projects/${task.project.slug}`);
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function submitContributionAction(formData: FormData) {
  const user = await requireUser();
  const rl = rateLimit(`submit:${user.id}`, { limit: 40, windowMs: 60 * 60 * 1000 });
  if (!rl.ok) return { error: `Rate limit: try again in ${rl.retryAfterSec}s` };
  const taskId = String(formData.get("taskId") || "");

  const body = String(formData.get("body") || "");
  const sources = String(formData.get("sources") || "");
  const contentType = String(formData.get("contentType") || "markdown");

  if (!taskId || body.trim().length < 20) {
    return { error: "Submission needs a task and at least 20 characters of body." };
  }

  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: {
      project: true,
      claims: {
        where: { userId: user.id, active: true },
        orderBy: { claimedAt: "desc" },
        take: 1,
      },
    },
  });
  if (!task) return { error: "Task not found" };
  if (!["CLAIMED", "OPEN", "SUBMITTED"].includes(task.status)) {
    return { error: "Task is not accepting submissions" };
  }

  // Manual mode: allow submit without claim if open; prefer claim when present
  let claimId = task.claims[0]?.id;
  if (!claimId && task.status === TaskStatus.OPEN) {
    const claim = await prisma.taskClaim.create({
      data: {
        taskId: task.id,
        userId: user.id,
        active: true,
        expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
      },
    });
    claimId = claim.id;
  }

  const contribution = await prisma.contribution.create({
    data: {
      taskId: task.id,
      claimId: claimId || null,
      userId: user.id,
      body,
      sources: sources || null,
      contentType,
      status: "PENDING",
    },
  });

  if (claimId) {
    await prisma.taskClaim.update({
      where: { id: claimId },
      data: { active: false },
    });
  }

  await prisma.task.update({
    where: { id: task.id },
    data: { status: TaskStatus.SUBMITTED },
  });

  await prisma.artifact.create({
    data: {
      projectId: task.projectId,
      contributionId: contribution.id,
      title: `Submission: ${task.title}`,
      url: `/projects/${task.project.slug}#contribution-${contribution.id}`,
      license: task.project.license,
    },
  });

  await prisma.ledgerEntry.create({
    data: {
      projectId: task.projectId,
      kind: LedgerKind.LABOR,
      amountCents: 0,
      summary: `@${user.handle || user.name} submitted work on "${task.title}"`,
      actorHandle: user.handle,
      meta: JSON.stringify({ contributionId: contribution.id }),
    },
  });

  // Light reputation bump for showing up
  await prisma.user.update({
    where: { id: user.id },
    data: { reputation: { increment: 1 } },
  });

  revalidatePath(`/projects/${task.project.slug}`);
  revalidatePath("/dashboard");
  return { ok: true, contributionId: contribution.id };
}

export async function reviewContributionAction(
  contributionId: string,
  score: number,
  notes: string
) {
  const user = await requireUser();
  if (score < 1 || score > 5) return { error: "Score must be 1-5" };

  const contribution = await prisma.contribution.findUnique({
    where: { id: contributionId },
    include: { task: { include: { project: true } }, user: true },
  });
  if (!contribution) return { error: "Not found" };
  if (contribution.userId === user.id) {
    return { error: "Cannot review your own submission" };
  }

  await prisma.contributionReview.create({
    data: {
      contributionId,
      reviewerId: user.id,
      score,
      notes: notes || null,
    },
  });

  const reviews = await prisma.contributionReview.findMany({
    where: { contributionId },
  });
  const avg = Math.round(
    reviews.reduce((s, r) => s + r.score, 0) / reviews.length
  );

  const accepted = avg >= 3;
  await prisma.contribution.update({
    where: { id: contributionId },
    data: {
      score: avg,
      status: accepted ? "ACCEPTED" : "REJECTED",
    },
  });

  await prisma.task.update({
    where: { id: contribution.taskId },
    data: { status: accepted ? TaskStatus.ACCEPTED : TaskStatus.OPEN },
  });

  if (accepted) {
    await prisma.user.update({
      where: { id: contribution.userId },
      data: { reputation: { increment: 5 } },
    });
  }

  await prisma.ledgerEntry.create({
    data: {
      projectId: contribution.task.projectId,
      kind: LedgerKind.LABOR,
      amountCents: 0,
      summary: `@${user.handle} reviewed contribution (${avg}/5) -> ${accepted ? "accepted" : "rejected"}`,
      actorHandle: user.handle,
    },
  });

  revalidatePath(`/projects/${contribution.task.project.slug}`);
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function demoDonateAction(formData: FormData) {
  const user = await requireUser();
  const rl = rateLimit(`donate:${user.id}`, { limit: 30, windowMs: 60 * 60 * 1000 });
  if (!rl.ok) return { error: `Rate limit: try again in ${rl.retryAfterSec}s` };
  const projectId = String(formData.get("projectId") || "");

  const potId = String(formData.get("potId") || "");
  const amountUsd = Number(formData.get("amountUsd") || 0);
  const message = String(formData.get("message") || "");

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
  // Otherwise record a transparent demo donation immediately.
  if (process.env.STRIPE_SECRET_KEY) {
    const Stripe = (await import("stripe")).default;
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const origin = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: amountCents,
            product_data: {
              name: `GrokForge: ${project.title} (${pot.label})`,
              description: message || "Greater-good project fund",
            },
          },
        },
      ],
      success_url: `${origin}/projects/${project.slug}?donated=1`,
      cancel_url: `${origin}/projects/${project.slug}?canceled=1`,
      metadata: {
        projectId,
        potId,
        donorId: user.id,
        message: message.slice(0, 400),
      },
    });
    if (session.url) {
      redirect(session.url);
    }
    return { error: "Stripe session missing URL" };
  }

  await prisma.$transaction([
    prisma.donation.create({
      data: {
        projectId,
        potId,
        donorId: user.id,
        amountCents,
        publicName: user.handle ? `@${user.handle}` : user.name,
        message: message || null,
        stripeSessionId: `demo_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      },
    }),
    prisma.fundPot.update({
      where: { id: potId },
      data: { balanceCents: { increment: amountCents } },
    }),
    prisma.ledgerEntry.create({
      data: {
        projectId,
        kind: LedgerKind.CAPITAL,
        amountCents,
        summary: `${user.handle ? `@${user.handle}` : user.name} donated $${amountUsd.toFixed(2)} to ${pot.label}`,
        actorHandle: user.handle,
      },
    }),
    prisma.user.update({
      where: { id: user.id },
      data: { reputation: { increment: 2 } },
    }),
  ]);

  revalidatePath(`/projects/${project.slug}`);
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function updateProfileAction(formData: FormData) {
  const user = await requireUser();
  const capacityNotes = String(formData.get("capacityNotes") || "").slice(0, 2000);
  const bio = String(formData.get("bio") || "").slice(0, 2000);
  const handleRaw = String(formData.get("handle") || "").replace(/^@/, "").slice(0, 32);

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
    },
  });

  revalidatePath("/dashboard");
  revalidatePath(`/u/${handleRaw || user.handle}`);
  return { ok: true };
}
