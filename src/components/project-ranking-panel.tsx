import Link from "next/link";
import { Badge, Card, ProgressBar } from "@/components/ui";
import {
  formatRankingTotal,
  rankingBreakdown,
  type RankingScores,
} from "@/lib/project-ranking";

export type ScorecardView = {
  totalScore: number;
  strategicAlignment: number;
  technicalFeasibility: number;
  businessValue: number;
  effortDemand: number;
  riskUncertainty: number;
  timeSensitivity: number;
  strategicNote: string | null;
  technicalNote: string | null;
  businessNote: string | null;
  effortNote: string | null;
  riskNote: string | null;
  timeNote: string | null;
  scorerHandle: string | null;
  updatedAt: Date | string;
  /** 1-based rank among scored projects, if known */
  rank?: number | null;
  scoredCount?: number | null;
};

function toScores(s: ScorecardView): RankingScores {
  return {
    strategicAlignment: s.strategicAlignment,
    technicalFeasibility: s.technicalFeasibility,
    businessValue: s.businessValue,
    effortDemand: s.effortDemand,
    riskUncertainty: s.riskUncertainty,
    timeSensitivity: s.timeSensitivity,
  };
}

function toNotes(s: ScorecardView) {
  return {
    strategicAlignment: s.strategicNote || undefined,
    technicalFeasibility: s.technicalNote || undefined,
    businessValue: s.businessNote || undefined,
    effortDemand: s.effortNote || undefined,
    riskUncertainty: s.riskNote || undefined,
    timeSensitivity: s.timeNote || undefined,
  };
}

export function ProjectRankingPanel({
  scorecard,
  compact = false,
}: {
  scorecard: ScorecardView | null;
  compact?: boolean;
}) {
  if (!scorecard) {
    return (
      <Card className="space-y-2">
        <h2 className="text-lg font-semibold text-white">Group ranking</h2>
        <p className="text-sm text-stone-400">
          Not scored yet. Creator or founder can apply the weighted ranking system
          (strategy, feasibility, value, effort, risk, timing).
        </p>
        <Link href="/rankings" className="text-xs text-amber-400 hover:underline">
          View all ranked projects
        </Link>
      </Card>
    );
  }

  const rows = rankingBreakdown(toScores(scorecard), toNotes(scorecard));
  const pct = (scorecard.totalScore / 5) * 100;
  const updated =
    typeof scorecard.updatedAt === "string"
      ? scorecard.updatedAt.slice(0, 10)
      : scorecard.updatedAt.toISOString().slice(0, 10);

  return (
    <Card className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold text-white">Group ranking</h2>
          <p className="text-xs text-stone-500">
            Weighted total (max 5.00) · scored {updated}
            {scorecard.scorerHandle ? ` by @${scorecard.scorerHandle}` : ""}
          </p>
        </div>
        <div className="text-right">
          {scorecard.rank != null && scorecard.scoredCount != null && (
            <Badge className="border-amber-500/40 bg-amber-500/10 text-amber-200">
              #{scorecard.rank} of {scorecard.scoredCount}
            </Badge>
          )}
          <p className="mt-1 text-2xl font-bold tabular-nums text-amber-200">
            {formatRankingTotal(scorecard.totalScore)}
            <span className="text-sm font-normal text-stone-500"> / 5.00</span>
          </p>
        </div>
      </div>
      <ProgressBar value={pct} />
      {!compact && (
        <ul className="space-y-2 text-sm">
          {rows.map((r) => (
            <li
              key={r.id}
              className="rounded-lg border border-white/5 bg-black/20 px-2.5 py-2"
            >
              <div className="flex justify-between gap-2 text-stone-300">
                <span>
                  {r.shortLabel}{" "}
                  <span className="text-xs text-stone-600">
                    ({Math.round(r.weight * 100)}%)
                  </span>
                </span>
                <span className="tabular-nums text-stone-200">
                  {r.score} → {r.weighted.toFixed(2)}
                </span>
              </div>
              {r.note && (
                <p className="mt-1 text-xs text-stone-500">{r.note}</p>
              )}
            </li>
          ))}
        </ul>
      )}
      <Link href="/rankings" className="text-xs text-amber-400 hover:underline">
        Full ranking board
      </Link>
    </Card>
  );
}
