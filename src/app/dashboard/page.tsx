import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Badge, Button, Card, Input, Label, Textarea } from "@/components/ui";
import { FounderBadge } from "@/components/founder-badge";
import { ProjectCreatorActions } from "@/components/project-creator-actions";
import {
  CancelClaimButton,
  CreatorAcceptButton,
  CreatorBulkAcceptButton,
  CreatorModerationBar,
} from "@/components/task-actions";
import { formatCents, formatRelativeTime, projectTaskProgress } from "@/lib/utils";
import { EmptyState } from "@/components/empty-state";
import { DashJump, DashKpi, DashRow, DashSection } from "@/components/dash";
import { markNotificationsReadAction, updateProfileAction } from "@/lib/actions";
import { isFounderHandle } from "@/lib/identity";
import { computeStreak, streakBadgeLabel } from "@/lib/streaks";
import { BuilderWidgetCard } from "@/components/builder-widget-card";
import { BadgeRow } from "@/components/badge-row";
import { BadgeUnlockToast } from "@/components/badge-unlock-toast";
import { WeeklyChallenges } from "@/components/weekly-challenges";
import { AgentTokensCard } from "@/components/agent-tokens-card";
import { LocalWorkerCard } from "@/components/local-worker-card";
import { WorkerWebhookCard } from "@/components/worker-webhook-card";
import { BuilderFlywheelPanel } from "@/components/builder-flywheel-panel";
import { fetchUserBadges } from "@/lib/badges-data";
import { fetchWeeklyChallenges } from "@/lib/challenges-data";
import { isAgentSubmission } from "@/lib/deliverable-quality";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?next=/dashboard");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      projects: {
        orderBy: { createdAt: "desc" },
        include: {
          fundPots: true,
          donations: { where: { amountCents: { gt: 0 } }, select: { id: true }, take: 1 },
          tasks: { select: { id: true, status: true, parentId: true } },
          _count: { select: { comments: true } },
        },
      },
      claims: {
        orderBy: { claimedAt: "desc" },
        take: 20,
        include: {
          task: { include: { project: { select: { slug: true, title: true } } } },
        },
      },
      contributions: {
        orderBy: { createdAt: "desc" },
        take: 20,
        include: {
          task: { select: { title: true, project: { select: { slug: true } } } },
        },
      },
      donations: {
        orderBy: { createdAt: "desc" },
        take: 20,
        include: { project: { select: { slug: true, title: true } }, pot: true },
      },
      notifications: {
        orderBy: { createdAt: "desc" },
        take: 30,
      },
    },
  });

  if (!user) redirect("/login");
  const founder = isFounderHandle(user.handle);
  const streak = computeStreak(user.contributions.map((c) => c.createdAt));
  const streakLabel = streakBadgeLabel(streak.current);
  const unread = user.notifications.filter((n) => !n.read).length;
  const badges = await fetchUserBadges(user.id);
  const challenges = await fetchWeeklyChallenges(user.id);

  let watched: {
    id: string;
    project: { slug: string; title: string; status: string; category: string };
  }[] = [];
  try {
    watched = await prisma.projectWatch.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: {
        project: {
          select: { slug: true, title: true, status: true, category: true },
        },
      },
    });
  } catch {
    watched = [];
  }

  // Smarter matching: category affinity, watches, keywords, funding, recency
  const { extractKeywords, rankTasksForUser } = await import("@/lib/task-matching");
  const pastTitles = user.contributions.map((c) => c.task.title);
  const openPool = await prisma.task.findMany({
    where: {
      status: "OPEN",
      parentId: { not: null },
      project: { status: { in: ["ACTIVE", "FUNDED"] } },
    },
    include: {
      project: {
        select: {
          slug: true,
          title: true,
          category: true,
          fundPots: { select: { balanceCents: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 40,
  });
  let contribCategories: string[] = user.projects.map((p) => p.category as string);
  try {
    const catRows = await prisma.contribution.findMany({
      where: { userId: user.id },
      select: { task: { select: { project: { select: { category: true } } } } },
      take: 50,
    });
    contribCategories = [
      ...new Set([
        ...contribCategories,
        ...catRows.map((r) => r.task.project.category as string),
      ]),
    ];
  } catch {
    /* keep project categories */
  }

  const openTasks = rankTasksForUser(
    openPool.map((t) => ({
      id: t.id,
      title: t.title,
      estimatedTokens: t.estimatedTokens,
      createdAt: t.createdAt,
      project: {
        slug: t.project.slug,
        title: t.project.title,
        category: t.project.category,
        raisedCents: t.project.fundPots.reduce((s, f) => s + f.balanceCents, 0),
      },
    })),
    {
      preferredCategories: contribCategories,
      watchedSlugs: watched.map((w) => w.project.slug),
      proposedSlugs: user.projects.map((p) => p.slug),
      pastKeywords: extractKeywords(pastTitles),
    },
    8
  );

  // Pending submissions on projects I own (creator moderation queue)
  const ownedProjectIds = user.projects.map((p) => p.id);
  let pendingOnMine: {
    id: string;
    status: string;
    createdAt: Date;
    task: {
      id: string;
      title: string;
      project: { id: string; slug: string; title: string };
    };
    user: { handle: string | null };
  }[] = [];
  if (ownedProjectIds.length > 0) {
    try {
      pendingOnMine = await prisma.contribution.findMany({
        where: {
          status: "PENDING",
          task: { projectId: { in: ownedProjectIds } },
        },
        orderBy: { createdAt: "desc" },
        take: 30,
        include: {
          task: {
            select: {
              id: true,
              title: true,
              project: { select: { id: true, slug: true, title: true } },
            },
          },
          user: { select: { handle: true } },
        },
      });
    } catch {
      pendingOnMine = [];
    }
  }
  const pendingByProject = new Map<
    string,
    { projectId: string; slug: string; title: string; count: number }
  >();
  for (const row of pendingOnMine) {
    const pid = row.task.project.id;
    const cur = pendingByProject.get(pid);
    if (cur) cur.count += 1;
    else {
      pendingByProject.set(pid, {
        projectId: pid,
        slug: row.task.project.slug,
        title: row.task.project.title,
        count: 1,
      });
    }
  }

  const myPending = user.contributions.filter((c) => c.status === "PENDING");
  const myAccepted = user.contributions.filter((c) => c.status === "ACCEPTED");
  const activeClaims = user.claims.filter((c) => c.active).length;

  // Builder Flywheel: others' pending for peer review
  let peerableForMe: {
    id: string;
    taskTitle: string;
    projectSlug: string;
    projectTitle: string;
    authorHandle: string | null;
    createdAtLabel: string;
    agent: boolean;
  }[] = [];
  try {
    const peerRows = await prisma.contribution.findMany({
      where: {
        status: "PENDING",
        userId: { not: user.id },
        task: {
          project: { status: { in: ["ACTIVE", "FUNDED", "COMPLETED"] } },
        },
      },
      orderBy: { createdAt: "asc" },
      take: 8,
      include: {
        user: { select: { handle: true } },
        task: {
          select: {
            title: true,
            project: { select: { slug: true, title: true } },
          },
        },
      },
    });
    peerableForMe = peerRows.map((c) => ({
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
    }));
  } catch {
    peerableForMe = [];
  }

  const inboxCount = pendingOnMine.length + unread + peerableForMe.length;

  // Comment reports on projects I own (moderation queue light)
  let reportedComments: {
    id: string;
    body: string;
    reportCount: number;
    project: { slug: string; title: string };
    user: { handle: string | null };
  }[] = [];
  if (ownedProjectIds.length > 0) {
    try {
      const rows = await prisma.projectComment.findMany({
        where: {
          projectId: { in: ownedProjectIds },
          reports: { some: {} },
          hidden: false,
        },
        orderBy: { updatedAt: "desc" },
        take: 15,
        include: {
          project: { select: { slug: true, title: true } },
          user: { select: { handle: true } },
          _count: { select: { reports: true } },
        },
      });
      reportedComments = rows.map((c) => ({
        id: c.id,
        body: c.body.slice(0, 160),
        reportCount: c._count.reports,
        project: c.project,
        user: c.user,
      }));
    } catch {
      reportedComments = [];
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-display text-3xl font-bold text-[var(--foreground)]">Dashboard</h1>
            {founder && <FounderBadge />}
            <BadgeRow badges={badges} max={5} size="md" />
          </div>
          <p className="mt-1 text-sm text-[var(--muted)]">
            @{user.handle} · {user.reputation} reputation
            {streakLabel ? ` · ${streakLabel}` : streak.current > 0 ? ` · ${streak.current}d streak` : ""}
            {" · "}
            claim windows respect rate limits
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {founder && (
            <Link href="/admin/builders">
              <Button variant="secondary">Builders</Button>
            </Link>
          )}
          <Link href="/cockpit">
            <Button>Cockpit</Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <DashKpi label="Rep" value={user.reputation} href="/leaderboard" />
        <DashKpi
          label="Streak"
          value={streak.current > 0 ? `${streak.current}d` : "0"}
          hint={streak.longest > 0 ? `best ${streak.longest}d` : undefined}
        />
        <DashKpi
          label="Inbox"
          value={inboxCount}
          href="#inbox"
          tone={inboxCount > 0 ? "accent" : "muted"}
          hint={unread > 0 ? `${unread} unread` : "clear"}
        />
        <DashKpi
          label="Active claims"
          value={activeClaims}
          href="#work"
          tone={activeClaims > 0 ? "accent" : "muted"}
        />
        <DashKpi
          label="Accepted"
          value={myAccepted.length}
          href="#work"
          tone="success"
        />
        <DashKpi
          label="Projects"
          value={user.projects.length}
          href="#projects"
        />
      </div>

      <DashJump
        items={[
          { href: "#inbox", label: "Inbox" },
          { href: "#work", label: "Work" },
          { href: "#projects", label: "Projects" },
          { href: "#tools", label: "Tools" },
          { href: "#profile", label: "Profile" },
        ]}
      />

      <BadgeUnlockToast userId={user.id} badges={badges} />
      <WeeklyChallenges challenges={challenges} />

      <DashSection
        id="inbox"
        kicker="Now"
        title="Inbox"
        hint="Reviews, flags, and notifications that unblock the network."
        actions={
          <Link href="/tasks?review=1" className="text-xs font-semibold text-[var(--accent)] hover:underline">
            Review queue
          </Link>
        }
      >
      <BuilderFlywheelPanel
        signedIn
        peerable={peerableForMe}
        awaiting={myPending.map((c) => ({
          id: c.id,
          taskTitle: c.task.title,
          projectSlug: c.task.project.slug,
          createdAtLabel:
            formatRelativeTime(c.createdAt) ||
            c.createdAt.toISOString().slice(0, 16).replace("T", " ") + " UTC",
        }))}
      />

      {reportedComments.length > 0 && (
        <Card className="border-[color:var(--danger)]/40 bg-[color:var(--danger)]/5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--danger)]">
            Comment reports
          </p>
          <h2 className="font-display text-lg font-semibold text-[var(--foreground)]">
            Flagged on your projects ({reportedComments.length})
          </h2>
          <p className="mt-1 text-xs text-stone-500">
            Community reports. Open the project comments to hide or leave visible. Auto-hide at 3
            reports.
          </p>
          <ul className="mt-3 space-y-2 text-sm">
            {reportedComments.map((c) => (
              <li
                key={c.id}
                className="rounded-xl border border-white/10 bg-black/30 px-3 py-2"
              >
                <div className="flex flex-wrap items-center gap-2 text-xs text-stone-500">
                  <span className="font-semibold text-rose-300">
                    {c.reportCount} report{c.reportCount === 1 ? "" : "s"}
                  </span>
                  <span>@{c.user.handle || "anon"}</span>
                  <Link
                    href={`/projects/${c.project.slug}`}
                    className="text-amber-400 hover:underline"
                  >
                    {c.project.title}
                  </Link>
                </div>
                <p className="mt-1 line-clamp-2 text-stone-400">{c.body}</p>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {pendingOnMine.length > 0 && (
        <Card className="border-[color:var(--accent)]/35 bg-[color:var(--accent)]/5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--accent)]">
                Creator moderation
              </p>
              <h2 className="font-display text-lg font-semibold text-[var(--foreground)]">
                Pending on your projects ({pendingOnMine.length})
              </h2>
              <p className="mt-1 text-xs text-stone-500">
                Accept so builders score on the labor leaderboard. Pending work does not rank until
                accepted. Network peers can also help at{" "}
                <Link href="/tasks?review=1" className="text-amber-400 hover:underline">
                  /tasks?review=1
                </Link>
                .
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {[...pendingByProject.values()].map((p) => (
                <CreatorBulkAcceptButton
                  key={p.projectId}
                  projectId={p.projectId}
                  count={p.count}
                />
              ))}
              <Link
                href="/tasks?review=1"
                className="inline-flex items-center rounded-full border border-sky-500/40 bg-sky-500/10 px-3 py-1.5 text-xs font-medium text-sky-100 hover:border-sky-400/60"
              >
                Open review queue
              </Link>
            </div>
          </div>
          <ul className="mt-4 space-y-2 text-sm">
            {pendingOnMine.map((c) => (
              <li
                key={c.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-black/30 px-3 py-2"
              >
                <div className="min-w-0">
                  <Link
                    href={`/projects/${c.task.project.slug}#contribution-${c.id}`}
                    className="font-medium text-amber-300 hover:underline"
                  >
                    {c.task.title}
                  </Link>
                  <div className="text-xs text-stone-500">
                    @{c.user.handle || "builder"} · {c.task.project.title} ·{" "}
                    <Link href={`/c/${c.id}`} className="hover:text-amber-400">
                      receipt
                    </Link>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <CreatorAcceptButton contributionId={c.id} />
                  <CreatorModerationBar contributionId={c.id} />
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {watched.length > 0 && (
        <Card>
          <h2 className="font-display text-lg font-semibold text-[var(--foreground)]">Watching</h2>
          <p className="mt-1 text-xs text-stone-500">
            Projects you bookmarked for quick return
          </p>
          <ul className="mt-3 space-y-2 text-sm">
            {watched.map((w) => (
              <li
                key={w.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/5 bg-black/20 px-3 py-2"
              >
                <Link
                  href={`/projects/${w.project.slug}`}
                  className="font-medium text-amber-300 hover:underline"
                >
                  {w.project.title}
                </Link>
                <span className="text-xs text-stone-500">{w.project.status}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {user.notifications.length > 0 && (
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-display text-lg font-semibold text-[var(--foreground)]">
              Notifications
              {unread > 0 && (
                <span className="ml-2 rounded-full bg-[var(--accent)] px-2 py-0.5 text-xs font-bold text-black">
                  {unread} new
                </span>
              )}
            </h2>
            {unread > 0 && (
              <form
                action={async () => {
                  "use server";
                  await markNotificationsReadAction();
                }}
              >
                <Button type="submit" variant="ghost" className="text-xs">
                  Mark all read
                </Button>
              </form>
            )}
          </div>
          <ul className="mt-3 max-h-64 space-y-2 overflow-y-auto text-sm">
            {user.notifications.map((n) => (
              <li
                key={n.id}
                className={
                  n.read
                    ? "rounded-xl border border-white/5 bg-black/20 px-3 py-2 text-stone-500"
                    : "rounded-xl border border-amber-900/40 bg-amber-500/5 px-3 py-2"
                }
              >
                <div className="font-medium text-stone-200">{n.title}</div>
                <p className="mt-0.5 text-xs text-stone-500">{n.body}</p>
                {n.href && (
                  <Link
                    href={n.href}
                    className="mt-1 inline-block text-xs text-amber-400 hover:underline"
                  >
                    Open
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </Card>
      )}
      </DashSection>

      <DashSection
        id="work"
        kicker="Labor"
        title="Work"
        hint="Recommended leaves, claims, and your submissions."
        actions={
          <Link href="/tasks" className="text-xs font-semibold text-[var(--accent)] hover:underline">
            All tasks
          </Link>
        }
      >
        <Card>
          <h3 className="font-display text-lg font-semibold text-[var(--foreground)]">
            Recommended tasks
          </h3>
          <p className="mt-1 text-xs text-[var(--muted)]">
            Ranked by category affinity, watches, past keywords, funding, and recency. Typical
            claim window: 48h.
          </p>
          {openTasks.length === 0 ? (
            <div className="mt-3">
              <EmptyState
                signedIn
                title="No ranked leaves right now"
                body="Browse the open board or propose a project so the next builders have work."
                primaryHref="/tasks"
                primaryLabel="Browse open tasks"
                secondaryHref="/projects/new"
                secondaryLabel="Propose a project"
              />
            </div>
          ) : (
            <ul className="mt-3 space-y-2">
              {openTasks.map((t) => (
                <DashRow key={t.id}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Link
                      href={`/projects/${t.project.slug}#task-${t.id}`}
                      className="font-medium text-[var(--accent)] hover:underline"
                    >
                      {t.title}
                    </Link>
                    {"matchScore" in t && (
                      <span className="text-[10px] font-semibold tabular-nums text-[var(--accent)]">
                        match {t.matchScore}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-[var(--muted)]">
                    {t.project.title} · {t.project.category} · ~{t.estimatedTokens} tokens
                  </div>
                  {"matchReasons" in t && Array.isArray(t.matchReasons) && (
                    <div className="mt-1 text-[10px] text-[var(--muted)] opacity-80">
                      {(t.matchReasons as string[]).slice(0, 3).join(" · ")}
                    </div>
                  )}
                </DashRow>
              ))}
            </ul>
          )}
        </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <div id="projects" className="scroll-mt-20">
        <Card>
          <h2 className="font-display font-semibold text-[var(--foreground)]">My projects</h2>
          <ul className="mt-3 space-y-3 text-sm">
            {user.projects.map((p) => {
              const raised = p.fundPots.reduce((s, f) => s + f.balanceCents, 0);
              const hasSupport = raised > 0 || p.donations.length > 0;
              const progress = projectTaskProgress(p.tasks);
              const sealReady =
                p.status === "COMPLETED" || progress.fullyComplete;
              return (
                <li
                  key={p.id}
                  className="rounded-xl border border-white/10 bg-black/30 px-3 py-2"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/projects/${p.slug}`}
                      className="font-medium text-amber-300 hover:underline"
                    >
                      {p.title}
                    </Link>
                    <Badge className="border-white/10 bg-white/5 text-stone-400">
                      {p.status}
                    </Badge>
                  </div>
                  <div className="mt-1 text-xs text-stone-500">
                    {progress.completed}/{progress.total} tasks done · {p._count.comments}{" "}
                    comments
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {p.status !== "ARCHIVED" && (
                      <Link
                        href={`/projects/${p.slug}#edit-project`}
                        className="inline-flex rounded-full border border-white/15 bg-white/5 px-2.5 py-1 text-[11px] font-semibold text-stone-200 hover:border-amber-400/40 hover:bg-amber-500/10 hover:text-amber-100"
                      >
                        Edit name &amp; description
                      </Link>
                    )}
                    {sealReady && (
                      <Link
                        href={`/projects/${p.slug}/seal`}
                        className="inline-flex rounded-full border border-amber-400/40 bg-amber-500/15 px-2.5 py-1 text-[11px] font-bold text-amber-100 hover:bg-amber-500/25"
                      >
                        Seal &amp; Ship
                      </Link>
                    )}
                  </div>
                  <div className="mt-2">
                    <ProjectCreatorActions
                      projectId={p.id}
                      title={p.title}
                      status={p.status}
                      hasSupport={hasSupport}
                      compact
                    />
                  </div>
                </li>
              );
            })}
            {user.projects.length === 0 && (
              <li className="pt-1">
                <EmptyState
                  signedIn
                  title="No projects yet"
                  body="Propose an open-license mission and invite builders."
                  primaryHref="/projects/new"
                  primaryLabel="Propose a project"
                />
              </li>
            )}
          </ul>
        </Card>
        </div>

        <Card>
          <h2 className="font-display font-semibold text-[var(--foreground)]">Claims</h2>
          <ul className="mt-3 space-y-3 text-sm">
            {user.claims.map((c) => {
              const expiresMs = c.expiresAt
                ? new Date(c.expiresAt).getTime() - Date.now()
                : null;
              const hoursLeft =
                expiresMs != null ? Math.max(0, Math.ceil(expiresMs / (60 * 60 * 1000))) : null;
              const expired = c.active && expiresMs != null && expiresMs <= 0;
              return (
                <li
                  key={c.id}
                  className="rounded-xl border border-white/10 bg-black/30 px-3 py-2"
                >
                  <Link
                    href={`/projects/${c.task.project.slug}#task-${c.taskId}`}
                    className="text-amber-300 hover:underline"
                  >
                    {c.task.title}
                  </Link>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-stone-500">
                    {c.active ? (
                      <Badge
                        className={
                          expired
                            ? "border-red-500/40 bg-red-500/10 text-red-300"
                            : "border-amber-500/30 bg-amber-500/10 text-amber-200"
                        }
                      >
                        {expired ? "expired window" : "active"}
                      </Badge>
                    ) : (
                      <span>closed</span>
                    )}
                    <span>· {c.task.project.title}</span>
                    {c.active && hoursLeft != null && !expired && (
                      <span className="text-stone-600">· ~{hoursLeft}h left</span>
                    )}
                  </div>
                  {c.active && (
                    <div className="mt-2">
                      <CancelClaimButton taskId={c.taskId} />
                    </div>
                  )}
                </li>
              );
            })}
            {user.claims.length === 0 && (
              <li className="text-sm text-[var(--muted)]">
                No claims yet.{" "}
                <Link href="/tasks" className="text-[var(--accent)] hover:underline">
                  Browse open tasks
                </Link>
              </li>
            )}
          </ul>
        </Card>

        <Card>
          <h2 className="font-display font-semibold text-[var(--foreground)]">Donations</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {user.donations.map((d) => (
              <li key={d.id}>
                <span className="text-stone-200">{formatCents(d.amountCents)}</span> →{" "}
                <Link href={`/projects/${d.project.slug}`} className="text-amber-300 hover:underline">
                  {d.project.title}
                </Link>
                <div className="text-xs text-stone-500">{d.pot.label}</div>
              </li>
            ))}
            {user.donations.length === 0 && (
              <li className="text-sm text-[var(--muted)]">No donations yet. Labor is the default currency.</li>
            )}
          </ul>
        </Card>
      </div>

      <Card>
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="font-display font-semibold text-[var(--foreground)]">My submissions</h2>
            <p className="mt-1 text-xs text-stone-500">
              {myAccepted.length} accepted · {myPending.length} pending peer/creator review
            </p>
          </div>
          {myPending.length > 0 && (
            <Badge className="border-amber-500/30 bg-amber-500/10 text-amber-200">
              {myPending.length} awaiting review
            </Badge>
          )}
        </div>
        <ul className="mt-3 space-y-2 text-sm">
          {user.contributions.map((c) => (
            <li
              key={c.id}
              className={
                c.status === "PENDING"
                  ? "flex flex-wrap items-center gap-2 rounded-xl border border-amber-900/35 bg-amber-500/5 px-3 py-2"
                  : "flex flex-wrap items-center gap-2 rounded-xl border border-white/5 bg-black/20 px-3 py-2"
              }
            >
              <Badge
                className={
                  c.status === "ACCEPTED"
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                    : c.status === "PENDING"
                      ? "border-amber-500/30 bg-amber-500/10 text-amber-200"
                      : "border-white/10 bg-white/5 text-stone-300"
                }
              >
                {c.status}
              </Badge>
              <Link href={`/c/${c.id}`} className="text-amber-300 hover:underline">
                {c.task.title}
              </Link>
              {c.task.project?.slug && (
                <Link
                  href={`/projects/${c.task.project.slug}`}
                  className="text-[11px] text-stone-500 hover:text-amber-400"
                >
                  project
                </Link>
              )}
              <Link
                href={`/c/${c.id}`}
                className="text-[11px] text-stone-500 hover:text-amber-400"
              >
                receipt
              </Link>
              {c.score != null && <span className="text-xs text-stone-500">score {c.score}</span>}
              {c.status === "PENDING" && (
                <span className="text-[11px] text-stone-600">
                  Does not rank until accepted
                </span>
              )}
            </li>
          ))}
          {user.contributions.length === 0 && (
            <li className="text-sm text-[var(--muted)]">
              Submit work from a project task.{" "}
              <Link href="/tasks" className="text-[var(--accent)] hover:underline">
                Open tasks
              </Link>
            </li>
          )}
        </ul>
      </Card>
      </DashSection>

      <DashSection
        id="tools"
        kicker="Agents"
        title="Tools"
        hint="Local workers, webhooks, and Agent API tokens. Never paste xAI keys here."
      >
        {user.handle && (
          <BuilderWidgetCard handle={user.handle} siteUrl="https://grokforge.app" />
        )}
        <LocalWorkerCard />
        <WorkerWebhookCard initialUrl={user.workerWebhookUrl} />
        <AgentTokensCard
          isFounder={founder}
          initialTokens={await (async () => {
            try {
              const rows = await prisma.apiToken.findMany({
                where: { userId: user.id },
                orderBy: { createdAt: "desc" },
                take: 20,
              });
              return rows.map((t) => ({
                id: t.id,
                name: t.name,
                scopes: t.scopes,
                tokenPrefix: t.tokenPrefix,
                expiresAt: t.expiresAt?.toISOString() ?? null,
                lastUsedAt: t.lastUsedAt?.toISOString() ?? null,
                createdAt: t.createdAt.toISOString(),
                revokedAt: t.revokedAt?.toISOString() ?? null,
              }));
            } catch {
              return [];
            }
          })()}
        />
      </DashSection>

      <DashSection id="profile" kicker="Account" title="Profile & capacity">
        <Card>
          <form
            action={async (fd) => {
              "use server";
              await updateProfileAction(fd);
            }}
            className="space-y-3"
          >
            <div>
              <Label htmlFor="handle">Handle</Label>
              <Input id="handle" name="handle" defaultValue={user.handle || ""} />
            </div>
            <div>
              <Label htmlFor="capacityNotes">Capacity notes</Label>
              <Textarea
                id="capacityNotes"
                name="capacityNotes"
                defaultValue={user.capacityNotes || ""}
                placeholder="Tokens/day, topics, timezone..."
              />
            </div>
            <div>
              <Label htmlFor="bio">Bio</Label>
              <Textarea id="bio" name="bio" defaultValue={user.bio || ""} />
            </div>
            <div>
              <Label htmlFor="githubHandle">GitHub username</Label>
              <Input
                id="githubHandle"
                name="githubHandle"
                defaultValue={user.githubHandle || ""}
                placeholder="Pitchfork-and-Torch"
              />
              <p className="mt-1 text-[10px] text-[var(--muted)]">
                Optional. Used when linking GitHub artifacts. OAuth fills this if configured.
              </p>
            </div>
            <Button type="submit" variant="secondary">
              Save profile
            </Button>
          </form>
        </Card>
      </DashSection>
    </div>
  );
}
