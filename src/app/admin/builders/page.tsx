import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Badge, Card } from "@/components/ui";
import { FounderBadge } from "@/components/founder-badge";
import { isDemoBotUser, isFounderHandle } from "@/lib/identity";

export const dynamic = "force-dynamic";

const ACTIVE_DAYS = 30;
const RECENT_SESSION_MS = 7 * 24 * 60 * 60 * 1000;

function fmt(d: Date | null | undefined): string {
  if (!d) return "-";
  return d.toISOString().slice(0, 16).replace("T", " ") + " UTC";
}

/**
 * Founder-only: active users + X OAuth builders roster.
 * Never surfaces OAuth tokens - handles and activity only.
 */
export default async function AdminBuildersPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?next=/admin/builders");

  const me = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { handle: true },
  });
  if (!isFounderHandle(me?.handle)) {
    redirect("/dashboard");
  }

  const since = new Date(Date.now() - ACTIVE_DAYS * 24 * 60 * 60 * 1000);
  const sessionSince = new Date(Date.now() - RECENT_SESSION_MS);
  const now = new Date();

  const [
    xAccounts,
    allUsersLite,
    recentContribUserIds,
    recentClaimUserIds,
    recentReviewUserIds,
    recentTokenUsers,
    recentWorkers,
    liveSessions,
    totals,
  ] = await Promise.all([
    prisma.account.findMany({
      where: { provider: "twitter" },
      select: {
        providerAccountId: true,
        userId: true,
        user: {
          select: {
            id: true,
            handle: true,
            name: true,
            email: true,
            image: true,
            reputation: true,
            createdAt: true,
            updatedAt: true,
            _count: {
              select: {
                contributions: true,
                claims: true,
                projects: true,
                reviews: true,
              },
            },
          },
        },
      },
      orderBy: { user: { createdAt: "desc" } },
    }),
    prisma.user.findMany({
      select: {
        id: true,
        handle: true,
        name: true,
        email: true,
        image: true,
        reputation: true,
        createdAt: true,
        updatedAt: true,
        passwordHash: true,
        accounts: { select: { provider: true } },
        _count: {
          select: {
            contributions: true,
            claims: true,
            projects: true,
            reviews: true,
            sessions: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 500,
    }),
    prisma.contribution.findMany({
      where: { createdAt: { gte: since } },
      select: { userId: true },
      distinct: ["userId"],
    }),
    prisma.taskClaim.findMany({
      where: { claimedAt: { gte: since } },
      select: { userId: true },
      distinct: ["userId"],
    }),
    prisma.contributionReview.findMany({
      where: { createdAt: { gte: since } },
      select: { reviewerId: true },
      distinct: ["reviewerId"],
    }),
    prisma.apiToken.findMany({
      where: {
        revokedAt: null,
        OR: [
          { lastUsedAt: { gte: since } },
          { createdAt: { gte: since } },
        ],
      },
      select: { userId: true, lastUsedAt: true },
    }),
    prisma.agentWorkerHeartbeat.findMany({
      where: { lastSeenAt: { gte: since } },
      select: { userId: true, lastSeenAt: true, workerName: true, status: true },
      orderBy: { lastSeenAt: "desc" },
    }),
    prisma.session
      .findMany({
        where: { expires: { gt: now } },
        select: { userId: true, expires: true },
      })
      .catch(() => [] as { userId: string; expires: Date }[]),
    prisma.$transaction([
      prisma.user.count(),
      prisma.account.count({ where: { provider: "twitter" } }),
      prisma.account.count({ where: { provider: "github" } }),
      prisma.user.count({
        where: { passwordHash: { not: null } },
      }),
    ]),
  ]);

  const activeIdSet = new Set<string>();
  for (const r of recentContribUserIds) activeIdSet.add(r.userId);
  for (const r of recentClaimUserIds) activeIdSet.add(r.userId);
  for (const r of recentReviewUserIds) activeIdSet.add(r.reviewerId);
  for (const r of recentTokenUsers) activeIdSet.add(r.userId);
  for (const r of recentWorkers) activeIdSet.add(r.userId);
  for (const r of liveSessions) activeIdSet.add(r.userId);

  // Also mark recently updated users (profile touch / JWT login may bump updatedAt)
  for (const u of allUsersLite) {
    if (u.updatedAt >= sessionSince || u.createdAt >= sessionSince) {
      activeIdSet.add(u.id);
    }
  }

  const xUserIds = new Set(xAccounts.map((a) => a.userId));
  const xBuilders = xAccounts
    .map((a) => ({
      ...a.user,
      providerAccountId: a.providerAccountId,
      isDemo: isDemoBotUser(a.user),
    }))
    .filter((u) => !u.isDemo);

  const xDemo = xAccounts
    .map((a) => a.user)
    .filter((u) => isDemoBotUser(u));

  const activeUsers = allUsersLite
    .filter((u) => activeIdSet.has(u.id) && !isDemoBotUser(u))
    .map((u) => {
      const providers = u.accounts.map((a) => a.provider);
      const hasX = providers.includes("twitter");
      const hasGh = providers.includes("github");
      const hasEmail = Boolean(u.passwordHash);
      return {
        ...u,
        hasX,
        hasGh,
        hasEmail,
        providers,
      };
    })
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

  const [userCount, xCount, ghCount, emailCount] = totals;

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-3xl font-bold text-white">Builders</h1>
            <FounderBadge />
            <Badge className="border-amber-500/40 bg-amber-500/10 text-amber-100">
              founder only
            </Badge>
          </div>
          <p className="mt-1 text-sm text-stone-400">
            Active users (last {ACTIVE_DAYS}d activity) and X-signed-in builders.
            OAuth tokens are never shown.
          </p>
        </div>
        <Link
          href="/dashboard"
          className="text-sm text-amber-400 hover:underline"
        >
          ← Dashboard
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
        {[
          ["All users", userCount],
          ["X sign-ins", xCount],
          ["GitHub linked", ghCount],
          ["Email/password", emailCount],
        ].map(([k, v]) => (
          <Card key={String(k)}>
            <p className="text-[11px] uppercase tracking-wide text-stone-500">{k}</p>
            <p className="text-2xl font-bold text-white">{String(v)}</p>
          </Card>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="border-emerald-500/25 bg-emerald-500/5">
          <p className="text-[11px] uppercase tracking-wide text-emerald-400/90">
            Active ({ACTIVE_DAYS}d)
          </p>
          <p className="text-2xl font-bold text-white">{activeUsers.length}</p>
        </Card>
        <Card className="border-sky-500/25 bg-sky-500/5">
          <p className="text-[11px] uppercase tracking-wide text-sky-300">
            X builders (non-demo)
          </p>
          <p className="text-2xl font-bold text-white">{xBuilders.length}</p>
        </Card>
        <Card>
          <p className="text-[11px] uppercase tracking-wide text-stone-500">
            Live DB sessions
          </p>
          <p className="text-2xl font-bold text-white">{liveSessions.length}</p>
          <p className="mt-1 text-[10px] text-stone-600">
            JWT auth - sessions table may be sparse
          </p>
        </Card>
      </div>

      <section className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-xl font-semibold text-white">
              X signed-in builders
            </h2>
            <p className="text-xs text-stone-500">
              Users with a Twitter/X OAuth account linked (provider = twitter).
            </p>
          </div>
          <Badge className="border-sky-500/40 bg-sky-500/10 text-sky-100">
            {xBuilders.length} real · {xDemo.length} demo
          </Badge>
        </div>
        {xBuilders.length === 0 ? (
          <Card>
            <p className="text-sm text-stone-500">No X OAuth builders yet.</p>
          </Card>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-white/10">
            <table className="w-full min-w-[40rem] text-left text-sm">
              <thead className="border-b border-white/10 bg-black/40 text-[11px] uppercase tracking-wide text-stone-500">
                <tr>
                  <th className="px-3 py-2 font-medium">Builder</th>
                  <th className="px-3 py-2 font-medium">Rep</th>
                  <th className="px-3 py-2 font-medium">Labor</th>
                  <th className="px-3 py-2 font-medium">Joined</th>
                  <th className="px-3 py-2 font-medium">Active</th>
                </tr>
              </thead>
              <tbody>
                {xBuilders.map((u) => {
                  const active = activeIdSet.has(u.id);
                  return (
                    <tr
                      key={u.id}
                      className="border-b border-white/5 hover:bg-white/[0.03]"
                    >
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          {u.image ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={u.image}
                              alt=""
                              className="h-8 w-8 rounded-full border border-white/10 object-cover"
                            />
                          ) : (
                            <span className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-[10px] text-stone-500">
                              X
                            </span>
                          )}
                          <div className="min-w-0">
                            {u.handle ? (
                              <Link
                                href={`/u/${u.handle}`}
                                className="font-medium text-amber-300 hover:underline"
                              >
                                @{u.handle}
                              </Link>
                            ) : (
                              <span className="text-stone-400">
                                {u.name || u.id.slice(0, 8)}
                              </span>
                            )}
                            {u.name && (
                              <p className="truncate text-[11px] text-stone-600">
                                {u.name}
                              </p>
                            )}
                          </div>
                          {isFounderHandle(u.handle) && (
                            <FounderBadge className="scale-90" />
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-stone-300">
                        {u.reputation}
                      </td>
                      <td className="px-3 py-2.5 text-xs text-stone-500">
                        {u._count.contributions} sub · {u._count.claims} claim ·{" "}
                        {u._count.projects} proj · {u._count.reviews} rev
                      </td>
                      <td className="px-3 py-2.5 text-[11px] text-stone-500 whitespace-nowrap">
                        {fmt(u.createdAt)}
                      </td>
                      <td className="px-3 py-2.5">
                        <Badge
                          className={
                            active
                              ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
                              : "border-white/10 bg-white/5 text-stone-500"
                          }
                        >
                          {active ? "active" : "quiet"}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-xl font-semibold text-white">
            Active users ({ACTIVE_DAYS}d)
          </h2>
          <p className="text-xs text-stone-500">
            Contrib / claim / review / agent token / worker heartbeat / recent
            profile activity. Demo bots excluded.
          </p>
        </div>
        {activeUsers.length === 0 ? (
          <Card>
            <p className="text-sm text-stone-500">No active users in window.</p>
          </Card>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-white/10">
            <table className="w-full min-w-[40rem] text-left text-sm">
              <thead className="border-b border-white/10 bg-black/40 text-[11px] uppercase tracking-wide text-stone-500">
                <tr>
                  <th className="px-3 py-2 font-medium">User</th>
                  <th className="px-3 py-2 font-medium">Auth</th>
                  <th className="px-3 py-2 font-medium">Rep</th>
                  <th className="px-3 py-2 font-medium">Activity</th>
                  <th className="px-3 py-2 font-medium">Updated</th>
                </tr>
              </thead>
              <tbody>
                {activeUsers.map((u) => (
                  <tr
                    key={u.id}
                    className="border-b border-white/5 hover:bg-white/[0.03]"
                  >
                    <td className="px-3 py-2.5">
                      {u.handle ? (
                        <Link
                          href={`/u/${u.handle}`}
                          className="font-medium text-amber-300 hover:underline"
                        >
                          @{u.handle}
                        </Link>
                      ) : (
                        <span className="text-stone-400">
                          {u.name || u.email || u.id.slice(0, 10)}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex flex-wrap gap-1">
                        {u.hasX && (
                          <Badge className="border-sky-500/40 bg-sky-500/10 text-sky-100">
                            X
                          </Badge>
                        )}
                        {u.hasGh && (
                          <Badge className="border-white/15 bg-white/5 text-stone-300">
                            GitHub
                          </Badge>
                        )}
                        {u.hasEmail && (
                          <Badge className="border-white/10 bg-white/5 text-stone-500">
                            email
                          </Badge>
                        )}
                        {!u.hasX && !u.hasGh && !u.hasEmail && (
                          <span className="text-[11px] text-stone-600">-</span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-stone-300">{u.reputation}</td>
                    <td className="px-3 py-2.5 text-xs text-stone-500">
                      {u._count.contributions}s · {u._count.claims}c ·{" "}
                      {u._count.projects}p
                    </td>
                    <td className="px-3 py-2.5 text-[11px] text-stone-500 whitespace-nowrap">
                      {fmt(u.updatedAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {recentWorkers.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-white">
            Agent workers (same window)
          </h2>
          <ul className="space-y-2">
            {recentWorkers.slice(0, 20).map((w, i) => (
              <li
                key={`${w.userId}-${w.workerName}-${i}`}
                className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-stone-300"
              >
                <span className="font-medium text-white">{w.workerName}</span>
                <span className="text-stone-500"> · {w.status}</span>
                <span className="text-stone-600">
                  {" "}
                  · seen {fmt(w.lastSeenAt)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="text-[11px] text-stone-600">
        Founder-only. Do not share this URL publicly. Demo/seed accounts are
        filtered from active and X lists (demo count shown above).
      </p>
    </div>
  );
}
