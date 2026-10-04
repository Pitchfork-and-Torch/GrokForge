import Link from "next/link";
import { LeaderboardPanel } from "@/components/leaderboard-panel";
import { Badge } from "@/components/ui";
import { auth } from "@/lib/auth";
import { fetchLeaderboard } from "@/lib/leaderboard-data";
import { fetchBadgesForUsers } from "@/lib/badges-data";
import type { LeaderboardWindow } from "@/lib/leaderboard";

export const dynamic = "force-dynamic";

const WINDOWS: { id: LeaderboardWindow; label: string }[] = [
  { id: "all", label: "All-time" },
  { id: "month", label: "30 days" },
  { id: "week", label: "7 days" },
];

export default async function LeaderboardPage({
  searchParams,
}: {
  searchParams: Promise<{ window?: string }>;
}) {
  const session = await auth();
  const sp = await searchParams;
  const window = (["all", "month", "week"].includes(sp.window || "")
    ? sp.window
    : "all") as LeaderboardWindow;

  const rows = await fetchLeaderboard({ window, limit: 50 });
  const badgeMap = await fetchBadgesForUsers(rows.map((r) => r.userId));

  return (
    <div className="space-y-8">
      <header className="space-y-3">
        <Badge>Impact ranking · capital + labor + reviews</Badge>
        <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
          Top contributors
        </h1>
        <p className="max-w-2xl text-sm text-stone-400 sm:text-base">
          Ranked by donated capital, accepted task submissions, estimated labor hours, peer
          reviews, and reputation. Follow builders on X with one click.
        </p>
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Time window">
          {WINDOWS.map((w) => {
            const active = w.id === window;
            return (
              <Link
                key={w.id}
                href={w.id === "all" ? "/leaderboard" : `/leaderboard?window=${w.id}`}
                className={
                  active
                    ? "rounded-full bg-amber-500 px-3.5 py-1.5 text-sm font-semibold text-black"
                    : "rounded-full border border-amber-900/40 bg-white/5 px-3.5 py-1.5 text-sm text-stone-300 hover:border-amber-500/40"
                }
                aria-current={active ? "page" : undefined}
              >
                {w.label}
              </Link>
            );
          })}
        </div>
      </header>

      <LeaderboardPanel
        rows={rows}
        signedIn={!!session?.user}
        currentUserId={session?.user?.id}
        badgeMap={badgeMap}
        title={`${WINDOWS.find((w) => w.id === window)?.label || "All-time"} leaders`}
        subtitle="Higher score = more capital, accepted work, hours, and helpful reviews. Badges unlock as you ship. Share your rank on X when you appear on the board."
        showViewAll={false}
      />

      <p className="text-xs text-stone-600">
        Scoring is a public proxy for impact, not a financial statement. Only{" "}
        <strong className="font-medium text-stone-500">accepted</strong> submissions count toward
        labor rank (pending work waits for peer review). Donations, reviews, and reputation also
        score. Handles come from X OAuth or profiles you set on GrokForge.
      </p>
    </div>
  );
}
