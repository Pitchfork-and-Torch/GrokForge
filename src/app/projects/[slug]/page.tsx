import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Badge, Card, ProgressBar } from "@/components/ui";
import type { Metadata } from "next";
import {
  CreatorAcceptButton,
  CreatorBulkAcceptButton,
} from "@/components/task-actions";
import { DonateForm } from "@/components/donate-form";
import { MatchingFundsPanel } from "@/components/matching-funds-panel";
import { LeaderboardPanel } from "@/components/leaderboard-panel";
import { ProjectComments } from "@/components/project-comments";
import { ProjectCreatorActions } from "@/components/project-creator-actions";
import { EditProjectForm } from "@/components/edit-project-form";
import { MilestoneVerifyBar } from "@/components/milestone-verify";
import { LinkArtifactForm } from "@/components/link-artifact-form";
import { FounderPinButton } from "@/components/featured-project-card";
import { ProjectRankingPanel } from "@/components/project-ranking-panel";
import { ProjectScorecardForm } from "@/components/project-scorecard-form";
import { isFounderHandle } from "@/lib/identity";
import { getFeaturedProjectId } from "@/lib/site-stats";
import { DonateBanner } from "@/components/donate-banner";
import { WatchProjectButton } from "@/components/watch-project-button";
import { ProjectThumbButton } from "@/components/project-thumb-button";
import { ShareProjectButton } from "@/components/share-project-button";
import { CopyLinkButton } from "@/components/copy-link-button";
import { fetchLeaderboard } from "@/lib/leaderboard-data";
import { expireStaleClaims } from "@/lib/expire-claims";
import { CollapsibleTaskTree, type TaskTreeNode } from "@/components/collapsible-task-tree";
import { CollapsibleLedger } from "@/components/collapsible-ledger";
import {
  ProjectCompletedBadge,
  ProjectCompletedBanner,
} from "@/components/project-completed-badge";
import {
  SealShipCta,
  ViewShipPackageLink,
} from "@/components/seal-ship-cta";
import {
  BannerAutoGenerate,
  BannerCreatorControls,
  ProjectBannerHero,
} from "@/components/project-banner";
import {
  CATEGORY_LABELS,
  FUND_TYPE_LABELS,
  formatCents,
  isProjectCompleteDisplay,
  projectTaskProgress,
} from "@/lib/utils";
import { ProjectEditHistory } from "@/components/project-edit-history";
import { AddLeafForm } from "@/components/add-leaf-form";
import { ReadySetPanel } from "@/components/ready-set-panel";
import { formatProjectCreatedAt } from "@/lib/edit-history";

export const dynamic = "force-dynamic";

const site =
  process.env.NEXTAUTH_URL?.replace(/\/$/, "") ||
  process.env.AUTH_URL?.replace(/\/$/, "") ||
  "https://grokforge.app";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  try {
    const p = await prisma.project.findUnique({
      where: { slug },
      select: {
        title: true,
        description: true,
        license: true,
        status: true,
        bannerUrl: true,
      },
    });
    if (!p) return { title: "Project | GrokForge" };
    const desc = p.description.slice(0, 160);
    // Prefer hosted HTTPS banners for OG; data URLs are too large for meta
    const ogImages =
      p.bannerUrl && p.bannerUrl.startsWith("https://")
        ? [{ url: p.bannerUrl, width: 1200, height: 630, alt: p.title }]
        : undefined;
    return {
      title: `${p.title} | GrokForge`,
      description: desc,
      openGraph: {
        title: p.title,
        description: desc,
        url: `${site}/projects/${slug}`,
        siteName: "GrokForge",
        ...(ogImages ? { images: ogImages } : {}),
      },
      twitter: {
        card: "summary_large_image",
        title: p.title,
        description: desc,
        ...(ogImages ? { images: [p.bannerUrl as string] } : {}),
      },
    };
  } catch {
    return { title: "Project | GrokForge" };
  }
}

