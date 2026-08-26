import { NextRequest } from "next/server";
import { requireApiUser, jsonOk, jsonError } from "@/lib/api-v1";
import { bulkAcceptPendingForUser } from "@/lib/moderation-ops";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * POST /api/v1/projects/:id/bulk-accept
 * Accepts all PENDING contributions on the project (max 50).
 * Scope: moderation:write (founder elevated token)
 * :id may be project id or slug.
 */
export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const auth = await requireApiUser(req, "moderation:write");
  if (!auth.ok) return auth.response;

  const { id } = await ctx.params;
  if (!id) return jsonError("Missing project id or slug", 400);

  const project = await prisma.project.findFirst({
    where: { OR: [{ id }, { slug: id }] },
    select: { id: true, slug: true, title: true },
  });
  if (!project) return jsonError("Project not found", 404);

  const res = await bulkAcceptPendingForUser(
    {
      id: auth.user.id,
      handle: auth.user.handle,
      name: auth.user.name,
    },
    project.id,
    { via: "api", founderOverride: true }
  );

  if ("error" in res) {
    const status =
      res.error.includes("Only") || res.error.includes("founder")
        ? 403
        : 400;
    return jsonError(res.error, status);
  }

  return jsonOk({
    ok: true,
    projectId: project.id,
    slug: project.slug,
    title: project.title,
    accepted: res.accepted,
    message: `Bulk-accepted ${res.accepted} pending submission(s).`,
  });
}
