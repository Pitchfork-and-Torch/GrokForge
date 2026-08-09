import Link from "next/link";
import { ProjectCategory, ProjectStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { Badge, Card, ProgressBar } from "@/components/ui";
import { EmptyState } from "@/components/empty-state";
import { CATEGORY_LABELS, isProjectCompleteDisplay, projectTaskProgress } from "@/lib/utils";
import { ProjectThumbButton } from "@/components/project-thumb-button";
import { ProjectCompletedBadge } from "@/components/project-completed-badge";
import { ShipSourceLinks } from "@/components/ship-source-links";
import { ProjectBannerThumb } from "@/components/project-banner";
import { ShareProjectButton } from "@/components/share-project-button";

export const dynamic = "force-dynamic";

type SortKey = "newest" | "rank" | "thumbs" | "funding" | "tasks" | "comments";

const SORT_LABELS: Record<SortKey, string> = {
  newest: "Newest",
  rank: "Highest ranked",
  thumbs: "Most thumbs-up",
  funding: "Most funded",
  tasks: "Most open tasks",
  comments: "Most discussion",
};

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{
    category?: string;
    q?: string;
    sort?: string;
    status?: string;
  }>;
}) {
  const session = await auth();
  const signedIn = !!session?.user?.id;
  const sp = await searchParams;
  const category =
    sp.category && Object.values(ProjectCategory).includes(sp.category as ProjectCategory)
      ? (sp.category as ProjectCategory)
      : undefined;
  const q = sp.q?.trim();
  const sort: SortKey =
    sp.sort === "funding" ||
    sp.sort === "tasks" ||
    sp.sort === "comments" ||
    sp.sort === "rank" ||
    sp.sort === "thumbs"
      ? sp.sort
      : "newest";
  const statusFilter =
    sp.status &&
    ["ACTIVE", "FUNDED", "COMPLETED"].includes(sp.status.toUpperCase())
      ? (sp.status.toUpperCase() as ProjectStatus)
      : undefined;

  const projects = await prisma.project.findMany({
    where: {
      status: statusFilter
        ? statusFilter
        : { in: ["ACTIVE", "FUNDED", "COMPLETED"] },
      ...(category ? { category } : {}),
      ...(q
        ? {
            OR: [
              { title: { contains: q, mode: "insensitive" } },
              { description: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    include: {
      proposer: { select: { handle: true, reputation: true } },
      fundPots: true,
      scorecard: { select: { totalScore: true } },
      tasks: { select: { id: true, status: true, parentId: true } },
      artifacts: {
        where: { source: "package" },
        select: { id: true },
        take: 1,
      },
      _count: { select: { comments: true, watches: true, thumbs: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const myThumbs = new Set<string>();
  if (session?.user?.id) {
    try {
      const rows = await prisma.projectThumb.findMany({
        where: {
          userId: session.user.id,
          projectId: { in: projects.map((p) => p.id) },
        },
        select: { projectId: true },
      });
      for (const r of rows) myThumbs.add(r.projectId);
    } catch {
      /* table may lag */
    }
  }

  const ranked = [...projects].sort((a, b) => {
    if (sort === "rank") {
      const ta = a.scorecard?.totalScore;
      const tb = b.scorecard?.totalScore;
      if (ta == null && tb == null) return 0;
      if (ta == null) return 1;
      if (tb == null) return -1;
      return tb - ta;
    }
    if (sort === "thumbs") {
      return (b._count.thumbs || 0) - (a._count.thumbs || 0);
    }
    if (sort === "funding") {
      const ra = a.fundPots.reduce((s, f) => s + f.balanceCents, 0);
      const rb = b.fundPots.reduce((s, f) => s + f.balanceCents, 0);
      return rb - ra;
    }
    if (sort === "tasks") {
      const oa = projectTaskProgress(a.tasks).open;
      const ob = projectTaskProgress(b.tasks).open;
      return ob - oa;
    }
    if (sort === "comments") return b._count.comments - a._count.comments;
    return 0; // already newest
  });

  const qs = (extra: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const merged = {
      q: q || undefined,
      category: category || undefined,
      sort: sort !== "newest" ? sort : undefined,
      status: statusFilter || undefined,
      ...extra,
    };
    for (const [k, v] of Object.entries(merged)) {
      if (v) p.set(k, v);
    }
    const s = p.toString();
    return s ? `?${s}` : "";
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-white">Discover projects</h1>
          <p className="mt-1 text-stone-400">
            Filter by category, sort by{" "}
            <Link href="/projects?sort=rank" className="text-amber-400 hover:underline">
              ranking
            </Link>
            , funding, or open tasks.{" "}
            <Link href="/rankings" className="text-amber-400 hover:underline">
              Full ranking board
            </Link>
            {" · "}
            <Link href="/tasks" className="text-amber-400 hover:underline">
              Browse claimable tasks
            </Link>
            {signedIn && (
              <>
                {" · "}
                Open a project and hit <strong className="font-medium text-stone-300">Watch</strong>{" "}
                for ship &amp; capital notifications.
              </>
            )}
          </p>
        </div>
      </div>

      <form className="flex flex-wrap gap-2">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search..."
          className="min-w-[200px] flex-1 rounded-full border border-white/10 bg-black/40 px-4 py-2 text-sm text-stone-100"
        />
        <select
          name="category"
          defaultValue={category || ""}
          className="rounded-full border border-white/10 bg-black/40 px-4 py-2 text-sm text-stone-100"
        >
          <option value="">All categories</option>
          {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <select
          name="sort"
          defaultValue={sort}
          className="rounded-full border border-white/10 bg-black/40 px-4 py-2 text-sm text-stone-100"
        >
          {Object.entries(SORT_LABELS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <select
          name="status"
          defaultValue={statusFilter || ""}
          className="rounded-full border border-white/10 bg-black/40 px-4 py-2 text-sm text-stone-100"
        >
          <option value="">Active + funded + done</option>
          <option value="ACTIVE">Active only</option>
          <option value="FUNDED">Funded</option>
          <option value="COMPLETED">Completed</option>
        </select>
        <button
          type="submit"
          className="rounded-full bg-amber-500 px-4 py-2 text-sm font-semibold text-black hover:bg-amber-400"
        >
          Filter
        </button>
      </form>

      <div className="flex flex-wrap gap-2">
        <Link
          href={`/projects${qs({ category: undefined })}`}
          className={`rounded-full border px-3 py-1 text-xs font-medium ${
            !category
              ? "border-amber-500/50 bg-amber-500/15 text-amber-200"
              : "border-white/10 text-stone-400 hover:border-amber-500/30"
          }`}
        >
          All
        </Link>
        {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
          <Link
            key={k}
            href={`/projects${qs({ category: k })}`}
            className={`rounded-full border px-3 py-1 text-xs font-medium ${
              category === k
                ? "border-amber-500/50 bg-amber-500/15 text-amber-200"
                : "border-white/10 text-stone-400 hover:border-amber-500/30"
            }`}
          >
            {v}
          </Link>
        ))}
      </div>

      <p className="text-xs text-stone-500">
        {ranked.length} project{ranked.length === 1 ? "" : "s"} · sorted by{" "}
        {SORT_LABELS[sort].toLowerCase()}
      </p>

      <div className="grid gap-4 md:grid-cols-2">
        {ranked.map((p) => {
          const progress = projectTaskProgress(p.tasks);
          const rankScore = p.scorecard?.totalScore;
          const done = isProjectCompleteDisplay(p.status, p.tasks);
          const sealed = p.artifacts.length > 0;
          return (
            <Card
              key={p.id}
              className={`h-full transition hover:border-amber-500/40 ${
                done || sealed ? "border-emerald-500/35" : ""
              }`}
            >
              <ProjectBannerThumb url={p.bannerUrl} title={p.title} />
              <div className="flex flex-wrap items-center gap-2">
                <Badge>{CATEGORY_LABELS[p.category]}</Badge>
                {done ? (
                  <ProjectCompletedBadge size="sm" />
                ) : (
                  <Badge className="border-emerald-500/30 bg-emerald-500/10 text-emerald-300">
                    {progress.open} open
                  </Badge>
                )}
                <ShipSourceLinks slug={p.slug} sealed={sealed} compact />
                {!done && progress.claimed > 0 && (
                  <Badge className="border-amber-500/30 bg-amber-500/10 text-amber-200">
                    {progress.claimed} claimed
                  </Badge>
                )}
                {!done && progress.submitted > 0 && (
                  <Badge className="border-sky-500/30 bg-sky-500/10 text-sky-200">
                    {progress.submitted} submitted
                  </Badge>
                )}
                {rankScore != null && (
                  <Badge className="border-amber-500/40 bg-amber-500/10 text-amber-200">
                    Rank {rankScore.toFixed(2)}/5
                  </Badge>
                )}
                {p.status !== "ACTIVE" && !done && (
                  <Badge className="border-white/10 bg-white/5 text-stone-400">
                    {p.status}
                  </Badge>
                )}
                <span className="ml-auto flex flex-wrap items-center gap-1.5">
                  <ShareProjectButton
                    title={p.title}
                    slug={p.slug}
                    category={p.category}
                    proposerHandle={p.proposer.handle}
                    variant="compact"
                  />
                  <ProjectThumbButton
                    projectId={p.id}
                    initialCount={p._count.thumbs}
                    initiallyThumbed={myThumbs.has(p.id)}
                    signedIn={signedIn}
                    compact
                  />
                </span>
              </div>
              <Link
                href={sealed ? `/projects/${p.slug}/ship` : `/projects/${p.slug}`}
                className="mt-3 block text-xl font-semibold text-white hover:text-amber-200"
              >
                {p.title}
              </Link>
              <p className="mt-2 line-clamp-3 text-sm text-stone-400">{p.description}</p>
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
              <p className="mt-3 text-xs text-stone-500">
                by @{p.proposer.handle} · {p.proposer.reputation} rep · {p.license} ·{" "}
                <Link href={`/projects/${p.slug}`} className="text-amber-400/90 hover:underline">
                  project
                </Link>
                {" · "}
                {p._count.comments} comments
                {p._count.watches > 0 ? ` · ${p._count.watches} watching` : ""}
              </p>
            </Card>
          );
        })}
      </div>
      {ranked.length === 0 && (
        <EmptyState
          signedIn={signedIn}
          title={q || category || statusFilter ? "No matches for that filter" : "No live projects yet"}
          body={
            q || category || statusFilter
              ? "Try clearing filters or browse open tasks while you wait."
              : "Propose an open-license greater-good project and invite builders."
          }
          primaryHref={signedIn ? "/projects/new" : "/login"}
          primaryLabel={signedIn ? "Propose a project" : "Sign in with X"}
          secondaryHref={signedIn ? "/tasks" : "/tasks"}
          secondaryLabel="Browse open tasks"
        />
      )}
    </div>
  );
}