function buildTree(
  tasks: {
    id: string;
    title: string;
    prompt: string;
    acceptanceCriteria: string;
    estimatedTokens: number;
    status: string;
    parentId: string | null;
    sortOrder: number;
    claims: {
      id: string;
      active: boolean;
      userId: string;
      expiresAt: Date | null;
      user: { handle: string | null; name: string | null };
    }[];
    contributions: {
      id: string;
      body: string;
      sources: string | null;
      status: string;
      score: number | null;
      contentType: string;
      user: { id: string; handle: string | null };
      createdAt: Date;
    }[];
  }[]
): TaskTreeNode[] {
  const map = new Map<string, TaskTreeNode>();
  tasks.forEach((t) =>
    map.set(t.id, {
      id: t.id,
      title: t.title,
      prompt: t.prompt,
      acceptanceCriteria: t.acceptanceCriteria,
      estimatedTokens: t.estimatedTokens,
      status: t.status,
      parentId: t.parentId,
      sortOrder: t.sortOrder,
      children: [],
      claims: t.claims.map((c) => ({
        id: c.id,
        active: c.active,
        userId: c.userId,
        expiresAt: c.expiresAt ? c.expiresAt.toISOString() : null,
        user: c.user,
      })),
      contributions: t.contributions.map((c) => ({
        id: c.id,
        body: c.body,
        sources: c.sources,
        status: c.status,
        score: c.score,
        contentType: c.contentType,
        user: c.user,
        createdAtLabel:
          c.createdAt.toISOString().slice(0, 16).replace("T", " ") + " UTC",
      })),
    })
  );
  const roots: TaskTreeNode[] = [];
  map.forEach((t) => {
    if (t.parentId && map.has(t.parentId)) {
      map.get(t.parentId)!.children!.push(t);
    } else {
      roots.push(t);
    }
  });
  const sortRec = (nodes: TaskTreeNode[]) => {
    nodes.sort((a, b) => a.sortOrder - b.sortOrder);
    nodes.forEach((n) => n.children && sortRec(n.children));
  };
  sortRec(roots);
  return roots;
}

