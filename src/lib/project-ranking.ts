/**
 * Weighted project ranking for GrokForge (developers / greater-good group).
 * Scores 1-5 per criterion; total = sum(score * weight), max 5.00.
 */

export type RankingCriterionId =
  | "strategicAlignment"
  | "technicalFeasibility"
  | "businessValue"
  | "effortDemand"
  | "riskUncertainty"
  | "timeSensitivity";

export type RankingCriterion = {
  id: RankingCriterionId;
  label: string;
  shortLabel: string;
  weight: number;
  /** Score 5 */
  high: string;
  /** Score 3 */
  mid: string;
  /** Score 1 */
  low: string;
};

export const RANKING_CRITERIA: RankingCriterion[] = [
  {
    id: "strategicAlignment",
    label: "Strategic Alignment",
    shortLabel: "Strategy",
    weight: 0.2,
    high: "Core enabler of a major roadmap item or primary group objectives",
    mid: "Solid but secondary alignment to stated priorities",
    low: "Weak or peripheral connection to priorities",
  },
  {
    id: "technicalFeasibility",
    label: "Technical Feasibility and Complexity",
    shortLabel: "Feasibility",
    weight: 0.2,
    high: "Approach well understood, low risk, skills and building blocks available",
    mid: "Moderate uncertainty or some new learning required",
    low: "High technical risk, unproven stack, or significant skill gaps",
  },
  {
    id: "businessValue",
    label: "Business and User Value",
    shortLabel: "Value",
    weight: 0.2,
    high: "Clear high-value outcomes that are measurable and likely",
    mid: "Moderate or indirect value",
    low: "Limited or speculative value",
  },
  {
    id: "effortDemand",
    label: "Effort and Resource Demand",
    shortLabel: "Effort",
    weight: 0.15,
    high: "Deliverable with current capacity and minimal external dependencies",
    mid: "Noticeable but manageable resource pressure",
    low: "Needs substantial extra capacity or creates serious contention",
  },
  {
    id: "riskUncertainty",
    label: "Risk and Uncertainty",
    shortLabel: "Risk",
    weight: 0.15,
    high: "Low residual risk after planned mitigations",
    mid: "Moderate residual risk that can be managed",
    low: "High residual risk that could jeopardize delivery or quality",
  },
  {
    id: "timeSensitivity",
    label: "Time Sensitivity and Opportunity Window",
    shortLabel: "Timing",
    weight: 0.1,
    high: "Time-critical; delay causes material loss of value or opportunity",
    mid: "Moderate time pressure",
    low: "Can wait without significant consequence",
  },
];

export type RankingScores = Record<RankingCriterionId, number>;

export type RankingNotes = Partial<Record<RankingCriterionId, string>>;

export type RankingBreakdownRow = {
  id: RankingCriterionId;
  label: string;
  shortLabel: string;
  weight: number;
  score: number;
  weighted: number;
  note?: string;
};

/** Clamp integer score to 1-5 */
export function clampScore(n: number): number {
  if (!Number.isFinite(n)) return 1;
  return Math.min(5, Math.max(1, Math.round(n)));
}

/**
 * Weighted total. Max 5.00 when all criteria score 5.
 * total = sum(score_i * weight_i)
 */
export function computeRankingTotal(scores: RankingScores): number {
  let total = 0;
  for (const c of RANKING_CRITERIA) {
    total += clampScore(scores[c.id]) * c.weight;
  }
  return Math.round(total * 100) / 100;
}

export function rankingBreakdown(
  scores: RankingScores,
  notes?: RankingNotes
): RankingBreakdownRow[] {
  return RANKING_CRITERIA.map((c) => {
    const score = clampScore(scores[c.id]);
    return {
      id: c.id,
      label: c.label,
      shortLabel: c.shortLabel,
      weight: c.weight,
      score,
      weighted: Math.round(score * c.weight * 100) / 100,
      note: notes?.[c.id]?.trim() || undefined,
    };
  });
}

export function formatRankingTotal(total: number | null | undefined): string {
  if (total == null || !Number.isFinite(total)) return "—";
  return total.toFixed(2);
}

/** Rank projects that have scorecards (highest total first). Unscored last. */
export function sortByRankingTotal<T extends { totalScore?: number | null }>(
  rows: T[]
): T[] {
  return [...rows].sort((a, b) => {
    const ta = a.totalScore;
    const tb = b.totalScore;
    if (ta == null && tb == null) return 0;
    if (ta == null) return 1;
    if (tb == null) return -1;
    return tb - ta;
  });
}

export const SCORE_FIELD_MAP = {
  strategicAlignment: "strategicAlignment",
  technicalFeasibility: "technicalFeasibility",
  businessValue: "businessValue",
  effortDemand: "effortDemand",
  riskUncertainty: "riskUncertainty",
  timeSensitivity: "timeSensitivity",
} as const;

export const NOTE_FIELD_MAP: Record<RankingCriterionId, string> = {
  strategicAlignment: "strategicNote",
  technicalFeasibility: "technicalNote",
  businessValue: "businessNote",
  effortDemand: "effortNote",
  riskUncertainty: "riskNote",
  timeSensitivity: "timeNote",
};
