import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Badge, Button, Card } from "@/components/ui";
import { FounderBadge } from "@/components/founder-badge";
import { ProjectCreatorActions } from "@/components/project-creator-actions";
import {
  CancelClaimButton,
  CreatorAcceptButton,
  CreatorBulkAcceptButton,
} from "@/components/task-actions";
import { formatCents, projectTaskProgress } from "@/lib/utils";
import { markNotificationsReadAction, updateProfileAction } from "@/lib/actions";
import { isFounderHandle } from "@/lib/identity";
import { computeStreak, streakBadgeLabel } from "@/lib/streaks";
import { NightcapGift } from "@/components/nightcap-gift";
import { BuilderWidgetCard } from "@/components/builder-widget-card";
import { BadgeRow } from "@/components/badge-row";
import { BadgeUnlockToast } from "@/components/badge-unlock-toast";
import { WeeklyChallenges } from "@/components/weekly-challenges";
import { AgentTokensCard } from "@/components/agent-tokens-card";
import { LocalWorkerCard } from "@/components/local-worker-card";
import { WorkerWebhookCard } from "@/components/worker-webhook-card";
import { fetchUserBadges } from "@/lib/badges-data";
import { fetchWeeklyChallenges } from "@/lib/challenges-data";

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
            <h1 className="text-3xl font-bold text-white">Dashboard</h1>
            {founder && <FounderBadge />}
            <BadgeRow badges={badges} max={5} size="md" />
          </div>
          <p className="text-stone-400">
            @{user.handle} · {user.reputation} reputation
            {streakLabel ? ` · ${streakLabel}` : streak.current > 0 ? ` · ${streak.current}d streak` : ""}
            {" · "}
            eligibility windows respect rate limits
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/cockpit">
            <Button>Creator cockpit</Button>
          </Link>
          <Link href="/tasks">
            <Button variant="secondary">Open tasks</Button>
          </Link>
          <Link href="/projects/new">
            <Button variant="secondary">New project</Button>
          </Link>
          <form
            action={async () => {
              "use server";
              const { signOut } = await import("@/lib/auth");
              await signOut({ redirectTo: "/" });
            }}
          >
            <Button type="submit" variant="secondary">
              Sign out
            </Button>
          </form>
        </div>
      </div>

      <BadgeUnlockToast userId={user.id} badges={badges} />
      <WeeklyChallenges challenges={challenges} />

      {user.handle && (
        <BuilderWidgetCard handle={user.handle} siteUrl="https://grokforge.app" />
      )}

      <NightcapGift
        signedIn
        projects={user.projects
          .filter((p) => p.status === "ACTIVE" || p.status === "FUNDED")
          .map((p) => ({ id: p.id, title: p.title, slug: p.slug }))}
      />

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

      {reportedComments.length > 0 && (
        <Card className="border-rose-900/40 bg-rose-500/5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-rose-300">
            Comment reports
          </p>
          <h2 className="text-lg font-semibold text-white">
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
        <Card className="border-amber-900/40 bg-amber-500/5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-400">
                Creator moderation
              </p>
              <h2 className="text-lg font-semibold text-white">
                Pending on your projects ({pendingOnMine.length})
              </h2>
              <p className="mt-1 text-xs text-stone-500">
                Accept so builders score on the labor leaderboard. Pending work does not rank until
                accepted.
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
                <CreatorAcceptButton contributionId={c.id} />
              </li>
            ))}
          </ul>
        </Card>
      )}

      {watched.length > 0 && (
        <Card>
          <h2 className="text-lg font-semibold text-white">Watching</h2>
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
            <h2 className="text-lg font-semibold text-white">
              Notifications
              {unread > 0 && (
                <span className="ml-2 rounded-full bg-amber-500 px-2 py-0.5 text-xs font-bold text-black">
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

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="text-lg font-semibold text-white">Profile & capacity</h2>
          <form
            action={async (fd) => {
              "use server";
              await updateProfileAction(fd);
            }}
            className="mt-3 space-y-3"
          >
            <div>
              <label className="mb-1 block text-xs uppercase text-stone-500">Handle</label>
              <input
                name="handle"
                defaultValue={user.handle || ""}
                className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs uppercase text-stone-500">Capacity notes</label>
              <textarea
                name="capacityNotes"
                defaultValue={user.capacityNotes || ""}
                className="min-h-[80px] w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm"
                placeholder="Tokens/day, topics, timezone..."
              />
            </div>
            <div>
              <label className="mb-1 block text-xs uppercase text-stone-500">Bio</label>
              <textarea
                name="bio"
                defaultValue={user.bio || ""}
                className="min-h-[60px] w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs uppercase text-stone-500">
                GitHub username
              </label>
              <input
                name="githubHandle"
                defaultValue={user.githubHandle || ""}
                placeholder="Pitchfork-and-Torch"
                className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm"
              />
              <p className="mt-1 text-[10px] text-stone-600">
                Optional. Used when linking GitHub artifacts. OAuth fills this if configured.
              </p>
            </div>
            <Button type="submit" variant="secondary">
              Save profile
            </Button>
          </form>
        </Card>

        <Card>
          <h2 className="text-lg font-semibold text-white">Recommended tasks</h2>
          <p className="mt-1 text-xs text-stone-500">
            Ranked for you by category affinity, watched projects, past keywords, funding, and
            recency. Typical claim window: 48h.
          </p>
          <ul className="mt-3 space-y-2">
            {openTasks.map((t) => (
              <li key={t.id} className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Link
                    href={`/projects/${t.project.slug}#task-${t.id}`}
                    className="font-medium text-amber-300 hover:underline"
                  >
                    {t.title}
                  </Link>
                  {"matchScore" in t && (
                    <span className="text-[10px] font-semibold tabular-nums text-amber-500/90">
                      match {t.matchScore}
                    </span>
                  )}
                </div>
                <div className="text-xs text-stone-500">
                  {t.project.title} · {t.project.category} · ~{t.estimatedTokens} tokens
                </div>
                {"matchReasons" in t && Array.isArray(t.matchReasons) && (
                  <div className="mt-1 text-[10px] text-stone-600">
                    {(t.matchReasons as string[]).slice(0, 3).join(" · ")}
                  </div>
                )}
              </li>
            ))}
            {openTasks.length === 0 && (
              <li className="text-sm text-stone-500">No open tasks right now.</li>
            )}
          </ul>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <h2 className="font-semibold text-white">My projects</h2>
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
              <li className="text-stone-500">None yet.</li>
            )}
          </ul>
        </Card>

        <Card>
          <h2 className="font-semibold text-white">Claims</h2>
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
            {user.claims.length === 0 && <li className="text-stone-500">No claims yet.</li>}
          </ul>
        </Card>

        <Card>
          <h2 className="font-semibold text-white">Donations</h2>
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
              <li className="text-stone-500">No donations yet.</li>
            )}
          </ul>
        </Card>
      </div>

      <Card>
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="font-semibold text-white">My submissions</h2>
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
            <li className="text-stone-500">Submit work from a project task.</li>
          )}
        </ul>
      </Card>
    </div>
  );
}
