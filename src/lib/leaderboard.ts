/**
 * Top Contributors ranking for GrokForge.
 * Composite score from capital donated, labor (accepted work), reviews, reputation.
 */

export type LeaderboardWindow = "all" | "month" | "week";

export type LeaderboardInput = {
  userId: string;
  handle: string | null;
  name: string | null;
  image: string | null;
  reputation: number;
  /** Sum of donation amountCents in window */
  donationCents: number;
  /** Accepted contributions in window */
  acceptedContributions: number;
  /** Sum of estimatedTokens on accepted contribution tasks */
  estimatedTokens: number;
  /** Peer reviews written in window */
  reviewsGiven: number;
  /** Founder / staff badge */
  isFounder?: boolean;
  /** Current activity streak (days) */
  streakCurrent?: number;
};

export type LeaderboardRow = LeaderboardInput & {
  rank: number;
  score: number;
  estimatedHours: number;
  xProfileUrl: string | null;
  followUrl: string | null;
  isFounder: boolean;
  streakCurrent: number;
};

/** ~2k estimated tokens ~ 1 hour of agent labor (rough public proxy). */
export function tokensToHours(tokens: number): number {
  if (!Number.isFinite(tokens) || tokens <= 0) return 0;
  return Math.round((tokens / 2000) * 10) / 10;
}

/**
 * Weighted impact score (higher = better).
 * - Capital: dollars donated * 0.4
 * - Labor quality: accepted submissions * 25 * 0.3
 * - Hours proxy: hours * 10 * 0.2
 * - Reviews: reviews * 5 * 0.1
 * - Reputation: rep * 0.5 * 0.1 (capped influence via weight)
 */
export function computeImpactScore(row: LeaderboardInput): number {
  const dollars = Math.max(0, row.donationCents) / 100;
  const hours = tokensToHours(row.estimatedTokens);
  const capital = dollars * 0.4;
  const labor = Math.max(0, row.acceptedContributions) * 25 * 0.3;
  const time = hours * 10 * 0.2;
  const reviews = Math.max(0, row.reviewsGiven) * 5 * 0.1;
  const rep = Math.max(0, row.reputation) * 0.5 * 0.1;
  return Math.round((capital + labor + time + reviews + rep) * 100) / 100;
}

export function xUrls(handle: string | null): {
  xProfileUrl: string | null;
  followUrl: string | null;
} {
  if (!handle) return { xProfileUrl: null, followUrl: null };
  const h = handle.replace(/^@/, "").trim();
  if (!h || !/^[A-Za-z0-9_]{1,32}$/.test(h)) {
    return { xProfileUrl: null, followUrl: null };
  }
  return {
    xProfileUrl: `https://x.com/${h}`,
    followUrl: `https://x.com/intent/follow?screen_name=${encodeURIComponent(h)}`,
  };
}

export function rankContributors(
  rows: LeaderboardInput[],
  limit = 50
): LeaderboardRow[] {
  const scored = rows
    .map((r) => {
      const score = computeImpactScore(r);
      const estimatedHours = tokensToHours(r.estimatedTokens);
      const urls = xUrls(r.handle);
      return {
        ...r,
        score,
        estimatedHours,
        isFounder: Boolean(r.isFounder),
        streakCurrent: r.streakCurrent || 0,
        ...urls,
      };
    })
    .filter((r) => r.score > 0 || r.reputation > 0 || r.donationCents > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (b.donationCents !== a.donationCents) return b.donationCents - a.donationCents;
      if (b.acceptedContributions !== a.acceptedContributions) {
        return b.acceptedContributions - a.acceptedContributions;
      }
      return (a.handle || "").localeCompare(b.handle || "");
    })
    .slice(0, limit);

  return scored.map((r, i) => ({ ...r, rank: i + 1 }));
}

export function windowStart(window: LeaderboardWindow): Date | null {
  if (window === "all") return null;
  const d = new Date();
  if (window === "week") {
    d.setUTCDate(d.getUTCDate() - 7);
    return d;
  }
  d.setUTCDate(d.getUTCDate() - 30);
  return d;
}
