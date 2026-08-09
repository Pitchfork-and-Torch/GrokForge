/**
 * Rate limiter: Upstash Redis when configured, else in-memory (single warm instance).
 *
 * Env (optional):
 *   UPSTASH_REDIS_REST_URL
 *   UPSTASH_REDIS_REST_TOKEN
 */

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

function memoryLimit(
  key: string,
  opts: { limit: number; windowMs: number }
): { ok: true } | { ok: false; retryAfterSec: number } {
  const now = Date.now();
  const existing = buckets.get(key);
  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + opts.windowMs });
    return { ok: true };
  }
  if (existing.count >= opts.limit) {
    return {
      ok: false,
      retryAfterSec: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    };
  }
  existing.count += 1;
  return { ok: true };
}

async function upstashLimit(
  key: string,
  opts: { limit: number; windowMs: number }
): Promise<{ ok: true } | { ok: false; retryAfterSec: number } | null> {
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (!url || !token) return null;

  const windowSec = Math.max(1, Math.ceil(opts.windowMs / 1000));
  const redisKey = `rl:${key}`;

  try {
    // INCR then EXPIRE on first hit
    const incrRes = await fetch(`${url}/incr/${encodeURIComponent(redisKey)}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!incrRes.ok) return null;
    const incrJson = (await incrRes.json()) as { result?: number };
    const count = Number(incrJson.result || 0);

    if (count === 1) {
      await fetch(
        `${url}/expire/${encodeURIComponent(redisKey)}/${windowSec}`,
        {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        }
      );
    }

    if (count > opts.limit) {
      const ttlRes = await fetch(`${url}/ttl/${encodeURIComponent(redisKey)}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      let retryAfterSec = windowSec;
      if (ttlRes.ok) {
        const ttlJson = (await ttlRes.json()) as { result?: number };
        if (typeof ttlJson.result === "number" && ttlJson.result > 0) {
          retryAfterSec = ttlJson.result;
        }
      }
      return { ok: false, retryAfterSec };
    }
    return { ok: true };
  } catch {
    return null;
  }
}

export function rateLimit(
  key: string,
  opts: { limit: number; windowMs: number }
): { ok: true } | { ok: false; retryAfterSec: number } {
  // Sync API used by server actions - try Upstash only if we can block briefly
  // For sync callers, use memory. Prefer rateLimitAsync in new code.
  return memoryLimit(key, opts);
}

/** Preferred: async path with Upstash when configured. */
export async function rateLimitAsync(
  key: string,
  opts: { limit: number; windowMs: number }
): Promise<{ ok: true } | { ok: false; retryAfterSec: number }> {
  const remote = await upstashLimit(key, opts);
  if (remote) return remote;
  return memoryLimit(key, opts);
}

export function rateLimitBackend(): "upstash" | "memory" {
  if (
    process.env.UPSTASH_REDIS_REST_URL?.trim() &&
    process.env.UPSTASH_REDIS_REST_TOKEN?.trim()
  ) {
    return "upstash";
  }
  return "memory";
}

if (typeof setInterval === "function" && typeof process !== "undefined") {
  const timer = setInterval(() => {
    const now = Date.now();
    for (const [k, b] of buckets) {
      if (b.resetAt <= now) buckets.delete(k);
    }
  }, 60_000);
  timer.unref?.();
}
