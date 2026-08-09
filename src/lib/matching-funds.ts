/**
 * Pure matching-funds math (no Prisma).
 * Ratio is basis points: 10000 = 100% (1:1 match).
 */

export type MatchInput = {
  donationCents: number;
  matchingEnabled: boolean;
  matchingRatioBps: number;
  matchingRemainingCents: number;
};

export type MatchResult = {
  matchCents: number;
  remainingAfter: number;
  ratioLabel: string;
};

export function clampRatioBps(raw: number): number {
  if (!Number.isFinite(raw)) return 10000;
  return Math.max(0, Math.min(50000, Math.round(raw)));
}

export function ratioLabel(bps: number): string {
  const r = clampRatioBps(bps) / 10000;
  if (r === 1) return "1:1";
  if (r === 0) return "0%";
  if (Number.isInteger(r)) return `${r}:1`;
  return `${Math.round(r * 100)}%`;
}

/** How much of the match pool will fire for this donation. */
export function computeMatch(input: MatchInput): MatchResult {
  const donationCents = Math.max(0, Math.floor(input.donationCents || 0));
  const remaining = Math.max(0, Math.floor(input.matchingRemainingCents || 0));
  const bps = clampRatioBps(input.matchingRatioBps);
  if (!input.matchingEnabled || donationCents < 1 || remaining < 1 || bps < 1) {
    return {
      matchCents: 0,
      remainingAfter: remaining,
      ratioLabel: ratioLabel(bps),
    };
  }
  const ideal = Math.floor((donationCents * bps) / 10000);
  const matchCents = Math.min(ideal, remaining);
  return {
    matchCents,
    remainingAfter: remaining - matchCents,
    ratioLabel: ratioLabel(bps),
  };
}

export function matchingProgress(pool: number, remaining: number): {
  used: number;
  pct: number;
} {
  const p = Math.max(0, pool);
  const r = Math.max(0, remaining);
  const used = Math.max(0, p - r);
  const pct = p > 0 ? Math.min(100, Math.round((used / p) * 100)) : 0;
  return { used, pct };
}
