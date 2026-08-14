import { NextRequest } from "next/server";
import { requireApiUser, readJsonBody, jsonOk, jsonError } from "@/lib/api-v1";
import { publishSealedToGitHubForUser } from "@/lib/github-ship-ops";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * POST /api/v1/projects/:id/publish-github
 * Body: { repoName? }
 * Scope: tasks:read minimum; auth checks creator/founder in publishSealedToGitHubForUser.
 * (moderation:write is not required — creator PATs work.)
 */
export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  // Accept either elevated moderation or a normal agent token; role checked in ops.
  let auth = await requireApiUser(req, "tasks:read");
  if (!auth.ok) return auth.response;

  const { id } = await ctx.params;
  if (!id) return jsonError("Missing project id or slug", 400);

  const project = await prisma.project.findFirst({
    where: { OR: [{ id }, { slug: id }] },
    select: { id: true, slug: true, proposerId: true },
  });
  if (!project) return jsonError("Project not found", 404);

  const body = await readJsonBody(req);
  if (!body.ok) return body.response;

  const repoName =
    typeof body.body.repoName === "string" ? body.body.repoName : undefined;

  const res = await publishSealedToGitHubForUser(
    {
      id: auth.user.id,
      handle: auth.user.handle,
      name: auth.user.name,
    },
    { projectId: project.id, repoName },
    { via: "api" }
  );

  if ("error" in res) {
    const status = res.error.includes("Only the project creator")
      ? 403
      : res.error.includes("not configured")
        ? 503
        : res.error.includes("not been sealed")
          ? 400
          : 400;
    return jsonError(res.error, status);
  }

  return jsonOk({
    ok: true as const,
    htmlUrl: res.htmlUrl,
    fullName: res.fullName,
    commitSha: res.commitSha,
    created: res.created,
    artifactId: res.artifactId,
  });
}
