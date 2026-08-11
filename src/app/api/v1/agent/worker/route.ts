import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  jsonError,
  jsonOk,
  readJsonBody,
  requireApiUser,
} from "@/lib/api-v1";
import { claimTaskForUser, submitContributionForUser } from "@/lib/task-ops";
import { readyOpenLeaves } from "@/lib/task-dag";

export const dynamic = "force-dynamic";

/**
 * Agent worker cycle (unattended-friendly loop step):
 *
 * POST body:
 *   { "action": "claim", "projectSlug"?: string }
 *   { "action": "submit", "taskId": string, "body": string, "sources"?: string }
 *   { "action": "cycle", "projectSlug"?: string }  // claim only; local model fills body
 *
 * Does not run models server-side (keys stay local). Claim + submit only.
 */
export async function POST(req: NextRequest) {
  const auth = await requireApiUser(req, "claims:write");
  if (!auth.ok) return auth.response;

  const parsed = await readJsonBody(req);
  if (!parsed.ok) return parsed.response;
  const action = String(parsed.body.action || "cycle");

  if (action === "submit") {
    const taskId = String(parsed.body.taskId || "");
    const body = String(parsed.body.body || "");
    const sources = String(parsed.body.sources || "");
    if (!taskId || body.trim().length < 20) {
      return jsonError("submit needs taskId and body (20+ chars)", 400);
    }
    // contributions:write may be required for submit
    const { hasScope } = await import("@/lib/api-tokens");
    if (!hasScope(auth.user.scopes, "contributions:write")) {
      return jsonError("Missing scope: contributions:write", 403);
    }
    const res = await submitContributionForUser(auth.user, {
      taskId,
      body,
      sources,
      contentType: String(parsed.body.contentType || "markdown"),
    });
    if ("error" in res) return jsonError(res.error, 400);
    return jsonOk({
      ok: true,
      action: "submit",
      contributionId: res.contributionId,
      receiptPath: res.receiptPath,
    });
  }

  // claim / cycle
  const projectSlug =
    typeof parsed.body.projectSlug === "string"
      ? parsed.body.projectSlug
      : undefined;
  const taskIdIn =
    typeof parsed.body.taskId === "string" ? parsed.body.taskId : undefined;

  let taskId = taskIdIn;
  if (!taskId) {
    const peek = await peekReady(projectSlug);
    if (!peek) return jsonError("No ready OPEN leaves", 404);
    taskId = peek.id;
  }

  const claimed = await claimTaskForUser(auth.user, taskId);
  if ("error" in claimed) {
    return jsonError(claimed.error, claimed.error.startsWith("Rate") ? 429 : 400);
  }

  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: {
      project: { select: { slug: true, title: true, license: true } },
    },
  });

  return jsonOk({
    ok: true,
    action: "claim",
    claimId: claimed.claimId,
    expiresAt: claimed.expiresAt.toISOString(),
    task: task
      ? {
          id: task.id,
          title: task.title,
          prompt: task.prompt,
          acceptanceCriteria: task.acceptanceCriteria,
          estimatedTokens: task.estimatedTokens,
          tags: task.tags,
          project: task.project,
        }
      : { id: taskId },
    next: {
      runLocalModel: true,
      submit: {
        action: "submit",
        taskId,
        body: "<deliverable markdown meeting acceptanceCriteria>",
      },
    },
    rails: {
      neverSendSuperGrokKeys: true,
      secretScanOnSubmit: true,
      dualKeyMayBlockAccept: true,
    },
  });
}

async function peekReady(projectSlug?: string) {
  const projects = await prisma.project.findMany({
    where: {
      status: { in: ["ACTIVE", "FUNDED"] },
      ...(projectSlug ? { slug: projectSlug } : {}),
    },
    select: {
      slug: true,
      tasks: {
        select: {
          id: true,
          title: true,
          status: true,
          parentId: true,
          sortOrder: true,
          dependsOnJson: true,
          estimatedTokens: true,
          goodFirst: true,
          tags: true,
          claims: { where: { active: true }, select: { id: true } },
        },
      },
    },
    take: projectSlug ? 1 : 25,
    orderBy: { updatedAt: "desc" },
  });
  for (const p of projects) {
    for (const r of readyOpenLeaves(p.tasks)) {
      const t = p.tasks.find((x) => x.id === r.id);
      if (t && t.claims.length === 0) return t;
    }
  }
  return null;
}
