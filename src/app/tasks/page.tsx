import Link from "next/link";
import { ProjectCategory } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { Badge, Card } from "@/components/ui";
import { EmptyState } from "@/components/empty-state";
import { CATEGORY_LABELS, formatTokens } from "@/lib/utils";
import { expireStaleClaims } from "@/lib/expire-claims";

export const dynamic = "force-dynamic";

export default async function OpenTasksPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; q?: string }>;
}) {
  // Keep claimable board honest even between cron ticks
  try {
    await expireStaleClaims({ limit: 20, notify: true });
  } catch {
    // non-fatal
  }

  const sp = await searchParams;
  const category =
    sp.category && Object.values(ProjectCategory).includes(sp.category as ProjectCategory)
      ? (sp.category as ProjectCategory)
      : undefined;
  const q = sp.q?.trim();

  const tasks = await prisma.task.findMany({
    where: {
      status: "OPEN",
      parentId: { not: null },
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
        },
      },
      claims: { where: { active: true }, select: { id: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 80,
  });

  // Only truly open (no active claim)
  const open = tasks.filter((t) => t.claims.length === 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Open tasks</h1>
        <p className="mt-1 text-stone-400">
          Claim hierarchical leaf work across live projects. Run with your own Grok, submit, earn rep.
        </p>
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
        <button
          type="submit"
          className="rounded-full bg-amber-500 px-4 py-2 text-sm font-semibold text-black hover:bg-amber-400"
        >
          Filter
        </button>
      </form>

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
          <Link key={t.id} href={`/projects/${t.project.slug}#task-${t.id}`}>
            <Card className="transition hover:border-amber-500/40">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap gap-2">
                    <Badge>{CATEGORY_LABELS[t.project.category]}</Badge>
                    <Badge className="border-white/10 bg-white/5 text-stone-300">
                      {t.project.license}
                    </Badge>
                    {t.estimatedTokens > 0 && (
                      <Badge className="border-white/10 bg-white/5 text-stone-400">
                        ~{formatTokens(t.estimatedTokens)}
                      </Badge>
                    )}
                  </div>
                  <h2 className="mt-2 text-lg font-semibold text-white">{t.title}</h2>
                  <p className="mt-1 line-clamp-2 text-sm text-stone-400">{t.prompt}</p>
                  <p className="mt-2 text-xs text-stone-500">
                    in{" "}
                    <span className="text-amber-300/90">{t.project.title}</span>
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-amber-500 px-3 py-1 text-xs font-bold text-black">
                  View + claim
                </span>
              </div>
            </Card>
          </Link>
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
