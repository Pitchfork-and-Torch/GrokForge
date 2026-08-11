import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { Badge, Button, Card, ProgressBar } from "@/components/ui";
import { LeaderboardPanel } from "@/components/leaderboard-panel";
import { EmptyState } from "@/components/empty-state";
import { LiveForgeBar } from "@/components/live-forge-bar";
import { NightcapGift } from "@/components/nightcap-gift";
import { WeeklyChallenges } from "@/components/weekly-challenges";
import { BadgeUnlockToast } from "@/components/badge-unlock-toast";
import { RecentActivity } from "@/components/recent-activity";
import { OnboardingTips } from "@/components/onboarding-tips";
import { fetchLeaderboard } from "@/lib/leaderboard-data";
import { fetchBadgesForUsers, fetchUserBadges } from "@/lib/badges-data";
import { fetchWeeklyChallenges } from "@/lib/challenges-data";
import { getFeaturedProject, getLiveStats } from "@/lib/site-stats";
import { CATEGORY_LABELS, isProjectCompleteDisplay, projectTaskProgress } from "@/lib/utils";
import { isFounderHandle } from "@/lib/identity";
import { FeaturedProjectCard } from "@/components/featured-project-card";
import { ProjectThumbButton } from "@/components/project-thumb-button";
import { ProjectCompletedBadge } from "@/components/project-completed-badge";
import { ShipSourceLinks } from "@/components/ship-source-links";
import { ShareProjectButton } from "@/components/share-project-button";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const session = await auth();
  const signedIn = !!session?.user?.id;
  const isFounder = isFounderHandle(session?.user?.handle);

  const [projects, anvilMeta] = await Promise.all([
    prisma.project.findMany({
      where: { status: { in: ["ACTIVE", "FUNDED", "COMPLETED"] } },
      include: {
        proposer: { select: { handle: true, reputation: true } },
        fundPots: true,
        tasks: { select: { id: true, status: true, parentId: true } },
        artifacts: {
          where: { source: "package" },
          select: { id: true },
          take: 1,
        },
        _count: { select: { tasks: true, donations: true, thumbs: true } },
      },
      orderBy: [{ displayOrder: "asc" }, { createdAt: "desc" }],
      take: 8,
    }),
    prisma.project.findUnique({
      where: { slug: "anvil-infinity" },
      select: {
        title: true,
        slug: true,
        description: true,
        status: true,
        createdAt: true,
        tasks: { select: { id: true, status: true, parentId: true } },
      },
    }),
  ]);

  const homeMyThumbs = new Set<string>();
  if (session?.user?.id) {
    try {
      const rows = await prisma.projectThumb.findMany({
        where: {
          userId: session.user.id,
          projectId: { in: projects.map((p) => p.id) },
        },
        select: { projectId: true },
      });
      for (const r of rows) homeMyThumbs.add(r.projectId);
    } catch {
      /* ok */
    }
  }

  const [leaders, activity, live, featured] = await Promise.all([
    fetchLeaderboard({ window: "all", limit: 8 }),
    prisma.ledgerEntry.findMany({
      where: { project: { status: { in: ["ACTIVE", "FUNDED", "COMPLETED"] } } },
      orderBy: { createdAt: "desc" },
      take: 12,
      include: {
        project: { select: { slug: true, title: true } },
      },
    }),
    getLiveStats(),
    getFeaturedProject(),
  ]);

  let featuredThumbed = false;
  if (signedIn && session?.user?.id && featured?.id) {
    try {
      const ft = await prisma.projectThumb.findUnique({
        where: {
          userId_projectId: {
            userId: session.user.id,
            projectId: featured.id,
          },
        },
      });
      featuredThumbed = !!ft;
    } catch {
      featuredThumbed = false;
    }
  }

  const badgeMap = await fetchBadgesForUsers(leaders.map((r) => r.userId));
  const nightcapProjects = projects.map((p) => ({
    id: p.id,
    title: p.title,
    slug: p.slug,
  }));
  const myBadges =
    signedIn && session?.user?.id
      ? await fetchUserBadges(session.user.id)
      : [];
  const challenges =
    signedIn && session?.user?.id
      ? await fetchWeeklyChallenges(session.user.id)
      : [];

  return (
    <div className="space-y-10 sm:space-y-14">
      {signedIn && session?.user?.id && (
        <BadgeUnlockToast userId={session.user.id} badges={myBadges} />
      )}
      <OnboardingTips signedIn={signedIn} />

      {/* Top of site: network pulse sits above the hero so it is never under the pin */}
      <LiveForgeBar stats={live} />

      {anvilMeta && (
        <Card className="border-amber-500/30 bg-gradient-to-r from-amber-950/40 to-black/40">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 space-y-1">
              <Badge className="border-amber-400/40 bg-amber-500/15 text-amber-100">
                Meta-project
              </Badge>
              <h2 className="text-lg font-bold text-white sm:text-xl">
                <Link
                  href={`/projects/${anvilMeta.slug}`}
                  className="hover:text-amber-200"
                >
                  {anvilMeta.title}
                </Link>
              </h2>
              <p className="max-w-2xl text-sm text-stone-400 line-clamp-2">
                {anvilMeta.description}
              </p>
              <p className="text-xs text-stone-500">
                Hierarchical multi-agent scientific harness · labor + compute only ·{" "}
                {projectTaskProgress(anvilMeta.tasks).completed}/
                {projectTaskProgress(anvilMeta.tasks).total} tasks · created{" "}
                {anvilMeta.createdAt.toISOString().slice(0, 10)}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href={`/projects/${anvilMeta.slug}`}>
                <Button>Open ANVIL</Button>
              </Link>
              <Link href="/quests">
                <Button variant="secondary">Quest templates</Button>
              </Link>
              <Link href="/tasks?goodFirst=1">
                <Button variant="ghost">Good first leaves</Button>
              </Link>
            </div>
          </div>
        </Card>
      )}

      <section className="relative isolate overflow-hidden rounded-2xl border border-amber-900/40 bg-gradient-to-br from-[#0a0a0a] via-black to-amber-950/30 p-5 sm:rounded-3xl sm:p-8 md:p-12">
        <div className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-amber-500/15 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 left-1/3 h-32 w-32 rounded-full bg-amber-700/10 blur-3xl" />

        {/*
          Mobile: single column. Desktop: pin in the right column with mild elevation at lg+.
        */}
        <div className="relative grid grid-cols-1 gap-6 sm:gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(16rem,0.85fr)] lg:items-start lg:gap-10">
          <div className="min-w-0">
            <Badge className="max-w-full whitespace-normal text-left leading-snug">
              Live · Neon · Open ledgers
              {process.env.STRIPE_SECRET_KEY?.trim() ? " · Stripe" : ""}
              {" · No user API keys"}
            </Badge>
            <h1 className="mt-4 max-w-2xl text-[1.75rem] font-bold leading-tight tracking-tight text-white sm:text-4xl sm:leading-tight md:text-5xl">
              Sign in with X{" "}
              <span className="text-stone-500 font-semibold">|</span> Build
              Together
            </h1>
            <p className="mt-2 max-w-2xl text-sm font-medium leading-snug text-stone-400 sm:text-base md:text-lg">
              multi-agent work for the{" "}
              <span className="bg-gradient-to-r from-amber-300 to-amber-500 bg-clip-text text-transparent">
                greater good
              </span>
            </p>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-stone-400 sm:mt-4 sm:text-base sm:text-lg">
              GrokForge is GoFundMe + task marketplace + open collab hub for Grok users. Propose
              projects, fund compute, claim nested tasks, climb the leaderboard.
              {signedIn ? " Welcome back - the forge is hot." : " Sign in with X to start building."}
            </p>
            <div className="mt-6 flex flex-col gap-2.5 sm:mt-8 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
              {signedIn ? (
                <>
                  <Link href="/projects/new">
                    <Button>Propose a project</Button>
                  </Link>
                  <Link href="/tasks">
                    <Button variant="secondary">Browse open tasks</Button>
                  </Link>
                  <Link href="/dashboard">
                    <Button variant="ghost">Your dashboard</Button>
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="inline-flex items-center gap-2 rounded-full border border-amber-300/50 bg-amber-500 px-5 py-2.5 text-sm font-bold text-black shadow-[0_0_28px_rgba(245,158,11,0.5)] transition hover:bg-amber-400 hover:shadow-[0_0_40px_rgba(245,158,11,0.7)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-200"
                    aria-label="Sign in with X"
                  >
                    <span aria-hidden className="text-base font-black leading-none">
                      &#120143;
                    </span>
                    Sign in with X
                  </Link>
                  <Link href="/projects">
                    <Button variant="secondary">Browse projects</Button>
                  </Link>
                  <Link href="/tasks">
                    <Button variant="ghost">Open tasks</Button>
                  </Link>
                </>
              )}
              <Link href="/leaderboard">
                <Button variant="ghost">Top contributors</Button>
              </Link>
            </div>
          </div>

          {/* Founder-pinnable featured project (hero right column on lg+) */}
          <div className="relative z-0 w-full min-w-0 max-w-full space-y-2.5 overflow-hidden lg:z-[1] lg:min-h-[14rem]">
            {featured ? (
              <>
                {/* Bar share is wide; keep it desktop-only. Card has compact tweet. */}
                <div className="hidden sm:block">
                  <ShareProjectButton
                    title={featured.title}
                    slug={featured.slug}
                    category={featured.category}
                    proposerHandle={featured.proposerHandle}
                    featured
                    variant="bar"
                  />
                </div>
                <FeaturedProjectCard
                  project={featured}
                  isFounder={isFounder}
                  signedIn={signedIn}
                  initiallyThumbed={featuredThumbed}
                />
              </>
            ) : (
              <div className="flex min-h-[10rem] flex-col items-start justify-center rounded-2xl border border-dashed border-amber-900/40 bg-black/30 p-5 sm:min-h-[12rem]">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-amber-500/80">
                  Featured project
                </p>
                <p className="mt-2 text-sm text-stone-500">
                  {isFounder
                    ? "Pin any public project from its page (Pin as featured) to spotlight it here."
                    : "The founder can pin a greater-good project here for the whole network."}
                </p>
                {isFounder && (
                  <Link href="/projects" className="mt-4">
                    <Button type="button" variant="secondary" className="!text-xs">
                      Choose a project to pin
                    </Button>
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {[
            {
              k: "Labor",
              v: "Claim hierarchical tasks, run with your own Grok, submit + peer review",
            },
            {
              k: "Capital",
              v: "Transparent pots: API credits, compute, SuperGrok sponsorship",
            },
            {
              k: "Recognition",
              v: "Public leaderboard with Follow on X for top builders",
            },
          ].map((item) => (
            <div
              key={item.k}
              className="rounded-2xl border border-amber-900/35 bg-black/40 p-4"
            >
              <div className="text-xs font-semibold uppercase tracking-widest text-amber-400">
                {item.k}
              </div>
              <p className="mt-2 text-sm text-stone-300">{item.v}</p>
            </div>
          ))}
        </div>
      </section>

      <LeaderboardPanel
        rows={leaders}
        signedIn={signedIn}
        badgeMap={badgeMap}
        title="Top contributors"
        subtitle="Capital donated + accepted labor + reviews. Badges unlock as you build."
      />

      <section aria-labelledby="activity-heading">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <h2 id="activity-heading" className="text-2xl font-semibold text-white">
              Recent network activity
            </h2>
            <p className="text-sm text-stone-500">
              Live ledger across active projects - claims, submissions, capital, and edits.
            </p>
          </div>
          <Link href="/activity" className="text-sm text-amber-400 hover:text-amber-300">
            Full activity
          </Link>
        </div>
        <RecentActivity
          items={activity.map((e) => ({
            id: e.id,
            kind: e.kind,
            summary: e.summary,
            createdAt:
              e.createdAt.toISOString().slice(0, 16).replace("T", " ") + " UTC",
            project: e.project,
          }))}
        />
      </section>

      <section aria-labelledby="how-heading">
        <h2 id="how-heading" className="text-2xl font-semibold text-white">
          How it works
        </h2>
        <ol className="mt-4 grid gap-4 sm:grid-cols-4">
          {[
            { n: "01", t: "Propose", d: "Hierarchical goals + open license + funding target" },
            { n: "02", t: "Fund", d: "Public pots for credits, compute, SuperGrok sponsorship" },
            { n: "03", t: "Claim", d: "Take a leaf task; run agents with your own keys" },
            { n: "04", t: "Ship", d: "Submit output, peer review, climb the leaderboard" },
          ].map((step) => (
            <li
              key={step.n}
              className="rounded-2xl border border-amber-900/35 bg-[#121212]/90 p-4 gf-card-hover"
            >
              <span className="text-xs font-mono text-amber-500">{step.n}</span>
              <h3 className="mt-1 font-semibold text-white">{step.t}</h3>
              <p className="mt-1 text-sm text-stone-400">{step.d}</p>
            </li>
          ))}
        </ol>
      </section>

      <section>
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold text-white">Live projects</h2>
            <p className="text-sm text-stone-500">
              Greater-good work with open licenses and transparent task progress.
            </p>
          </div>
          <Link href="/projects" className="text-sm text-amber-400 hover:text-amber-300">
            View all
          </Link>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {projects.map((p) => {
            const progress = projectTaskProgress(p.tasks);
            const done = isProjectCompleteDisplay(p.status, p.tasks);
            const sealed = p.artifacts.length > 0;
            return (
              <Card
                key={p.id}
                className={`h-full gf-card-hover ${
                  done || sealed ? "border-emerald-500/30" : ""
                }`}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <Badge>{CATEGORY_LABELS[p.category] || p.category}</Badge>
                  <span className="text-xs text-stone-500">{p.license}</span>
                  {done && <ProjectCompletedBadge size="sm" />}
                  <ShipSourceLinks slug={p.slug} sealed={sealed} compact />
                  <span className="ml-auto">
                    <ShareProjectButton
                      title={p.title}
                      slug={p.slug}
                      category={p.category}
                      proposerHandle={p.proposer.handle}
                      variant="compact"
                    />
                  </span>
                </div>
                <Link
                  href={sealed ? `/projects/${p.slug}/ship` : `/projects/${p.slug}`}
                  className="mt-3 block text-lg font-semibold text-white hover:text-amber-200"
                >
                  {p.title}
                </Link>
                <p className="mt-2 line-clamp-2 text-sm text-stone-400">{p.description}</p>
                <div className="mt-4 space-y-2">
                  <div className="flex justify-between text-xs text-stone-500">
                    <span>
                      {progress.completed} / {progress.total} tasks done
                    </span>
                    <span>
                      {progress.total > 0 ? Math.round(progress.pct) : 0}% complete
                    </span>
                  </div>
                  <ProgressBar value={progress.pct} />
                </div>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap gap-3 text-xs text-stone-500">
                    <span>
                      @{p.proposer.handle} · {p.proposer.reputation} rep
                    </span>
                    <Link
                      href={`/projects/${p.slug}`}
                      className="text-amber-400/90 hover:underline"
                    >
                      Project
                    </Link>
                    <span>{progress.open} open tasks</span>
                    <span>{p._count.donations} donations</span>
                  </div>
                  <ProjectThumbButton
                    projectId={p.id}
                    initialCount={p._count.thumbs}
                    initiallyThumbed={homeMyThumbs.has(p.id)}
                    signedIn={signedIn}
                    compact
                  />
                </div>
              </Card>
            );
          })}
          {projects.length === 0 && (
            <EmptyState
              signedIn={signedIn}
              title="Be the first to open a greater-good project"
              body="Propose an open-license multi-agent project and invite builders. This board stays real - no demo theatre."
              primaryHref={signedIn ? "/projects/new" : "/login"}
              primaryLabel={signedIn ? "Propose a project" : "Sign in with X"}
              secondaryHref={signedIn ? "/tasks" : "/projects"}
              secondaryLabel={signedIn ? "Browse open tasks" : "Browse projects"}
            />
          )}
        </div>
      </section>

      {signedIn && challenges.length > 0 && (
        <WeeklyChallenges challenges={challenges} />
      )}

      <NightcapGift projects={nightcapProjects} signedIn={signedIn} />

      <section className="rounded-3xl border border-amber-500/25 bg-amber-500/5 p-6 sm:p-8">
        <h2 className="text-xl font-semibold text-white">Trust rails</h2>
        <ul className="mt-3 grid gap-2 text-sm text-stone-300 sm:grid-cols-2">
          <li>Never stores user xAI / SuperGrok credentials</li>
          <li>Public labor + capital ledgers on every project</li>
          <li>Open license commitment required for funded work</li>
          <li>Alignment pre-check on new project proposals</li>
        </ul>
        <div className="mt-5">
          <Link href="/about" className="text-sm text-amber-400 hover:text-amber-300">
            Read about safety and terms
          </Link>
        </div>
      </section>
    </div>
  );
}
