import { createHash, timingSafeEqual } from "crypto";
import type { NextRequest } from "next/server";

/**
 * Constant-time string compare. Hash both sides so length mismatch
 * cannot throw and does not leak secret length.
 */
function timingSafeEqualUtf8(a: string, b: string): boolean {
  const ha = createHash("sha256").update(a, "utf8").digest();
  const hb = createHash("sha256").update(b, "utf8").digest();
  return timingSafeEqual(ha, hb);
}

/**
 * Cron routes: Authorization: Bearer <CRON_SECRET> only.
 * Never accept ?secret= (leaks into access logs / Referer).
 */
export function authorizeCron(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    // Fail closed in production when secret missing
    if (process.env.VERCEL_ENV === "production") return false;
    return true;
  }
  const auth = req.headers.get("authorization") || "";
  // Vercel Cron sends Authorization: Bearer <CRON_SECRET> when configured
  return timingSafeEqualUtf8(auth, `Bearer ${secret}`);
}