export default async function ProjectDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ donated?: string; canceled?: string; banner?: string }>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const session = await auth();
  try {
    await expireStaleClaims({ limit: 15, notify: true });
  } catch {
    // non-fatal
  }
  const project = await prisma.project.findUnique({
    where: { slug },
    include: {
      proposer: true,
      fundPots: true,
      milestones: { orderBy: { sortOrder: "asc" } },
      artifacts: { orderBy: { createdAt: "desc" }, take: 40 },
      donations: {
        orderBy: { createdAt: "desc" },
        take: 20,
        include: { pot: true },
      },
      ledgerEntries: { orderBy: { createdAt: "desc" }, take: 40 },
      editHistory: {
        orderBy: { createdAt: "desc" },
        take: 50,
      },
      scorecard: {
        include: { scorer: { select: { handle: true } } },
      },
      comments: {
        orderBy: { createdAt: "desc" },
        take: 100,
        include: {
          user: { select: { id: true, handle: true, name: true } },
        },
      },
      tasks: {
        orderBy: { sortOrder: "asc" },
        include: {
          claims: {
            where: { active: true },
            include: { user: { select: { handle: true, name: true } } },
            // userId is on claim for cancel ownership
          },
          contributions: {
            orderBy: { createdAt: "desc" },
            include: { user: { select: { id: true, handle: true } } },
          },
        },
      },
    },
  });

  if (!project) notFound();

  const tree = buildTree(project.tasks);
  const raised = project.fundPots.reduce((s, f) => s + f.balanceCents, 0);
  const taskProgress = projectTaskProgress(project.tasks);
  const showComplete = isProjectCompleteDisplay(project.status, project.tasks);
  const primaryPackage = project.artifacts.find(
    (a) => a.source === "package" && a.isPrimary
  ) || project.artifacts.find((a) => a.source === "package");
  const hasSupport =
    raised > 0 || project.donations.some((d) => d.amountCents > 0);
  const isCreator = session?.user?.id === project.proposerId;
  const isFounder = isFounderHandle(session?.user?.handle);
  const canSeal = (isCreator || isFounder) && showComplete;

  let rankingRank: number | null = null;
  let scoredCount = 0;
  try {
    const cards = await prisma.projectScorecard.findMany({
      where: {
        project: { status: { in: ["ACTIVE", "FUNDED", "COMPLETED"] } },
      },
      select: { projectId: true, totalScore: true },
      orderBy: { totalScore: "desc" },
    });
    scoredCount = cards.length;
    const idx = cards.findIndex((c) => c.projectId === project.id);
    rankingRank = idx >= 0 ? idx + 1 : null;
  } catch {
    rankingRank = null;
  }
  let featuredId: string | null = null;
  try {
    featuredId = await getFeaturedProjectId();
  } catch {
    featuredId = null;
  }
  const isFeatured = featuredId === project.id;
  const pendingForCreator = isCreator
    ? project.tasks.flatMap((t) =>
        t.contributions
          .filter((c) => c.status === "PENDING")
          .map((c) => ({
            id: c.id,
            taskTitle: t.title,
            taskId: t.id,
            handle: c.user.handle,
          }))
      )
    : [];

  let watching = false;
  let watchCount = 0;
  let thumbCount = 0;
  let thumbed = false;
  try {
    const [mine, count] = await Promise.all([
      session?.user?.id
        ? prisma.projectWatch.findUnique({
            where: {
              userId_projectId: {
                userId: session.user.id,
                projectId: project.id,
              },
            },
          })
        : Promise.resolve(null),
      prisma.projectWatch.count({ where: { projectId: project.id } }),
    ]);
    watching = !!mine;
    watchCount = count;
  } catch {
    // schema may lag one deploy; page still works
  }
  try {
    const [myThumb, tCount] = await Promise.all([
      session?.user?.id
        ? prisma.projectThumb.findUnique({
            where: {
              userId_projectId: {
                userId: session.user.id,
                projectId: project.id,
              },
            },
          })
        : Promise.resolve(null),
      prisma.projectThumb.count({ where: { projectId: project.id } }),
    ]);
    thumbed = !!myThumb;
    thumbCount = tCount;
  } catch {
    // table may lag one deploy
  }

  const projectLeaders = await fetchLeaderboard({
    projectId: project.id,
    window: "all",
    limit: 10,
  });

  const commentRows = project.comments.map((c) => ({
    id: c.id,
    body: c.body,
    hidden: c.hidden,
    createdAt: c.createdAt.toISOString().slice(0, 16).replace("T", " ") + " UTC",
    user: c.user,
  }));

  return (
    <div className="space-y-8">
      <DonateBanner
        donated={sp.donated === "1"}
        canceled={sp.canceled === "1"}
      />
      <ProjectBannerHero url={project.bannerUrl} title={project.title} />
      {isCreator && (
        <BannerAutoGenerate
          projectId={project.id}
          enabled={sp.banner === "gen" && !project.bannerUrl}
          hasBanner={!!project.bannerUrl}
        />
      )}
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <Badge>{CATEGORY_LABELS[project.category]}</Badge>
          <Badge className="border-white/10 bg-white/5 text-stone-300">{project.license}</Badge>
          <Badge className="border-white/10 bg-white/5 text-stone-300">{project.status}</Badge>
          {showComplete && <ProjectCompletedBadge size="md" />}
          {watchCount > 0 && (
            <Badge className="border-amber-500/30 bg-amber-500/10 text-amber-200">
              {watchCount} watching
            </Badge>
          )}
          <Badge className="border-amber-500/40 bg-amber-500/10 text-amber-100">
            {thumbCount} thumbs-up
          </Badge>
        </div>
        <div className="flex flex-wrap items-start gap-3">
          <h1 className="text-3xl font-bold text-white sm:text-4xl">{project.title}</h1>
          {isCreator && project.status !== "ARCHIVED" && (
            <a
              href="#edit-project"
              className="mt-1.5 inline-flex shrink-0 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-semibold text-stone-200 hover:border-amber-400/40 hover:bg-amber-500/10 hover:text-amber-100"
            >
              Edit name &amp; description
            </a>
          )}
        </div>
        {showComplete && (
          <ProjectCompletedBanner
            completed={taskProgress.completed}
            total={taskProgress.total}
          />
        )}
        {canSeal && (
          <SealShipCta
            slug={project.slug}
            hasPrimaryPackage={!!primaryPackage}
          />
        )}
        {primaryPackage && !canSeal && (
          <div className="flex flex-wrap items-center gap-2">
            <ViewShipPackageLink slug={project.slug} />
          </div>
        )}
        {primaryPackage && canSeal && (
          <div className="flex flex-wrap items-center gap-2">
            <ViewShipPackageLink slug={project.slug} />
          </div>
        )}
        <p className="max-w-3xl text-stone-400 whitespace-pre-wrap">{project.description}</p>
        <p className="text-sm text-stone-500">
          Proposed by{" "}
          <Link className="text-amber-400 hover:underline" href={`/u/${project.proposer.handle}`}>
            @{project.proposer.handle}
          </Link>{" "}
          · {project.proposer.reputation} rep
          {" · "}
          <time dateTime={project.createdAt.toISOString()}>
            created {formatProjectCreatedAt(project.createdAt).absolute}
          </time>
          {" "}
          <span className="text-stone-600">
            ({formatProjectCreatedAt(project.createdAt).relative})
          </span>
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <ProjectThumbButton
            projectId={project.id}
            initialCount={thumbCount}
            initiallyThumbed={thumbed}
            signedIn={!!session?.user?.id}
          />
          <WatchProjectButton
            projectId={project.id}
            initiallyWatching={watching}
            signedIn={!!session?.user?.id}
          />
          <ShareProjectButton
            title={project.title}
            slug={project.slug}
            siteUrl={site}
            category={project.category}
            proposerHandle={project.proposer.handle}
            featured={isFeatured}
          />
          <CopyLinkButton url={`${site}/projects/${project.slug}`} />
          <FounderPinButton
            projectId={project.id}
            isFeatured={isFeatured}
            isFounder={isFounder}
          />
          {isFeatured && (
            <Badge className="border-amber-500/40 bg-amber-500/10 text-amber-200">
              Featured on home
            </Badge>
          )}
          <Link
            href="/tasks"
            className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-stone-300 hover:border-amber-500/30"
          >
            All open tasks
          </Link>
        </div>
        {/* JSON-LD for search / AEO */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SoftwareSourceCode",
              name: project.title,
              description: project.description.slice(0, 500),
              license: project.license,
              url: `${site}/projects/${project.slug}`,
              author: {
                "@type": "Person",
                name: project.proposer.handle
                  ? `@${project.proposer.handle}`
                  : project.proposer.name || "proposer",
                url: project.proposer.handle
                  ? `${site}/u/${project.proposer.handle}`
                  : undefined,
              },
              programmingLanguage: "Multi-agent",
              isAccessibleForFree: true,
            }),
          }}
        />
        {project.alignmentCheck && (
          <p className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 text-xs text-emerald-200/90">
            Alignment pre-check: {project.alignmentCheck}
          </p>
        )}
        {isCreator && (
          <div className="flex flex-col gap-3">
            {project.status !== "ARCHIVED" && (
              <EditProjectForm
                projectId={project.id}
                title={project.title}
                description={project.description}
                impactSummary={project.impactSummary}
                license={project.license}
                bannerUrl={project.bannerUrl}
                status={project.status}
              />
            )}
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-start">
              <BannerCreatorControls
                projectId={project.id}
                hasBanner={!!project.bannerUrl}
              />
              <ProjectCreatorActions
                projectId={project.id}
                title={project.title}
                status={project.status}
                hasSupport={hasSupport}
              />
            </div>
          </div>
        )}
        {(isCreator || isFounder) && (
          <ProjectScorecardForm
            projectId={project.id}
            initial={
              project.scorecard
                ? {
                    strategicAlignment: project.scorecard.strategicAlignment,
                    technicalFeasibility: project.scorecard.technicalFeasibility,
                    businessValue: project.scorecard.businessValue,
                    effortDemand: project.scorecard.effortDemand,
                    riskUncertainty: project.scorecard.riskUncertainty,
                    timeSensitivity: project.scorecard.timeSensitivity,
                    strategicNote: project.scorecard.strategicNote,
                    technicalNote: project.scorecard.technicalNote,
                    businessNote: project.scorecard.businessNote,
                    effortNote: project.scorecard.effortNote,
                    riskNote: project.scorecard.riskNote,
                    timeNote: project.scorecard.timeNote,
                    totalScore: project.scorecard.totalScore,
                  }
                : null
            }
          />
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-xl font-semibold text-white">Task hierarchy</h2>
              <div className="flex flex-wrap gap-2">
                {(isCreator || isFounder) && (
                  <Link
                    href={`/projects/${project.slug}/cockpit`}
                    className="inline-flex rounded-full border border-amber-400/40 bg-amber-500/15 px-3 py-1 text-xs font-semibold text-amber-100 hover:bg-amber-500/25"
                  >
                    Cockpit
                  </Link>
                )}
                {isCreator && project.status !== "ARCHIVED" && (
                  <AddLeafForm projectId={project.id} />
                )}
              </div>
            </div>
            <div className="mb-4 space-y-4">
              <ReadySetPanel
                projectSlug={project.slug}
                tasks={project.tasks.map((t) => ({
                  id: t.id,
                  title: t.title,
                  status: t.status,
                  parentId: t.parentId,
                  sortOrder: t.sortOrder,
                  estimatedTokens: t.estimatedTokens,
                  goodFirst: t.goodFirst,
                  tags: t.tags,
                  dependsOnJson: t.dependsOnJson,
                }))}
              />
              <ProjectEditHistory
                createdAtIso={project.createdAt.toISOString()}
                createdAtLabel={formatProjectCreatedAt(project.createdAt).absolute}
                rows={(project.editHistory || []).map((h) => ({
                  id: h.id,
                  field: h.field,
                  summary: h.summary,
                  actorHandle: h.actorHandle,
                  createdAt:
                    h.createdAt.toISOString().slice(0, 16).replace("T", " ") + " UTC",
                  oldValue: h.oldValue,
                  newValue: h.newValue,
                }))}
              />
            </div>
            {isCreator && pendingForCreator.length > 0 && (
              <Card className="mb-4 space-y-3 border-amber-900/45 bg-amber-500/5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-400">
                      Creator queue
                    </p>
                    <h3 className="text-base font-semibold text-white">
                      {pendingForCreator.length} pending submission
                      {pendingForCreator.length === 1 ? "" : "s"}
                    </h3>
                    <p className="mt-1 text-xs text-stone-500">
                      Accept so labor counts on the leaderboard. Or open each task below for full
                      review.
                    </p>
                  </div>
                  <CreatorBulkAcceptButton
                    projectId={project.id}
                    count={pendingForCreator.length}
                  />
                </div>
                <ul className="space-y-2 text-sm">
                  {pendingForCreator.map((p) => (
                    <li
                      key={p.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-black/30 px-3 py-2"
                    >
                      <div className="min-w-0">
                        <Link
                          href={`#contribution-${p.id}`}
                          className="font-medium text-amber-300 hover:underline"
                        >
                          {p.taskTitle}
                        </Link>
                        <div className="text-xs text-stone-500">
                          @{p.handle || "builder"} ·{" "}
                          <Link href={`/c/${p.id}`} className="hover:text-amber-400">
                            receipt
                          </Link>
                        </div>
                      </div>
                      <CreatorAcceptButton contributionId={p.id} />
                    </li>
                  ))}
                </ul>
              </Card>
            )}
            <CollapsibleTaskTree
              tree={tree}
              signedIn={!!session?.user}
              currentUserId={session?.user?.id}
              isCreator={isCreator}
            />
            {!session?.user && (
              <p className="mt-3 text-sm text-stone-500">
                <Link href="/login" className="text-amber-400 hover:underline">
                  Sign in with X
                </Link>{" "}
                to claim tasks and submit outputs. Tasks stay collapsed by default - status
                chips show open, claimed, submitted, or done.
              </p>
            )}
          </section>

          <ProjectComments
            projectId={project.id}
            comments={commentRows}
            signedIn={!!session?.user}
            currentUserId={session?.user?.id}
            isCreator={isCreator}
          />

          <section>
            <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
              <h2 className="text-xl font-semibold text-white">Public ledger</h2>
              <Link href="/activity" className="text-xs text-amber-400 hover:underline">
                Network activity
              </Link>
            </div>
            <p className="mb-2 text-xs text-stone-500">
              Showing the latest 3 events by default. Expand for the full project trail.
            </p>
            <CollapsibleLedger
              defaultVisible={3}
              entries={project.ledgerEntries.map((e) => ({
                id: e.id,
                kind: e.kind,
                summary: e.summary,
                amountCents: e.amountCents,
                createdAtLabel:
                  e.createdAt.toISOString().slice(0, 16).replace("T", " ") + " UTC",
              }))}
            />
          </section>
        </div>

        <aside className="space-y-4">
          <ProjectRankingPanel
            scorecard={
              project.scorecard
                ? {
                    totalScore: project.scorecard.totalScore,
                    strategicAlignment: project.scorecard.strategicAlignment,
                    technicalFeasibility: project.scorecard.technicalFeasibility,
                    businessValue: project.scorecard.businessValue,
                    effortDemand: project.scorecard.effortDemand,
                    riskUncertainty: project.scorecard.riskUncertainty,
                    timeSensitivity: project.scorecard.timeSensitivity,
                    strategicNote: project.scorecard.strategicNote,
                    technicalNote: project.scorecard.technicalNote,
                    businessNote: project.scorecard.businessNote,
                    effortNote: project.scorecard.effortNote,
                    riskNote: project.scorecard.riskNote,
                    timeNote: project.scorecard.timeNote,
                    scorerHandle: project.scorecard.scorer.handle,
                    updatedAt: project.scorecard.updatedAt,
                    rank: rankingRank,
                    scoredCount,
                  }
                : null
            }
          />
          <Card className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-semibold text-white">Task progress</h2>
              {showComplete && <ProjectCompletedBadge size="sm" />}
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-stone-400">Completed</span>
              <span className="font-semibold text-white">
                {taskProgress.completed} / {taskProgress.total}
              </span>
            </div>
            <ProgressBar value={taskProgress.pct} />
            <p className="text-xs text-stone-500">
              {taskProgress.open} open · {taskProgress.claimed} claimed ·{" "}
              {taskProgress.submitted} submitted ·{" "}
              {taskProgress.total > 0 ? Math.round(taskProgress.pct) : 0}% accepted
            </p>
            <div className="border-t border-white/10 pt-3">
              <h3 className="text-sm font-medium text-stone-300">Compute support pots</h3>
              <p className="mt-1 text-[11px] text-stone-500">
                Optional - no money goal. Prefer API credits / SuperGrok for builders.
              </p>
              {raised > 0 && (
                <div className="mt-1 flex justify-between text-xs text-stone-500">
                  <span>Supported</span>
                  <span className="text-stone-300">{formatCents(raised)}</span>
                </div>
              )}
            </div>
            <ul className="space-y-2 text-sm">
              {project.fundPots.map((p) => (
                <li key={p.id} className="flex justify-between gap-2 text-stone-400">
                  <span>
                    {p.label}{" "}
                    <span className="text-xs text-stone-600">
                      ({FUND_TYPE_LABELS[p.type] || p.type})
                    </span>
                  </span>
                  <span className="text-stone-200">{formatCents(p.balanceCents)}</span>
                </li>
              ))}
            </ul>
            {session?.user ? (
              <DonateForm
                projectId={project.id}
                stripeConfigured={Boolean(process.env.STRIPE_SECRET_KEY?.trim())}
                pots={project.fundPots.map((p) => ({
                  id: p.id,
                  label: p.label,
                  type: p.type,
                  balanceCents: p.balanceCents,
                }))}
              />
            ) : (
              <p className="text-xs text-stone-500">
                <Link href="/login" className="text-amber-400">
                  Sign in with X
                </Link>{" "}
                to donate.
              </p>
            )}
            <MatchingFundsPanel
              projectId={project.id}
              projectSlug={project.slug}
              canEdit={isCreator || isFounder}
              signedIn={Boolean(session?.user?.id)}
              matchingEnabled={project.matchingEnabled}
              matchingRatioBps={project.matchingRatioBps}
              matchingPoolCents={project.matchingPoolCents}
              matchingRemainingCents={project.matchingRemainingCents}
            />
          </Card>

          <Card>
            <h2 className="text-lg font-semibold text-white">Milestones</h2>
            <p className="mt-1 text-[11px] text-stone-500">
              Dual verification: one human review + one agent worker before release.
            </p>
            <ul className="mt-3 space-y-3">
              {project.milestones.map((m) => (
                <li key={m.id} className="text-sm">
                  <div className="flex justify-between gap-2">
                    <span className="font-medium text-stone-200">{m.title}</span>
                    <span className="text-xs text-stone-500">{formatCents(m.targetCents)}</span>
                  </div>
                  <p className="text-xs text-stone-500">{m.description}</p>
                  <MilestoneVerifyBar
                    milestoneId={m.id}
                    humanDone={!!m.humanVerifiedAt}
                    agentDone={!!m.agentVerifiedAt}
                    released={m.released}
                    agentNote={m.agentVerifiedNote}
                    canAct={!!session?.user?.id}
                  />
                </li>
              ))}
              {project.milestones.length === 0 && (
                <li className="text-xs text-stone-600">No milestones yet.</li>
              )}
            </ul>
          </Card>

          <LeaderboardPanel
            rows={projectLeaders}
            title="Project leaders"
            subtitle="This project only"
            compact
            showViewAll
          />

          <Card>
            <h2 className="text-lg font-semibold text-white">Artifacts</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {project.artifacts.map((a) => (
                <li key={a.id}>
                  {a.source === "package" ? (
                    <Link
                      href={`/projects/${project.slug}/ship`}
                      className="text-emerald-300 hover:underline"
                    >
                      {a.title}
                    </Link>
                  ) : (
                    <a
                      href={a.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-amber-400 hover:underline"
                    >
                      {a.title}
                    </a>
                  )}
                  <span className="ml-2 text-xs text-stone-600">{a.license}</span>
                  {a.source === "package" && (
                    <span className="ml-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] text-emerald-200">
                      sealed {a.version || ""}
                    </span>
                  )}
                  {a.source === "github" && (
                    <span className="ml-1 rounded-full border border-white/10 px-1.5 py-0.5 text-[10px] text-stone-500">
                      GitHub
                    </span>
                  )}
                </li>
              ))}
              {project.artifacts.length === 0 && (
                <li className="text-stone-500">
                  Link open-source GitHub repos, PRs, or public deliverables.
                </li>
              )}
            </ul>
            {session?.user?.id && (
              <LinkArtifactForm
                projectId={project.id}
                defaultLicense={project.license}
              />
            )}
          </Card>
        </aside>
      </div>
    </div>
  );
}
