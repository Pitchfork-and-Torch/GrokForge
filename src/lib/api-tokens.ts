import { createHash, randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { isFounderHandle } from "@/lib/identity";

/** Platform agent scopes (not xAI keys). */
export const API_SCOPES = [
  "tasks:read",
  "claims:write",
  "contributions:write",
  /** Founder-only: peer-style review write (reserved / future) */
  "reviews:write",
  /** Founder-only: accept/reject pending submissions, bulk-accept */
  "moderation:write",
] as const;

export type ApiScope = (typeof API_SCOPES)[number];

/** Scopes only the founder may mint on a personal access token. */
export const FOUNDER_ONLY_SCOPES: ApiScope[] = [
  "reviews:write",
  "moderation:write",
];

export const DEFAULT_SCOPES: ApiScope[] = [
  "tasks:read",
  "claims:write",
  "contributions:write",
];

/** Full builder + founder elevated set. */
export const FOUNDER_ELEVATED_SCOPES: ApiScope[] = [
  ...DEFAULT_SCOPES,
  ...FOUNDER_ONLY_SCOPES,
];

export function hashToken(raw: string): string {
  return createHash("sha256").update(raw, "utf8").digest("hex");
}

export function parseScopes(scopes: string): string[] {
  return scopes
    .split(/[\s,]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function hasScope(scopes: string, need: ApiScope | string): boolean {
  const set = new Set(parseScopes(scopes));
  return set.has(need);
}

export function generateRawToken(): { raw: string; prefix: string; hash: string } {
  const body = randomBytes(32).toString("base64url");
  const raw = `gf_${body}`;
  const prefix = raw.slice(0, 12);
  return { raw, prefix, hash: hashToken(raw) };
}

export type CreateTokenInput = {
  userId: string;
  name: string;
  scopes?: string[];
  /** Days until expiry; null = no expiry. Default 90. */
  expiresInDays?: number | null;
  /** Required when requesting FOUNDER_ONLY_SCOPES. */
  actorHandle?: string | null;
};

export async function createApiToken(input: CreateTokenInput) {
  const name = input.name.trim().slice(0, 80) || "Agent token";
  const requested = (input.scopes?.length ? input.scopes : DEFAULT_SCOPES).filter(
    (s) => (API_SCOPES as readonly string[]).includes(s)
  );
  const wantsElevated = requested.some((s) =>
    (FOUNDER_ONLY_SCOPES as readonly string[]).includes(s)
  );
  if (wantsElevated && !isFounderHandle(input.actorHandle)) {
    throw new Error(
      "Elevated scopes (moderation:write, reviews:write) are founder-only"
    );
  }
  const scopes = requested.join(" ");
  if (!scopes) {
    throw new Error("At least one valid scope is required");
  }

  const activeCount = await prisma.apiToken.count({
    where: { userId: input.userId, revokedAt: null },
  });
  if (activeCount >= 10) {
    throw new Error("Max 10 active agent tokens. Revoke one first.");
  }

  const { raw, prefix, hash } = generateRawToken();
  let expiresAt: Date | null = null;
  if (input.expiresInDays === null) {
    expiresAt = null;
  } else {
    const days = input.expiresInDays ?? 90;
    expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  }

  const row = await prisma.apiToken.create({
    data: {
      userId: input.userId,
      name,
      scopes,
      tokenHash: hash,
      tokenPrefix: prefix,
      expiresAt,
    },
  });

  return {
    id: row.id,
    name: row.name,
    scopes: row.scopes,
    tokenPrefix: row.tokenPrefix,
    expiresAt: row.expiresAt,
    createdAt: row.createdAt,
    /** Shown once - never stored again */
    token: raw,
  };
}

export async function revokeApiToken(userId: string, tokenId: string) {
  const row = await prisma.apiToken.findFirst({
    where: { id: tokenId, userId },
  });
  if (!row) return { error: "Token not found" as const };
  if (row.revokedAt) return { ok: true as const, already: true as const };
  await prisma.apiToken.update({
    where: { id: tokenId },
    data: { revokedAt: new Date() },
  });
  return { ok: true as const, already: false as const };
}

export type AuthedApiUser = {
  id: string;
  name: string | null;
  email: string | null;
  handle: string | null;
  image: string | null;
  reputation: number;
  tokenId: string;
  scopes: string;
};

/**
 * Resolve Bearer gf_... token to user. Updates lastUsedAt (throttled).
 */
export async function authenticateBearer(
  authorizationHeader: string | null
): Promise<
  | { ok: true; user: AuthedApiUser }
  | { ok: false; status: number; error: string }
> {
  if (!authorizationHeader) {
    return { ok: false, status: 401, error: "Missing Authorization header" };
  }
  const m = authorizationHeader.match(/^Bearer\s+(\S+)/i);
  if (!m) {
    return { ok: false, status: 401, error: "Expected Authorization: Bearer <token>" };
  }
  const raw = m[1].trim();
  if (!raw.startsWith("gf_") || raw.length < 20) {
    return { ok: false, status: 401, error: "Invalid token format" };
  }

  const tokenHash = hashToken(raw);
  const row = await prisma.apiToken.findUnique({
    where: { tokenHash },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          handle: true,
          image: true,
          reputation: true,
        },
      },
    },
  });

  if (!row || row.revokedAt) {
    return { ok: false, status: 401, error: "Invalid or revoked token" };
  }
  if (row.expiresAt && row.expiresAt.getTime() < Date.now()) {
    return { ok: false, status: 401, error: "Token expired" };
  }

  // Throttle lastUsedAt writes to once per minute
  const last = row.lastUsedAt?.getTime() ?? 0;
  if (Date.now() - last > 60_000) {
    await prisma.apiToken
      .update({
        where: { id: row.id },
        data: { lastUsedAt: new Date() },
      })
      .catch(() => {});
  }

  return {
    ok: true,
    user: {
      id: row.user.id,
      name: row.user.name,
      email: row.user.email,
      handle: row.user.handle,
      image: row.user.image,
      reputation: row.user.reputation,
      tokenId: row.id,
      scopes: row.scopes,
    },
  };
}

export function rejectXaiKeyFields(body: unknown): string | null {
  if (!body || typeof body !== "object") return null;
  const o = body as Record<string, unknown>;
  const bannedKeys = [
    "xaiApiKey",
    "xai_api_key",
    "XAI_API_KEY",
    "superGrokKey",
    "supergrok",
    "api_key",
    "openaiApiKey",
  ];
  for (const k of bannedKeys) {
    if (k in o && o[k]) {
      return "GrokForge never accepts xAI/SuperGrok keys. Use a GrokForge agent token only; run Grok in your own client.";
    }
  }
  return null;
}
