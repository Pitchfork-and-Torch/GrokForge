import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Badge, Card } from "@/components/ui";
import { EmptyState } from "@/components/empty-state";
import { formatCents } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ActivityPage() {
  const entries = await prisma.ledgerEntry.findMany({
    where: {
      project: { status: { in: ["ACTIVE", "FUNDED", "COMPLETED"] } },
    },
    orderBy: { createdAt: "desc" },
    take: 80,
    include: {
      project: { select: { slug: true, title: true, status: true } },
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <Badge>Public ledger · network-wide</Badge>
        <h1 className="mt-2 text-3xl font-bold text-white">Network activity</h1>
        <p className="mt-1 text-stone-400">
          Labor claims, submissions, capital, and milestones across live projects.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 text-xs">
        <Link
          href="/projects"
          className="rounded-full border border-white/10 px-3 py-1 text-stone-400 hover:border-amber-500/40"
        >
          Projects
        </Link>
        <Link
          href="/tasks"
          className="rounded-full border border-white/10 px-3 py-1 text-stone-400 hover:border-amber-500/40"
        >
          Open tasks
        </Link>
        <Link
          href="/leaderboard"
          className="rounded-full border border-white/10 px-3 py-1 text-stone-400 hover:border-amber-500/40"
        >
          Leaders
        </Link>
      </div>

      <Card className="divide-y divide-white/5 overflow-hidden p-0">
        {entries.map((e) => (
          <div
            key={e.id}
            className="flex flex-wrap items-start justify-between gap-3 px-4 py-3"
          >
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-semibold uppercase tracking-wide text-stone-600">
                  {e.kind}
                </span>
                {e.actorHandle && (
                  <Link
                    href={`/u/${e.actorHandle}`}
                    className="text-[11px] text-amber-400/90 hover:underline"
                  >
                    @{e.actorHandle}
                  </Link>
                )}
              </div>
              <p className="mt-0.5 text-sm text-stone-300">{e.summary}</p>
              <Link
                href={`/projects/${e.project.slug}`}
                className="mt-1 inline-block text-xs text-amber-300/80 hover:underline"
              >
                {e.project.title}
              </Link>
            </div>
            <div className="shrink-0 text-right text-xs text-stone-600">
              {e.amountCents > 0 && (
                <div className="font-semibold tabular-nums text-amber-300">
                  {formatCents(e.amountCents)}
                </div>
              )}
              <div>
                {e.createdAt.toISOString().slice(0, 16).replace("T", " ")} UTC
              </div>
            </div>
          </div>
        ))}
        {entries.length === 0 && (
          <div className="p-4">
            <EmptyState
              title="No network activity yet"
              body="Propose a project, claim a task, or fund a pot to start the public ledger."
              primaryHref="/projects"
              primaryLabel="Browse projects"
              secondaryHref="/projects/new"
              secondaryLabel="Propose"
            />
          </div>
        )}
      </Card>
    </div>
  );
}
