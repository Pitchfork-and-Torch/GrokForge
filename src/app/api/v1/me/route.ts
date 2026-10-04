import { NextRequest } from "next/server";
import { jsonOk, requireApiUser } from "@/lib/api-v1";
import { hasScope, parseScopes } from "@/lib/api-tokens";
import { isFounderHandle } from "@/lib/identity";

export const dynamic = "force-dynamic";

/** GET /api/v1/me - who am I (Bearer agent token) */
export async function GET(req: NextRequest) {
  const auth = await requireApiUser(req);
  if (!auth.ok) return auth.response;

  const u = auth.user;
  return jsonOk({
    id: u.id,
    handle: u.handle,
    name: u.name,
    image: u.image,
    reputation: u.reputation,
    scopes: parseScopes(u.scopes),
    tokenId: u.tokenId,
    isFounder: isFounderHandle(u.handle),
    canModerate: hasScope(u.scopes, "moderation:write"),
  });
}
