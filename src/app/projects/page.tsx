import Link from "next/link";
import { ProjectCategory } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { Badge, Card, ProgressBar } from "@/components/ui";
import { CATEGORY_LABELS, formatCents } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; q?: string }>;
}) {
  const sp = await searchParams;
  const category =
    sp.category && Object.values(ProjectCategory).includes(sp.category as ProjectCategory)
      ? (sp.category as ProjectCategory)
      : undefined;
  const q = sp.q?.trim();

  const projects = await prisma.project.findMany({
    where: {
      status: { in: ["ACTIVE", "FUNDED", "COMPLETED"] },
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
      tasks: { where: { status: "OPEN", parentId: { not: null } }, select: { id: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Discover projects</h1>
        <p className="mt-1 text-zinc-400">Filter by impact category, funding progress, and open tasks.</p>
      </div>

      <form className="flex flex-wrap gap-2">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search..."
          className="min-w-[200px] flex-1 rounded-full border border-white/10 bg-black/40 px-4 py-2 text-sm text-zinc-100"
        />
        <select
          name="category"
          defaultValue={category || ""}
          className="rounded-full border border-white/10 bg-black/40 px-4 py-2 text-sm text-zinc-100"
        >
          <option value="">All categories</option>
          {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="rounded-full bg-sky-500 px-4 py-2 text-sm font-semibold text-black hover:bg-sky-400"
        >
          Filter
        </button>
      </form>

      <div className="grid gap-4 md:grid-cols-2">
        {projects.map((p) => {
          const raised = p.fundPots.reduce((s, f) => s + f.balanceCents, 0);
          const pct = p.fundingGoalCents > 0 ? (raised / p.fundingGoalCents) * 100 : 0;
          return (
            <Link key={p.id} href={`/projects/${p.slug}`}>
              <Card className="h-full transition hover:border-sky-500/40">
                <div className="flex flex-wrap gap-2">
                  <Badge>{CATEGORY_LABELS[p.category]}</Badge>
                  <Badge className="border-emerald-500/30 bg-emerald-500/10 text-emerald-300">
                    {p.tasks.length} open
                  </Badge>
                </div>
                <h2 className="mt-3 text-xl font-semibold text-white">{p.title}</h2>
                <p className="mt-2 line-clamp-3 text-sm text-zinc-400">{p.description}</p>
                <div className="mt-4 space-y-2">
                  <div className="flex justify-between text-xs text-zinc-500">
                    <span>{formatCents(raised)}</span>
                    <span>{Math.round(pct)}% of {formatCents(p.fundingGoalCents)}</span>
                  </div>
                  <ProgressBar value={pct} />
                </div>
                <p className="mt-3 text-xs text-zinc-500">
                  by @{p.proposer.handle} · {p.proposer.reputation} rep · {p.license}
                </p>
              </Card>
            </Link>
          );
        })}
      </div>
      {projects.length === 0 && (
        <Card>
          <p className="text-zinc-400">No matches. Try another filter or propose a project.</p>
        </Card>
      )}
    </div>
  );
}
