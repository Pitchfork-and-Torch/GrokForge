import Link from "next/link";
import Image from "next/image";
import { Badge, Card } from "@/components/ui";
import { FounderBadge } from "@/components/founder-badge";
import { BadgeRow } from "@/components/badge-row";
import { EmptyState } from "@/components/empty-state";
import { ShareRankTweet } from "@/components/share-rank-tweet";
import { formatCents } from "@/lib/utils";
import { streakBadgeLabel } from "@/lib/streaks";
import type { LeaderboardRow } from "@/lib/leaderboard";

export function LeaderboardPanel({
  rows,
  title = "Top contributors",
  subtitle,
  compact = false,
  showViewAll = true,
  signedIn = false,
  currentUserId = null,
  badgeMap,
}: {
  rows: LeaderboardRow[];
  title?: string;
  subtitle?: string;
  compact?: boolean;
  showViewAll?: boolean;
  signedIn?: boolean;
  currentUserId?: string | null;
  badgeMap?: Map<string, import("@/lib/badges").BadgeDef[]>;
}) {
  return (
    <section aria-labelledby="leaderboard-heading">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="leaderboard-heading" className="text-2xl font-semibold text-white">
            {title}
          </h2>
          {subtitle && <p className="mt-1 text-sm text-stone-500">{subtitle}</p>}
        </div>
        {showViewAll && (
          <Link href="/leaderboard" className="text-sm text-amber-400 hover:text-amber-300">
            Full leaderboard
          </Link>
        )}
      </div>
      <Card className="overflow-hidden p-0">
        {rows.length === 0 ? (
          <div className="p-2">
            <EmptyState
              signedIn={signedIn}
              title="Board is open - be the first ranked builder"
              body="Ranking uses accepted work, donations, reviews, and reputation. Pending submissions do not count until peer-accepted. Ranks stay human - no demo bots."
              primaryHref={signedIn ? "/tasks" : "/login"}
              primaryLabel={signedIn ? "Claim a task" : "Sign in with X"}
              secondaryHref={signedIn ? "/projects/new" : "/projects"}
              secondaryLabel={signedIn ? "Propose a project" : "Browse projects"}
            />
          </div>
        ) : (
          <ul className="divide-y divide-white/5">
            {rows.map((row) => (
              <li
                key={row.userId}
                className="flex flex-wrap items-center gap-3 px-4 py-3 transition hover:bg-amber-500/5 sm:flex-nowrap sm:gap-4 sm:px-5"
              >
                <span
                  className={
                    row.rank <= 3
                      ? "flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-500 text-sm font-black text-black shadow-[0_0_16px_rgba(245,158,11,0.45)]"
                      : "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-amber-900/50 bg-black/40 text-sm font-semibold text-amber-200"
                  }
                  aria-label={`Rank ${row.rank}`}
                >
                  {row.rank}
                </span>
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  {row.image ? (
                    <Image
                      src={row.image}
                      alt=""
                      width={36}
                      height={36}
                      className="h-9 w-9 rounded-full border border-amber-900/40 object-cover"
                      unoptimized
                    />
                  ) : (
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-500/15 text-xs font-bold text-amber-300">
                      {(row.handle || "?").slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                      <span className="truncate font-semibold text-white">
                        @{row.handle || "anonymous"}
                      </span>
                      {row.isFounder && <FounderBadge />}
                      {badgeMap?.get(row.userId) && (
                        <BadgeRow badges={badgeMap.get(row.userId)!} max={3} />
                      )}
                      {row.streakCurrent >= 3 && (
                        <Badge className="border-amber-500/40 bg-amber-500/10 text-amber-200">
                          {streakBadgeLabel(row.streakCurrent) ||
                            `${row.streakCurrent}d streak`}
                        </Badge>
                      )}
                    </div>
                    {!compact && (
                      <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-stone-500">
                        <span>{formatCents(row.donationCents)} capital</span>
                        <span>{row.acceptedContributions} accepted</span>
                        <span>{row.estimatedHours}h labor</span>
                        <span>{row.reviewsGiven} reviews</span>
                        {row.streakCurrent > 0 && (
                          <span>{row.streakCurrent}d streak</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
                  <Badge className="tabular-nums">{row.score.toFixed(1)} pts</Badge>
                  {signedIn &&
                    currentUserId &&
                    currentUserId === row.userId &&
                    row.handle && (
                      <ShareRankTweet
                        compact
                        handle={row.handle}
                        rank={row.rank}
                        score={row.score}
                        reputation={row.reputation}
                        streakDays={row.streakCurrent}
                        badgeLabels={(badgeMap?.get(row.userId) || []).map((b) => b.label)}
                      />
                    )}
                  {row.followUrl ? (
                    <a
                      href={row.followUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center rounded-full border border-amber-400/50 bg-amber-500 px-3 py-1.5 text-xs font-bold text-black shadow-[0_0_16px_rgba(245,158,11,0.35)] transition hover:bg-amber-400"
                    >
                      Follow
                    </a>
                  ) : (
                    <span className="text-[11px] text-stone-600">No X handle</span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </section>
  );
}
