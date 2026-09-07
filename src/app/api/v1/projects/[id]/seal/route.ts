import { NextRequest } from "next/server";
import { requireApiUser, readJsonBody, jsonOk, jsonError } from "@/lib/api-v1";
import { sealProjectForUser } from "@/lib/seal-ops";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * POST /api/v1/projects/:id/seal
 * Body: { sealNote, version?, packageTitle? }
 * Scope: moderation:write (founder elevated) OR project proposer with any token
 * (proposer check inside sealProjectForUser; founderOverride when moderation scope).
 */
export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const auth = await requireApiUser(req, "contributions:write");
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

  const sealNote = String(body.body.sealNote || "");
  const version =
    typeof body.body.version === "string" ? body.body.version : undefined;
  const packageTitle =
    typeof body.body.packageTitle === "string"
      ? body.body.packageTitle
      : undefined;

  const { hasScope } = await import("@/lib/api-tokens");
  const elevated = hasScope(auth.user.scopes, "moderation:write");

  if (project.proposerId !== auth.user.id && !elevated) {
    return jsonError("Only the project creator or founder elevated token may seal", 403);
  }

  const res = await sealProjectForUser(
    {
      id: auth.user.id,
      handle: auth.user.handle,
      name: auth.user.name,
    },
    {
      projectId: project.id,
      sealNote,
      version,
      packageTitle,
    },
    { via: "api", founderOverride: elevated }
  );

  if ("error" in res) {
    const status = res.error.includes("Only") ? 403 : 400;
    return jsonError(res.error, status);
  }

  return jsonOk({
    ok: true as const,
    artifactId: res.artifactId,
    version: res.version,
    contentHash: res.contentHash,
    shipPath: res.shipPath,
    downloadPath: res.downloadPath,
    shipUrl: `https://grokforge.app${res.shipPath}`,
    downloadUrl: `https://grokforge.app${res.downloadPath}`,
  });
}
