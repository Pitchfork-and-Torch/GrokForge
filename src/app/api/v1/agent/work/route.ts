import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonError, jsonOk, requireApiUser, readJsonBody } from "@/lib/api-v1";
import { claimTaskForUser } from "@/lib/task-ops";
import { readyOpenLeaves } from "@/lib/task-dag";
import { hasScope } from "@/lib/api-tokens";

export const dynamic = "force-dynamic";

/**
 * Agent Runtime work package:
 * GET  - peek next ready OPEN leaf (?project=slug)
 * POST - claim next ready leaf (or taskId) and return prompt package
 *
 * Auth: Bearer gf_...  Never SuperGrok keys.
 */
export async function GET(req: NextRequest) {
  const auth = await requireApiUser(req, "tasks:read");
  if (!auth.ok) return auth.response;

  const projectSlug = new URL(req.url).searchParams.get("project") || undefined;
  const pack = await peekReadyLeaf(projectSlug);
  if (!pack) {
    return jsonOk({ ok: true, task: null, message: "No ready OPEN leaves" });
  }
  return jsonOk({ ok: true, task: pack });
}

export async function POST(req: NextRequest) {
  const auth = await requireApiUser(req, "claims:write");
  if (!auth.ok) return auth.response;
  if (!hasScope(auth.user.scopes, "tasks:read")) {
    // claims:write tokens usually include tasks:read; soft-require for clarity
  }

  const parsed = await readJsonBody(req);
  if (!parsed.ok) return parsed.response;
  const projectSlug =
    typeof parsed.body.projectSlug === "string"
      ? parsed.body.projectSlug
      : undefined;
  let taskId =
    typeof parsed.body.taskId === "string" ? parsed.body.taskId : undefined;

  if (!taskId) {
    const pack = await peekReadyLeaf(projectSlug);
    if (!pack) {
      return jsonError("No ready OPEN leaves to claim", 404);
    }
    taskId = pack.id;
  }

  const res = await claimTaskForUser(auth.user, taskId);
  if ("error" in res) {
    const status =
      res.error === "Task not found"
        ? 404
        : res.error.startsWith("Rate limit")
          ? 429
          : 400;
    return jsonError(res.error, status);
  }

  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: {
      project: {
        select: { slug: true, title: true, license: true, category: true },
      },
    },
  });

  return jsonOk({
    ok: true,
    claimId: res.claimId,
    expiresAt: res.expiresAt.toISOString(),
    task: task
      ? {
          id: task.id,
          title: task.title,
          prompt: task.prompt,
          acceptanceCriteria: task.acceptanceCriteria,
          estimatedTokens: task.estimatedTokens,
          tags: task.tags,
          goodFirst: task.goodFirst,
          project: task.project,
        }
      : { id: taskId },
    submitHint: {
      method: "POST",
      path: `/api/v1/tasks/${taskId}/submit`,
      body: {
        body: "# Deliverable markdown...",
        contentType: "markdown",
        sources: "",
      },
    },
    rails: {
      neverSendSuperGrokKeys: true,
      secretScanOnSubmit: true,
      readySetAware: true,
    },
  });
}

async function peekReadyLeaf(projectSlug?: string) {
  const projects = await prisma.project.findMany({
    where: {
      status: { in: ["ACTIVE", "FUNDED"] },
      ...(projectSlug ? { slug: projectSlug } : {}),
    },
    select: {
      slug: true,
      title: true,
      license: true,
      tasks: {
        select: {
          id: true,
          title: true,
          status: true,
          parentId: true,
          sortOrder: true,
          estimatedTokens: true,
          goodFirst: true,
          tags: true,
          dependsOnJson: true,
          prompt: true,
          acceptanceCriteria: true,
          claims: { where: { active: true }, select: { id: true } },
        },
      },
    },
    take: projectSlug ? 1 : 30,
    orderBy: { updatedAt: "desc" },
  });

  for (const p of projects) {
    const ready = readyOpenLeaves(p.tasks);
    for (const r of ready) {
      const full = p.tasks.find((t) => t.id === r.id);
      if (!full || full.claims.length > 0) continue;
      return {
        id: full.id,
        title: full.title,
        prompt: full.prompt,
        acceptanceCriteria: full.acceptanceCriteria,
        estimatedTokens: full.estimatedTokens,
        tags: full.tags,
        goodFirst: full.goodFirst,
        projectSlug: p.slug,
        projectTitle: p.title,
        license: p.license,
      };
    }
  }
  return null;
}
