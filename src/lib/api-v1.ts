import { NextRequest, NextResponse } from "next/server";
import {
  authenticateBearer,
  hasScope,
  rejectXaiKeyFields,
  type ApiScope,
  type AuthedApiUser,
} from "@/lib/api-tokens";
import { rateLimitAsync } from "@/lib/rate-limit";
import { canonicalSiteUrl } from "@/lib/site-identity";

export function jsonOk(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

export function jsonError(error: string, status: number) {
  return NextResponse.json({ error }, { status });
}

export async function requireApiUser(
  req: NextRequest,
  scope?: ApiScope
): Promise<
  | { ok: true; user: AuthedApiUser }
  | { ok: false; response: NextResponse }
> {
  const auth = await authenticateBearer(req.headers.get("authorization"));
  if (!auth.ok) {
    return { ok: false, response: jsonError(auth.error, auth.status) };
  }

  const rl = await rateLimitAsync(`api-v1:${auth.user.id}`, {
    limit: 120,
    windowMs: 60 * 60 * 1000,
  });
  if (!rl.ok) {
    return {
      ok: false,
      response: jsonError(
        `Rate limit: try again in ${rl.retryAfterSec}s`,
        429
      ),
    };
  }

  if (scope && !hasScope(auth.user.scopes, scope)) {
    return {
      ok: false,
      response: jsonError(`Missing scope: ${scope}`, 403),
    };
  }

  return { ok: true, user: auth.user };
}

export async function readJsonBody(
  req: NextRequest
): Promise<
  | { ok: true; body: Record<string, unknown> }
  | { ok: false; response: NextResponse }
> {
  let body: unknown = {};
  const text = await req.text();
  if (text.trim()) {
    try {
      body = JSON.parse(text);
    } catch {
      return { ok: false, response: jsonError("Invalid JSON body", 400) };
    }
  }
  if (body && typeof body !== "object") {
    return { ok: false, response: jsonError("JSON body must be an object", 400) };
  }
  const ban = rejectXaiKeyFields(body);
  if (ban) {
    return { ok: false, response: jsonError(ban, 400) };
  }
  return { ok: true, body: (body || {}) as Record<string, unknown> };
}

export function publicBaseUrl(req: NextRequest) {
  const env =
    process.env.NEXTAUTH_URL ||
    process.env.AUTH_URL ||
    process.env.NEXT_PUBLIC_SITE_URL;
  if (env) return canonicalSiteUrl(env);
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
  const proto = req.headers.get("x-forwarded-proto") || "https";
  if (host) {
    const origin = `${proto}://${host.split(",")[0]?.trim()}`;
    return canonicalSiteUrl(origin);
  }
  return canonicalSiteUrl(null);
}
