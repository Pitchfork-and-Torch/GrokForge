import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { Badge, Card } from "@/components/ui";
import { FounderBadge } from "@/components/founder-badge";
import { BadgeRow } from "@/components/badge-row";
import { BadgeGallery } from "@/components/badge-gallery";
import { BuilderWidgetCard } from "@/components/builder-widget-card";
import { ShareAchievements } from "@/components/share-achievements";
import { ShareRankTweet } from "@/components/share-rank-tweet";
import { XMoneyTip } from "@/components/x-money-tip";
import { isFounderHandle } from "@/lib/identity";
import { computeStreak, streakBadgeLabel } from "@/lib/streaks";
import { fetchUserBadgeGallery, fetchUserBadges } from "@/lib/badges-data";
import { ContributionHeatmap } from "@/components/contribution-heatmap";
import { formatCents } from "@/lib/utils";
import { fetchLeaderboard } from "@/lib/leaderboard-data";
import { StatTip } from "@/components/stat-tip";

export const dynamic = "force-dynamic";

const site =
  process.env.NEXTAUTH_URL?.replace(/\/$/, "") ||
  process.env.AUTH_URL?.replace(/\/$/, "") ||
  "https://grokforge.app";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ handle: string }>;
}): Promise<Metadata> {
  const { handle } = await params;
  const h = handle.replace(/^@/, "");
  let description = `Builder profile for @${h} on GrokForge - contributions, projects, and impact.`;
  try {
    const u = await prisma.user.findFirst({
      where: { handle: { equals: h, mode: "insensitive" } },
      select: {
        reputation: true,
        bio: true,
        _count: {
          select: {
            contributions: { where: { status: "ACCEPTED" } },
            projects: true,
          },
        },
      },
    });
    if (u) {
      description =
        u.bio?.slice(0, 140) ||
        `@${h} · ${u.reputation} rep · ${u._count.contributions} accepted · ${u._count.projects} projects on GrokForge`;
    }
  } catch {
    /* ignore */
  }
  const title = `@${h} | GrokForge`;
  return {
    title,
    description,
    openGraph: {
      title: `@${h} on GrokForge`,
      description,
      url: `${site}/u/${h}`,
      siteName: "GrokForge",
      type: "profile",
    },
    twitter: {
      card: "summary_large_image",
      title: `@${h} on GrokForge`,
      description,
    },
  };
}

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;
  const session = await auth();
  const user = await prisma.user.findFirst({
    where: { handle: { equals: handle, mode: "insensitive" } },
    include: {
      projects: {
        where: { status: { in: ["ACTIVE", "FUNDED", "COMPLETED"] } },
        select: {
          id: true,
          slug: true,
          title: true,
          category: true,
          status: true,
        },
        orderBy: { createdAt: "desc" },
      },
      contributions: {
        take: 200,
        orderBy: { createdAt: "desc" },
        include: {
          task: { select: { title: true, project: { select: { slug: true } } } },
        },
      },
      donations: {
        take: 10,
        orderBy: { createdAt: "desc" },
        include: { project: { select: { slug: true, title: true } } },
      },
    },
  });
  if (!user) notFound();

  const [acceptedCount, donationSum, watchCount, badges, gallery, board] =
    await Promise.all([
      prisma.contribution.count({
        where: { userId: user.id, status: "ACCEPTED" },
      }),
      prisma.donation.aggregate({
        where: { donorId: user.id },
        _sum: { amountCents: true },
      }),
      prisma.projectWatch.count({ where: { userId: user.id } }),
      fetchUserBadges(user.id),
      fetchUserBadgeGallery(user.id),
      fetchLeaderboard({ window: "all", limit: 100 }),
    ]);

  // X Money tips received (self-reported ledger CAPITAL with source X_MONEY_P2P)
  let tipsReceivedCents = 0;
  try {
    const tipRows = await prisma.ledgerEntry.findMany({
      where: {
        kind: "CAPITAL",
        meta: { contains: user.id },
      },
      select: { amountCents: true, meta: true },
      take: 200,
    });
    for (const row of tipRows) {
      try {
        const m = row.meta ? JSON.parse(row.meta) : null;
        if (m?.source === "X_MONEY_P2P" && m?.recipientUserId === user.id) {
          tipsReceivedCents += row.amountCents || 0;
        }
      } catch {
        /* ignore */
      }
    }
  } catch {
    tipsReceivedCents = 0;
  }

  const myRank = board.find((r) => r.userId === user.id);
  const isOwnProfile = session?.user?.id === user.id;
  const founder = isFounderHandle(user.handle);
  const streak = computeStreak(user.contributions.map((c) => c.createdAt));
  const streakLabel = streakBadgeLabel(streak.current);
  const donatedCents = donationSum._sum.amountCents || 0;

  const personLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: user.name || `@${user.handle}`,
    alternateName: user.handle ? `@${user.handle}` : undefined,
    url: user.handle ? `${site}/u/${user.handle}` : undefined,
    image: user.image || undefined,
    description:
      user.bio ||
      `GrokForge builder · ${user.reputation} reputation · greater-good multi-agent work`,
    sameAs: user.handle ? [`https://x.com/${user.handle}`] : undefined,
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(personLd) }}
      />
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-3xl font-bold text-white">@{user.handle}</h1>
          {founder && <FounderBadge />}
          <BadgeRow badges={badges} max={6} size="md" />
          {streakLabel && (
            <Badge className="border-amber-500/40 bg-amber-500/10 text-amber-200">
              {streakLabel}
            </Badge>
          )}
        </div>
        <p className="text-stone-400">{user.name}</p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Badge title="Reputation from accepted work, reviews, tips, and gifts">
            {user.reputation} reputation
          </Badge>
          {streak.longest > 0 && (
            <span
              className="text-xs text-stone-500"
              title={`Current ${streak.current}d · longest ${streak.longest}d`}
            >
              longest streak {streak.longest}d
            </span>
          )}
          {myRank && (
            <Badge className="border-amber-500/40 bg-amber-500/10 text-amber-200">
              Rank #{myRank.rank}
            </Badge>
          )}
          {user.handle && (
            <a
              href={`https://x.com/intent/follow?screen_name=${encodeURIComponent(user.handle)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex rounded-full border border-amber-400/50 bg-amber-500 px-3 py-1 text-xs font-bold text-black"
            >
              Follow on X
            </a>
          )}
          {isOwnProfile && myRank && user.handle && (
            <ShareRankTweet
              handle={user.handle}
              rank={myRank.rank}
              score={myRank.score}
              reputation={user.reputation}
              streakDays={streak.current}
              badgeLabels={badges.map((b) => b.label)}
              siteUrl={site}
            />
          )}
        </div>
      </div>

      {user.handle && (
        <XMoneyTip
          handle={user.handle}
          recipientUserId={user.id}
          signedIn={!!session?.user?.id}
          projects={user.projects.map((p) => ({
            id: p.id,
            slug: p.slug,
            title: p.title,
          }))}
          tipsReceivedCents={tipsReceivedCents}
        />
      )}

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        <StatTip
          label="Accepted"
          value={String(acceptedCount)}
          detail="Peer or creator-accepted task submissions. Only these count toward labor rank."
        />
        <StatTip
          label="Proposed"
          value={String(user.projects.length)}
          detail="Live projects this builder proposed (Architect badge at 1+)."
        />
        <StatTip
          label="Donated"
          value={formatCents(donatedCents)}
          detail="Capital sent to project pots via Stripe Checkout or demo ledger."
        />
        <StatTip
          label="X Money"
          value={tipsReceivedCents > 0 ? formatCents(tipsReceivedCents) : "—"}
          detail="Self-reported X Money P2P tips received. Completing the send happens on X."
        />
        <StatTip
          label="Watching"
          value={String(watchCount)}
          detail="Projects bookmarked for notifications when work ships or capital lands."
        />
        <StatTip
          label="Reputation"
          value={String(user.reputation)}
          detail="Earned from accepted work, reviews, tips, and gifts. Not a financial score."
        />
        <StatTip
          label="Streak"
          value={
            streak.current > 0
              ? `${streak.current}d`
              : streak.longest > 0
                ? `0d`
                : "—"
          }
          detail={`Current contribution streak ${streak.current}d · longest ${streak.longest}d (UTC calendar days with a submission).`}
        />
      </div>

      <Card>
        <BadgeGallery rows={gallery} />
      </Card>

      <Card>
        <ContributionHeatmap
          days={user.contributions.reduce(
            (acc, c) => {
              const k = c.createdAt.toISOString().slice(0, 10);
              acc[k] = (acc[k] || 0) + 1;
              return acc;
            },
            {} as Record<string, number>
          )}
        />
      </Card>

      {user.handle && <BuilderWidgetCard handle={user.handle} siteUrl={site} />}
      {user.handle && badges.length > 0 && (
        <ShareAchievements handle={user.handle} siteUrl={site} />
      )}

      {user.bio && (
        <Card>
          <p className="text-sm text-stone-300">{user.bio}</p>
        </Card>
      )}
      {user.capacityNotes && (
        <Card>
          <h2 className="text-sm font-semibold text-stone-400">Capacity</h2>
          <p className="mt-1 text-sm text-stone-300">{user.capacityNotes}</p>
        </Card>
      )}
      <Card>
        <h2 className="font-semibold text-white">Projects proposed</h2>
        <ul className="mt-2 space-y-1 text-sm">
          {user.projects.map((p) => (
            <li key={p.slug} className="flex flex-wrap items-center gap-2">
              <Link href={`/projects/${p.slug}`} className="text-amber-300 hover:underline">
                {p.title}
              </Link>
              {p.status !== "ACTIVE" && (
                <span className="text-[10px] uppercase text-stone-600">{p.status}</span>
              )}
            </li>
          ))}
          {user.projects.length === 0 && <li className="text-stone-500">None</li>}
        </ul>
      </Card>
      <Card>
        <h2 className="font-semibold text-white">Recent contributions</h2>
        <ul className="mt-2 space-y-1 text-sm">
          {user.contributions.slice(0, 15).map((c) => (
            <li key={c.id} className="flex flex-wrap items-center gap-2">
              <Link href={`/c/${c.id}`} className="text-amber-300 hover:underline">
                {c.task.title}
              </Link>
              <span className="text-xs text-stone-500">{c.status}</span>
              <Link
                href={`/c/${c.id}`}
                className="text-[11px] text-stone-500 hover:text-amber-400"
              >
                receipt
              </Link>
            </li>
          ))}
          {user.contributions.length === 0 && (
            <li className="text-stone-500">No contributions yet.</li>
          )}
        </ul>
      </Card>
      {user.donations.length > 0 && (
        <Card>
          <h2 className="font-semibold text-white">Recent support</h2>
          <ul className="mt-2 space-y-1 text-sm">
            {user.donations.map((d) => (
              <li key={d.id} className="flex flex-wrap items-center gap-2 text-stone-400">
                <span className="tabular-nums text-amber-200/90">{formatCents(d.amountCents)}</span>
                <span>to</span>
                <Link
                  href={`/projects/${d.project.slug}`}
                  className="text-amber-300 hover:underline"
                >
                  {d.project.title}
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
