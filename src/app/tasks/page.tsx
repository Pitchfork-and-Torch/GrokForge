import Link from "next/link";
import { ProjectCategory } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { Badge, Card } from "@/components/ui";
import { EmptyState } from "@/components/empty-state";
import { CATEGORY_LABELS, formatTokens } from "@/lib/utils";
import { expireStaleClaims } from "@/lib/expire-claims";
import { ReviewQueueList } from "@/components/review-queue-list";
import { ClaimShareButton } from "@/components/claim-share-button";
import { isAgentSubmission } from "@/lib/deliverable-quality";

export const dynamic = "force-dynamic";

export default async function OpenTasksPage({
  searchParams,
}: {
  searchParams: Promise<{
    category?: string;
    q?: string;
    goodFirst?: string;
    tag?: string;
    ready?: string;
    review?: string;
  }>;
}) {
  // Keep claimable board honest even between cron ticks
  try {
    await expireStaleClaims({ limit: 20, notify: true });
  } catch {
    // non-fatal
  }

  const session = await auth();
  const signedIn = !!session?.user?.id;
  const sp = await searchParams;
  const reviewMode = sp.review === "1" || sp.review === "true";
  const category =
    sp.category && Object.values(ProjectCategory).includes(sp.category as ProjectCategory)
      ? (sp.category as ProjectCategory)
      : undefined;
  const q = sp.q?.trim();
  const goodFirstOnly = sp.goodFirst === "1" || sp.goodFirst === "true";
  const readyOnly = sp.ready === "1" || sp.ready === "true";
  const tag = sp.tag?.trim();

  if (reviewMode) {
    const { isFounderHandle } = await import("@/lib/identity");
    const me = session?.user?.id
      ? await prisma.user.findUnique({
          where: { id: session.user.id },
          select: { id: true, handle: true },
        })
      : null;
    const founder = isFounderHandle(me?.handle);

    // Count matches public trust strip: all PENDING on live projects.
    // Own submits are listed but cannot self-peer-review (creator moderate OK).
    const pending = await prisma.contribution.findMany({
      where: {
        status: "PENDING",
        task: {
          project: {
            status: { in: ["ACTIVE", "FUNDED", "COMPLETED"] },
            ...(category ? { category } : {}),
          },
          ...(q
            ? {
                OR: [
                  { title: { contains: q, mode: "insensitive" } },
                  { project: { title: { contains: q, mode: "insensitive" } } },
                ],
              }
            : {}),
        },
      },
      orderBy: { createdAt: "asc" },
      take: 40,
      include: {
        user: { select: { handle: true, id: true } },
        reviews: { select: { id: true } },
        task: {
          select: {
            title: true,
            project: {
              select: { slug: true, title: true, proposerId: true },
            },
          },
        },
      },
    });

    const staleBefore = Date.now() - 24 * 60 * 60 * 1000;
    const items = pending.map((c) => {
      const isOwn = !!(me && c.userId === me.id);
      const canCreatorModerate = !!(
        me &&
        (founder || c.task.project.proposerId === me.id)
      );
      return {
        id: c.id,
        taskTitle: c.task.title,
        projectSlug: c.task.project.slug,
        projectTitle: c.task.project.title,
        authorHandle: c.user.handle,
        createdAt:
          c.createdAt.toISOString().slice(0, 16).replace("T", " ") + " UTC",
        createdAtIso: c.createdAt.toISOString(),
        agent: isAgentSubmission({
          sources: c.sources,
          contentType: c.contentType,
        }),
        bodyPreview: c.body.slice(0, 480) + (c.body.length > 480 ? "…" : ""),
        peerReviewCount: c.reviews.length,
        canCreatorModerate,
        isOwn,
        canPeerReview: !isOwn,
      };
    });
    const staleCount = items.filter(
      (i) => new Date(i.createdAtIso).getTime() < staleBefore
    ).length;
    const ownCount = items.filter((i) => i.isOwn).length;
    const peerCount = items.filter((i) => i.canPeerReview).length;

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-white">Review queue</h1>
          <p className="mt-1 text-stone-400">
            Peer-review others&apos; submissions (+2 rep). Average ≥3 accepts;
            below 3 reopens the leaf. You cannot peer-review your own work -
            project creators (or founder) can still accept or request changes.
            Accepts unlock ready-set for workers.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <Link
            href="/tasks?review=1"
            className="rounded-full border border-amber-500/50 bg-amber-500/15 px-3 py-1 font-medium text-amber-200"
          >
            Review queue
          </Link>
          <Link
            href="/tasks?ready=1"
            className="rounded-full border border-white/10 px-3 py-1 text-stone-400 hover:border-amber-500/30"
          >
            Ready-set claims
          </Link>
          <Link
            href="/tasks?goodFirst=1&ready=1"
            className="rounded-full border border-white/10 px-3 py-1 text-stone-400 hover:border-amber-500/30"
          >
            Good first
          </Link>
        </div>
        <p className="text-xs text-stone-500">
          {items.length} pending (matches network trust)
          {peerCount > 0 ? ` · ${peerCount} need peer review` : ""}
          {ownCount > 0
            ? ` · ${ownCount} yours (invite a second builder or creator-accept)`
            : ""}
          {staleCount > 0
            ? ` · ${staleCount} older than 24h`
            : ""}{" "}
          · oldest first
        </p>
        {ownCount > 0 && peerCount === 0 && (
          <p className="rounded-xl border border-violet-500/30 bg-violet-500/10 px-3 py-2 text-xs text-violet-100">
            All pending work is yours. Peer review is blocked for self-submits -
            use <strong>Accept submission</strong> as project creator, or invite
            a second builder to peer-review. That is why the queue looked empty
            before.
          </p>
        )}
        <ReviewQueueList items={items} signedIn={signedIn} />
      </div>
    );
  }

  const tasks = await prisma.task.findMany({
    where: {
      status: "OPEN",
      parentId: { not: null },
      ...(goodFirstOnly ? { goodFirst: true } : {}),
      ...(tag
        ? { tags: { contains: tag, mode: "insensitive" } }
        : {}),
      project: {
        status: { in: ["ACTIVE", "FUNDED"] },
        ...(category ? { category } : {}),
      },
      ...(q
        ? {
            OR: [
              { title: { contains: q, mode: "insensitive" } },
              { prompt: { contains: q, mode: "insensitive" } },
              { project: { title: { contains: q, mode: "insensitive" } } },
              { tags: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    include: {
      project: {
        select: {
          slug: true,
          title: true,
          category: true,
          license: true,
          tasks: {
            select: {
              id: true,
              title: true,
              status: true,
              parentId: true,
              sortOrder: true,
              dependsOnJson: true,
            },
          },
        },
      },
      claims: { where: { active: true }, select: { id: true } },
    },
    orderBy: goodFirstOnly
      ? [{ estimatedTokens: "asc" }, { createdAt: "desc" }]
      : { createdAt: "desc" },
    take: 80,
  });

  const { readyOpenLeaves } = await import("@/lib/task-dag");

  // Only truly open (no active claim); optional ready-set filter
  let open = tasks.filter((t) => t.claims.length === 0);
  if (readyOnly) {
    open = open.filter((t) => {
      const readyIds = new Set(
        readyOpenLeaves(t.project.tasks).map((r) => r.id)
      );
      return readyIds.has(t.id);
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Open tasks</h1>
        <p className="mt-1 text-stone-400">
          Claim hierarchical leaf work across live projects. Run with your own Grok, submit, earn rep.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 text-xs">
        <Link
          href="/tasks?ready=1"
          className="rounded-full border border-white/10 px-3 py-1 text-stone-400 hover:border-amber-500/30"
        >
          Ready-set
        </Link>
        <Link
          href="/tasks?goodFirst=1&ready=1"
          className="rounded-full border border-white/10 px-3 py-1 text-stone-400 hover:border-amber-500/30"
        >
          Good first
        </Link>
        <Link
          href="/tasks?review=1"
          className="rounded-full border border-sky-500/40 bg-sky-500/10 px-3 py-1 font-medium text-sky-100"
        >
          Review queue
        </Link>
      </div>

      <form className="flex flex-wrap gap-2">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search tasks or projects..."
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
        <label className="flex items-center gap-2 rounded-full border border-white/10 bg-black/40 px-3 py-2 text-xs text-stone-300">
          <input
            type="checkbox"
            name="goodFirst"
            value="1"
            defaultChecked={goodFirstOnly}
          />
          Good first leaf
        </label>
        <label className="flex items-center gap-2 rounded-full border border-white/10 bg-black/40 px-3 py-2 text-xs text-stone-300">
          <input
            type="checkbox"
            name="ready"
            value="1"
            defaultChecked={readyOnly}
          />
          Ready-set only
        </label>
        <input
          name="tag"
          defaultValue={tag || ""}
          placeholder="tag"
          className="w-28 rounded-full border border-white/10 bg-black/40 px-3 py-2 text-sm text-stone-100"
        />
        <button
          type="submit"
          className="rounded-full bg-amber-500 px-4 py-2 text-sm font-semibold text-black hover:bg-amber-400"
        >
          Filter
        </button>
      </form>
      <p className="text-xs text-stone-600">
        Tip:{" "}
        <Link href="/tasks?goodFirst=1" className="text-amber-400 hover:underline">
          /tasks?goodFirst=1
        </Link>{" "}
        for newcomer-friendly leaves. Quests:{" "}
        <Link href="/quests" className="text-amber-400 hover:underline">
          /quests
        </Link>
      </p>

      <div className="flex flex-wrap gap-2">
        <Link
          href="/tasks"
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
            href={`/tasks?category=${k}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
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
        {open.length} claimable leaf task{open.length === 1 ? "" : "s"}
      </p>

      <div className="grid gap-3">
        {open.map((t) => (
          <Card
            key={t.id}
            className="transition hover:border-amber-500/40"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap gap-2">
                  <Badge>{CATEGORY_LABELS[t.project.category]}</Badge>
                  <Badge className="border-white/10 bg-white/5 text-stone-300">
                    {t.project.license}
                  </Badge>
                  {t.goodFirst && (
                    <Badge className="border-sky-500/30 bg-sky-500/10 text-sky-200">
                      good first
                    </Badge>
                  )}
                  {t.estimatedTokens > 0 && (
                    <Badge className="border-white/10 bg-white/5 text-stone-400">
                      ~{formatTokens(t.estimatedTokens)}
                    </Badge>
                  )}
                </div>
                <Link href={`/projects/${t.project.slug}#task-${t.id}`}>
                  <h2 className="mt-2 text-lg font-semibold text-white hover:text-amber-200">
                    {t.title}
                  </h2>
                </Link>
                <p className="mt-1 line-clamp-2 text-sm text-stone-400">{t.prompt}</p>
                <p className="mt-2 text-xs text-stone-500">
                  in{" "}
                  <Link
                    href={`/projects/${t.project.slug}`}
                    className="text-amber-300/90 hover:underline"
                  >
                    {t.project.title}
                  </Link>
                </p>
                <div className="mt-2">
                  <ClaimShareButton
                    projectSlug={t.project.slug}
                    taskId={t.id}
                    taskTitle={t.title}
                  />
                </div>
              </div>
              <Link
                href={`/projects/${t.project.slug}#task-${t.id}`}
                className="shrink-0 rounded-full bg-amber-500 px-3 py-1 text-xs font-bold text-black hover:bg-amber-400"
              >
                View + claim
              </Link>
            </div>
          </Card>
        ))}
      </div>

      {open.length === 0 && (
        <EmptyState
          title={q || category ? "No open tasks match that filter" : "No claimable tasks right now"}
          body="Check back after proposers add subtasks, or browse projects and fund work."
          primaryHref="/projects"
          primaryLabel="Browse projects"
          secondaryHref="/projects/new"
          secondaryLabel="Propose a project"
        />
      )}
    </div>
  );
}
