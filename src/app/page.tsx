import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { Badge, Button, Card, ProgressBar } from "@/components/ui";
import { LeaderboardPanel } from "@/components/leaderboard-panel";
import { EmptyState } from "@/components/empty-state";
import { LiveForgeBar } from "@/components/live-forge-bar";
import { WeeklyChallenges } from "@/components/weekly-challenges";
import { BadgeUnlockToast } from "@/components/badge-unlock-toast";
import { RecentActivity } from "@/components/recent-activity";
import { OnboardingTips } from "@/components/onboarding-tips";
import { fetchLeaderboard } from "@/lib/leaderboard-data";
import { fetchBadgesForUsers, fetchUserBadges } from "@/lib/badges-data";
import { fetchWeeklyChallenges } from "@/lib/challenges-data";
import { getFeaturedProject, getLiveStats } from "@/lib/site-stats";
import {
  CATEGORY_LABELS,
  isProjectCompleteDisplay,
  projectTaskProgress,
  publicProjectBlurb,
} from "@/lib/utils";
import { isFounderHandle } from "@/lib/identity";
import { FeaturedProjectCard } from "@/components/featured-project-card";
import { ProjectThumbButton } from "@/components/project-thumb-button";
import { ProjectCompletedBadge } from "@/components/project-completed-badge";
import { ShipSourceLinks } from "@/components/ship-source-links";
import { ShareProjectButton } from "@/components/share-project-button";
import { GoodFirstStrip } from "@/components/good-first-strip";
import { NetworkTrustStrip } from "@/components/network-trust-strip";
import { BuilderFlywheelPanel } from "@/components/builder-flywheel-panel";
import { getNetworkTrustSnapshot } from "@/lib/network-trust";
import { isAgentSubmission } from "@/lib/deliverable-quality";
import { HomeFaq, HOME_FAQS } from "@/components/home-faq";
import { ProjectBannerThumb } from "@/components/project-banner";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const session = await auth();
  const signedIn = !!session?.user?.id;
  const isFounder = isFounderHandle(session?.user?.handle);

  // Soft-fail each query so one bad Prisma path cannot blank the whole home page
  // (e.g. mid-deploy schema lag after feature removals).
  const [projects, anvilMeta, goodFirstLeaves, networkTrust, peerableHome, myAwaitingHome] =
    await Promise.all([
      prisma.project
        .findMany({
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
        })
        .catch((e) => {
          console.error("[home] projects", e);
          return [];
        }),
      prisma.project
        .findUnique({
          where: { slug: "anvil-infinity" },
          select: {
            title: true,
            slug: true,
            description: true,
            status: true,
            createdAt: true,
            tasks: { select: { id: true, status: true, parentId: true } },
          },
        })
        .catch((e) => {
          console.error("[home] anvilMeta", e);
          return null;
        }),
      prisma.task
        .findMany({
          where: {
            status: "OPEN",
            goodFirst: true,
            parentId: { not: null },
            project: { status: { in: ["ACTIVE", "FUNDED"] } },
            claims: { none: { active: true } },
          },
          orderBy: [{ estimatedTokens: "asc" }, { createdAt: "desc" }],
          take: 6,
          select: {
            id: true,
            title: true,
            estimatedTokens: true,
            project: { select: { slug: true, title: true } },
          },
        })
        .catch((e) => {
          console.error("[home] goodFirst", e);
          return [];
        }),
      getNetworkTrustSnapshot().catch((e) => {
        console.error("[home] networkTrust", e);
        return null;
      }),
      prisma.contribution
        .findMany({
          where: {
            status: "PENDING",
            ...(session?.user?.id ? { userId: { not: session.user.id } } : {}),
            task: {
              project: { status: { in: ["ACTIVE", "FUNDED", "COMPLETED"] } },
            },
          },
          orderBy: { createdAt: "asc" },
          take: 6,
          include: {
            user: { select: { handle: true } },
            task: {
              select: {
                title: true,
                project: { select: { slug: true, title: true } },
              },
            },
          },
        })
        .catch((e) => {
          console.error("[home] peerable", e);
          return [];
        }),
      session?.user?.id
        ? prisma.contribution
            .findMany({
              where: { status: "PENDING", userId: session.user.id },
              orderBy: { createdAt: "asc" },
              take: 6,
              include: {
                task: {
                  select: {
                    title: true,
                    project: { select: { slug: true } },
                  },
                },
              },
            })
            .catch((e) => {
              console.error("[home] awaiting", e);
              return [];
            })
        : Promise.resolve([]),
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
    fetchLeaderboard({ window: "all", limit: 8 }).catch((e) => {
      console.error("[home] leaders", e);
      return [];
    }),
    prisma.ledgerEntry
      .findMany({
        where: { project: { status: { in: ["ACTIVE", "FUNDED", "COMPLETED"] } } },
        orderBy: { createdAt: "desc" },
        take: 12,
        include: {
          project: { select: { slug: true, title: true } },
        },
      })
      .catch((e) => {
        console.error("[home] activity", e);
        return [];
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

  const badgeMap = await fetchBadgesForUsers(leaders.map((r) => r.userId)).catch(
    () => new Map()
  );
  const myBadges =
    signedIn && session?.user?.id
      ? await fetchUserBadges(session.user.id).catch(() => [])
      : [];
  const challenges =
    signedIn && session?.user?.id
      ? await fetchWeeklyChallenges(session.user.id).catch(() => [])
      : [];

  return (
    <div className="space-y-10 sm:space-y-14">
      {signedIn && session?.user?.id && (
        <BadgeUnlockToast userId={session.user.id} badges={myBadges} />
      )}
      <OnboardingTips signedIn={signedIn} />

      {signedIn && (
        <BuilderFlywheelPanel
          signedIn={signedIn}
          peerable={(peerableHome as Array<{
            id: string;
            createdAt: Date;
            sources: string | null;
            contentType: string;
            user: { handle: string | null };
            task: {
              title: string;
              project: { slug: string; title: string };
            };
          }>).map((c) => ({
            id: c.id,
            taskTitle: c.task.title,
            projectSlug: c.task.project.slug,
            projectTitle: c.task.project.title,
            authorHandle: c.user.handle,
            createdAtLabel:
              c.createdAt.toISOString().slice(0, 16).replace("T", " ") + " UTC",
            agent: isAgentSubmission({
              sources: c.sources,
              contentType: c.contentType,
            }),
          }))}
          awaiting={(myAwaitingHome as Array<{
            id: string;
            createdAt: Date;
            task: { title: string; project: { slug: string } };
          }>).map((c) => ({
            id: c.id,
            taskTitle: c.task.title,
            projectSlug: c.task.project.slug,
            createdAtLabel:
              c.createdAt.toISOString().slice(0, 16).replace("T", " ") + " UTC",
          }))}
        />
      )}

      <LiveForgeBar stats={live} />
      {networkTrust && <NetworkTrustStrip trust={networkTrust} />}

      <section className="gf-hero rounded-2xl p-5 sm:rounded-3xl sm:p-8 md:p-12">
        <div className="relative grid grid-cols-1 gap-6 sm:gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(16rem,0.85fr)] lg:items-start lg:gap-10">
          <div className="min-w-0">
            <Badge className="max-w-full whitespace-normal text-left leading-snug">
              Live · Neon · Open ledgers
              {process.env.STRIPE_SECRET_KEY?.trim() ? " · Stripe" : ""}
              {" · No user API keys"}
            </Badge>
            <h1 className="font-display mt-4 max-w-2xl text-[1.85rem] font-bold leading-[1.08] text-[var(--foreground)] sm:text-4xl md:text-5xl">
              <span className="block">Multi-agent work</span>
              <span
                className="mt-1 block bg-clip-text text-transparent sm:mt-1.5"
                style={{
                  backgroundImage:
                    "linear-gradient(90deg, var(--accent-hover), var(--accent))",
                }}
              >
                that ships in public
              </span>
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[var(--muted)] sm:mt-4 sm:text-base sm:text-lg">
              Hierarchical tasks, peer review, and open licenses. Your xAI keys stay on
              your machine.
              {signedIn
                ? " Welcome back. Pick a ready leaf and keep the ledger moving."
                : " Sign in with X to claim a leaf."}
            </p>
            <div className="mt-6 flex flex-col gap-2.5 sm:mt-8 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
              {signedIn ? (
                <>
                  <Link href="/tasks">
                    <Button>Browse open tasks</Button>
                  </Link>
                  <Link href="/projects/new">
                    <Button variant="secondary">Propose a project</Button>
                  </Link>
                  <Link href="/dashboard">
                    <Button variant="ghost">Your dashboard</Button>
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[color:var(--accent)]/50 bg-[var(--accent)] px-5 py-2.5 text-sm font-bold text-black shadow-[0_0_28px_var(--glow)] gf-btn-press hover:bg-[var(--accent-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-hover)]"
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
                </>
              )}
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
              k: "Build",
              v: "Claim hierarchical leaves on real community projects; run Grok with your own keys",
            },
            {
              k: "Review",
              v: "Peer-review submissions so good work lands and the next ready leaves unlock",
            },
            {
              k: "Ship",
              v: "Accepted work becomes public receipts, sealed packages, and open kits others can use",
            },
          ].map((item) => (
            <div
              key={item.k}
              className="rounded-2xl border border-[color:var(--border)] bg-black/40 p-4"
            >
              <div className="text-xs font-semibold uppercase tracking-widest text-[var(--accent)]">
                {item.k}
              </div>
              <p className="mt-2 text-sm text-[var(--muted)]">{item.v}</p>
            </div>
          ))}
        </div>
      </section>

      {anvilMeta && (
        <Card>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 space-y-1">
              <Badge>Meta-project</Badge>
              <h2 className="font-display text-lg font-bold text-[var(--foreground)] sm:text-xl">
                <Link
                  href={`/projects/${anvilMeta.slug}`}
                  className="hover:text-[var(--accent)]"
                >
                  {anvilMeta.title}
                </Link>
              </h2>
              <p className="max-w-2xl text-sm text-[var(--muted)] line-clamp-2">
                {publicProjectBlurb(anvilMeta.description)}
              </p>
              <p className="text-xs text-[var(--muted)] opacity-80">
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
              <Link href="/tasks?goodFirst=1">
                <Button variant="secondary">Good first leaves</Button>
              </Link>
            </div>
          </div>
        </Card>
      )}

      <LeaderboardPanel
        rows={leaders}
        signedIn={signedIn}
        badgeMap={badgeMap}
        title="Builders in the network"
        subtitle="Accepted labor and peer reviews on public projects - credit for real contributions."
      />

      <section aria-labelledby="activity-heading">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <h2 id="activity-heading" className="font-display text-2xl font-semibold text-[var(--foreground)]">
              Recent network activity
            </h2>
            <p className="text-sm text-[var(--muted)]">
              Live ledger across community projects - claims, submissions, reviews, and ships.
            </p>
          </div>
          <Link href="/activity" className="text-sm text-[var(--accent)] hover:opacity-80">
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
        <h2 id="how-heading" className="font-display text-2xl font-semibold text-[var(--foreground)]">
          How it works
        </h2>
        <ol className="mt-4 grid gap-4 sm:grid-cols-4">
          {[
            {
              n: "01",
              t: "Propose",
              d: "Open a community project with hierarchical goals and an open license",
            },
            {
              n: "02",
              t: "Break it down",
              d: "Split the mission into claimable leaves so many builders can help in parallel",
            },
            {
              n: "03",
              t: "Claim",
              d: "Pick a ready leaf; build with your own Grok or tools - keys stay local",
            },
            {
              n: "04",
              t: "Ship",
              d: "Submit work, get peer review, and leave a public artifact for the community",
            },
          ].map((step) => (
            <li
              key={step.n}
              className="gf-surface gf-card-hover rounded-2xl p-4"
            >
              <span className="font-mono text-xs text-[var(--accent)]">{step.n}</span>
              <h3 className="mt-1 font-semibold text-[var(--foreground)]">{step.t}</h3>
              <p className="mt-1 text-sm text-[var(--muted)]">{step.d}</p>
            </li>
          ))}
        </ol>
      </section>

      <GoodFirstStrip
        items={goodFirstLeaves.map((t) => ({
          id: t.id,
          title: t.title,
          projectSlug: t.project.slug,
          projectTitle: t.project.title,
          estimatedTokens: t.estimatedTokens,
        }))}
      />

      <section>
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl font-semibold text-[var(--foreground)]">Live projects</h2>
            <p className="text-sm text-[var(--muted)]">
              Greater-good work with open licenses and transparent task progress.
            </p>
          </div>
          <Link href="/projects" className="text-sm text-[var(--accent)] hover:opacity-80">
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
                <ProjectBannerThumb url={p.bannerUrl} title={p.title} />
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
                <p className="mt-2 line-clamp-2 text-sm text-[var(--muted)]">
                  {publicProjectBlurb(p.description)}
                </p>
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

      <HomeFaq />

      <section className="rounded-3xl border border-[color:var(--accent)]/25 bg-[color:var(--accent)]/5 p-6 sm:p-8">
        <h2 className="font-display text-xl font-semibold text-[var(--foreground)]">Trust rails</h2>
        <ul className="mt-3 grid gap-2 text-sm text-[var(--muted)] sm:grid-cols-2">
          <li>Never stores user xAI / SuperGrok credentials</li>
          <li>Public labor ledgers and contribution receipts on every project</li>
          <li>Open license commitment for shared community outputs</li>
          <li>Alignment pre-check on new project proposals</li>
        </ul>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Link href="/about" className="text-sm text-[var(--accent)] hover:opacity-80">
            Read about safety and terms
          </Link>
          <Link href={signedIn ? "/tasks" : "/login"}>
            <Button>{signedIn ? "Claim a leaf" : "Sign in with X"}</Button>
          </Link>
        </div>
      </section>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: HOME_FAQS.map((f) => ({
              "@type": "Question",
              name: f.q,
              acceptedAnswer: { "@type": "Answer", text: f.a },
            })),
          }),
        }}
      />
    </div>
  );
}
