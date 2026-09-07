import Link from "next/link";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { Badge, Card, ProgressBar } from "@/components/ui";
import { CATEGORY_LABELS, projectTaskProgress, publicProjectBlurb } from "@/lib/utils";
import {
  RANKING_CRITERIA,
  formatRankingTotal,
} from "@/lib/project-ranking";
import { ShipSourceLinks } from "@/components/ship-source-links";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Project rankings | GrokForge",
  description:
    "Weighted project ranking for the GrokForge group: strategy, feasibility, value, effort, risk, and timing. Highest total is the priority project.",
};

export default async function RankingsPage() {
  const projects = await prisma.project.findMany({
    where: { status: { in: ["ACTIVE", "FUNDED", "COMPLETED"] } },
    include: {
      proposer: { select: { handle: true } },
      scorecard: {
        include: { scorer: { select: { handle: true } } },
      },
      tasks: { select: { status: true, parentId: true } },
      artifacts: {
        where: { source: "package" },
        select: { id: true },
        take: 1,
      },
      _count: { select: { thumbs: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const scored = projects
    .filter((p) => p.scorecard)
    .sort((a, b) => (b.scorecard!.totalScore || 0) - (a.scorecard!.totalScore || 0));
  const unscored = projects.filter((p) => !p.scorecard);
  const top = scored[0] || null;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Badge className="border-amber-500/40 bg-amber-500/10 text-amber-200">
          Developers group ranking
        </Badge>
        <h1 className="mt-3 text-3xl font-bold text-white">Project rankings</h1>
        <p className="mt-2 text-stone-400">
          Every scored project uses the same weighted criteria (1-5 each). Total = sum of
          score × weight (max 5.00). Highest total is the group priority project - then
          move it into detailed planning.
        </p>
      </div>

      <Card className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-amber-400">
          Criteria and weights
        </h2>
        <ul className="grid gap-2 sm:grid-cols-2 text-sm text-stone-400">
          {RANKING_CRITERIA.map((c) => (
            <li
              key={c.id}
              className="rounded-xl border border-white/10 bg-black/30 px-3 py-2"
            >
              <span className="font-medium text-stone-200">{c.label}</span>
              <span className="ml-2 text-amber-300/90">
                {Math.round(c.weight * 100)}%
              </span>
            </li>
          ))}
        </ul>
        <p className="text-xs text-stone-500">
          Write a short justification next to each score on the project page. Re-run when
          new projects appear or priorities change.
        </p>
      </Card>

      {top && (
        <Card className="border-amber-500/35 bg-gradient-to-br from-amber-500/10 via-black/40 to-black/80 space-y-2">
          <p className="text-[11px] font-bold uppercase tracking-widest text-amber-200">
            Priority project (highest score)
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <ShipSourceLinks
              slug={top.slug}
              sealed={top.artifacts.length > 0}
              compact
            />
          </div>
          <Link
            href={
              top.artifacts.length > 0
                ? `/projects/${top.slug}/ship`
                : `/projects/${top.slug}`
            }
            className="block text-xl font-bold text-white hover:text-amber-200"
          >
            {top.title}
          </Link>
          <p className="text-sm text-stone-400 line-clamp-2">{top.description}</p>
          <p className="text-2xl font-bold tabular-nums text-amber-200">
            {formatRankingTotal(top.scorecard!.totalScore)}
            <span className="text-sm font-normal text-stone-500"> / 5.00</span>
          </p>
          <p className="text-xs text-stone-500">
            Next: clarify scope, milestones, owners, risks and mitigations.
          </p>
        </Card>
      )}

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-white">
          Ranked projects ({scored.length})
        </h2>
        {scored.length === 0 && (
          <Card>
            <p className="text-sm text-stone-400">
              No scorecards yet. Open a project as creator or founder and save a ranking
              scorecard.
            </p>
          </Card>
        )}
        <ol className="space-y-3">
          {scored.map((p, i) => {
            const progress = projectTaskProgress(p.tasks);
            const total = p.scorecard!.totalScore;
            const sealed = p.artifacts.length > 0;
            return (
              <li key={p.id}>
                <Card className="transition hover:border-amber-500/40">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-amber-500/30 bg-amber-500/10 text-lg font-bold text-amber-200">
                        {i + 1}
                      </span>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Link
                            href={
                              sealed
                                ? `/projects/${p.slug}/ship`
                                : `/projects/${p.slug}`
                            }
                            className="font-semibold text-white hover:text-amber-200"
                          >
                            {p.title}
                          </Link>
                          <ShipSourceLinks slug={p.slug} sealed={sealed} compact />
                        </div>
                        <p className="mt-1 line-clamp-2 text-sm text-stone-400">
                          {publicProjectBlurb(p.description)}
                        </p>
                        <p className="mt-2 text-xs text-stone-500">
                          @{p.proposer.handle} · {CATEGORY_LABELS[p.category]} ·{" "}
                          {progress.completed}/{progress.total} tasks done ·{" "}
                          {p._count.thumbs} thumbs-up · scored by @
                          {p.scorecard!.scorer.handle || "builder"} ·{" "}
                          <Link
                            href={`/projects/${p.slug}`}
                            className="text-amber-400/90 hover:underline"
                          >
                            project
                          </Link>
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold tabular-nums text-amber-200">
                        {formatRankingTotal(total)}
                      </p>
                      <p className="text-[11px] text-stone-500">/ 5.00</p>
                    </div>
                  </div>
                  <div className="mt-3">
                    <ProgressBar value={(total / 5) * 100} />
                  </div>
                </Card>
              </li>
            );
          })}
        </ol>
      </section>

      {unscored.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-white">
            Unscored ({unscored.length})
          </h2>
          <ul className="space-y-2">
            {unscored.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/projects/${p.slug}`}
                  className="flex items-center justify-between rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-stone-300 hover:border-amber-500/30"
                >
                  <span>{p.title}</span>
                  <span className="text-xs text-stone-500">Score this project →</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
