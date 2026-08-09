import { NextRequest } from "next/server";
import { requireApiUser, readJsonBody, jsonOk, jsonError } from "@/lib/api-v1";
import { publishSealedToGitHubForUser } from "@/lib/github-ship-ops";
import { prisma } from "@/lib/prisma";
import { hasScope } from "@/lib/api-tokens";

export const dynamic = "force-dynamic";

/**
 * POST /api/v1/projects/:id/publish-github
 * Body: { repoName? }
 * Scope: moderation:write (founder elevated). Phase 1 founder-only publish.
 */
export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const auth = await requireApiUser(req, "moderation:write");
  if (!auth.ok) return auth.response;

  if (!hasScope(auth.user.scopes, "moderation:write")) {
    return jsonError("moderation:write scope required for Ship to GitHub", 403);
  }

  const { id } = await ctx.params;
  if (!id) return jsonError("Missing project id or slug", 400);

  const project = await prisma.project.findFirst({
    where: { OR: [{ id }, { slug: id }] },
    select: { id: true, slug: true },
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
    const status = res.error.includes("only the founder")
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
