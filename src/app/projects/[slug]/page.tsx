import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Badge, Card, ProgressBar } from "@/components/ui";
import { ClaimButton, ReviewForm, SubmitForm } from "@/components/task-actions";
import { DonateForm } from "@/components/donate-form";
import {
  CATEGORY_LABELS,
  FUND_TYPE_LABELS,
  formatCents,
  formatTokens,
} from "@/lib/utils";

export const dynamic = "force-dynamic";

type TaskNode = {
  id: string;
  title: string;
  prompt: string;
  acceptanceCriteria: string;
  estimatedTokens: number;
  status: string;
  parentId: string | null;
  sortOrder: number;
  children?: TaskNode[];
  claims: {
    id: string;
    active: boolean;
    user: { handle: string | null; name: string | null };
  }[];
  contributions: {
    id: string;
    body: string;
    sources: string | null;
    status: string;
    score: number | null;
    contentType: string;
    user: { handle: string | null };
    createdAt: Date;
  }[];
};

function buildTree(tasks: TaskNode[]): TaskNode[] {
  const map = new Map<string, TaskNode>();
  tasks.forEach((t) => map.set(t.id, { ...t, children: [] }));
  const roots: TaskNode[] = [];
  map.forEach((t) => {
    if (t.parentId && map.has(t.parentId)) {
      map.get(t.parentId)!.children!.push(t);
    } else {
      roots.push(t);
    }
  });
  const sortRec = (nodes: TaskNode[]) => {
    nodes.sort((a, b) => a.sortOrder - b.sortOrder);
    nodes.forEach((n) => n.children && sortRec(n.children));
  };
  sortRec(roots);
  return roots;
}

function TaskBlock({
  task,
  depth,
  signedIn,
}: {
  task: TaskNode;
  depth: number;
  signedIn: boolean;
}) {
  const activeClaim = task.claims.find((c) => c.active);
  return (
    <div className={depth ? "ml-4 border-l border-sky-500/20 pl-4" : ""}>
      <Card className="mb-3 space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-semibold text-white">{task.title}</h3>
              <Badge
                className={
                  task.status === "OPEN"
                    ? ""
                    : task.status === "ACCEPTED"
                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                      : "border-amber-500/30 bg-amber-500/10 text-amber-200"
                }
              >
                {task.status}
              </Badge>
              <span className="text-xs text-zinc-500">~{formatTokens(task.estimatedTokens)} tokens</span>
            </div>
            {activeClaim && (
              <p className="mt-1 text-xs text-zinc-500">
                Claimed by @{activeClaim.user.handle || activeClaim.user.name}
              </p>
            )}
          </div>
          {signedIn && task.status === "OPEN" && task.parentId && <ClaimButton taskId={task.id} />}
        </div>
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Prompt package</div>
          <p className="mt-1 text-sm text-zinc-300 whitespace-pre-wrap">{task.prompt}</p>
        </div>
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Acceptance criteria
          </div>
          <p className="mt-1 text-sm text-zinc-400 whitespace-pre-wrap">{task.acceptanceCriteria}</p>
        </div>

        {signedIn && task.parentId && ["OPEN", "CLAIMED", "SUBMITTED"].includes(task.status) && (
          <div className="rounded-xl border border-white/10 bg-black/40 p-3">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-sky-400">
              Submit output (manual or from your own Grok)
            </div>
            <SubmitForm taskId={task.id} />
          </div>
        )}

        {task.contributions.map((c) => (
          <div
            key={c.id}
            id={`contribution-${c.id}`}
            className="rounded-xl border border-white/10 bg-zinc-900/60 p-3"
          >
            <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500">
              <span className="text-sky-300">@{c.user.handle}</span>
              <Badge className="border-white/10 bg-white/5 text-zinc-300">{c.status}</Badge>
              {c.score != null && <span>score {c.score}/5</span>}
              <span>{c.contentType}</span>
            </div>
            <pre className="prose-invert-lite mt-2 max-h-64 overflow-auto text-xs">{c.body}</pre>
            {c.sources && <p className="mt-2 text-xs text-zinc-500">Sources: {c.sources}</p>}
            {signedIn && c.status === "PENDING" && (
              <div className="mt-3">
                <ReviewForm contributionId={c.id} />
              </div>
            )}
          </div>
        ))}
      </Card>
      {task.children?.map((child) => (
        <TaskBlock key={child.id} task={child} depth={depth + 1} signedIn={signedIn} />
      ))}
    </div>
  );
}

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const session = await auth();
  const project = await prisma.project.findUnique({
    where: { slug },
    include: {
      proposer: true,
      fundPots: true,
      milestones: { orderBy: { sortOrder: "asc" } },
      artifacts: { orderBy: { createdAt: "desc" }, take: 20 },
      donations: {
        orderBy: { createdAt: "desc" },
        take: 20,
        include: { pot: true },
      },
      ledgerEntries: { orderBy: { createdAt: "desc" }, take: 40 },
      tasks: {
        orderBy: { sortOrder: "asc" },
        include: {
          claims: {
            where: { active: true },
            include: { user: { select: { handle: true, name: true } } },
          },
          contributions: {
            orderBy: { createdAt: "desc" },
            include: { user: { select: { handle: true } } },
          },
        },
      },
    },
  });

  if (!project) notFound();

  const tree = buildTree(project.tasks as unknown as TaskNode[]);
  const raised = project.fundPots.reduce((s, f) => s + f.balanceCents, 0);
  const pct =
    project.fundingGoalCents > 0 ? (raised / project.fundingGoalCents) * 100 : 0;

  // Simple leaderboard by contribution count
  const contribCounts = new Map<string, number>();
  project.tasks.forEach((t) => {
    t.contributions.forEach((c) => {
      const h = c.user.handle || "anon";
      contribCounts.set(h, (contribCounts.get(h) || 0) + 1);
    });
  });
  const leaders = [...contribCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <Badge>{CATEGORY_LABELS[project.category]}</Badge>
          <Badge className="border-white/10 bg-white/5 text-zinc-300">{project.license}</Badge>
          <Badge className="border-white/10 bg-white/5 text-zinc-300">{project.status}</Badge>
        </div>
        <h1 className="text-3xl font-bold text-white sm:text-4xl">{project.title}</h1>
        <p className="max-w-3xl text-zinc-400 whitespace-pre-wrap">{project.description}</p>
        <p className="text-sm text-zinc-500">
          Proposed by{" "}
          <Link className="text-sky-400 hover:underline" href={`/u/${project.proposer.handle}`}>
            @{project.proposer.handle}
          </Link>{" "}
          · {project.proposer.reputation} rep
        </p>
        {project.alignmentCheck && (
          <p className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 text-xs text-emerald-200/90">
            Alignment pre-check: {project.alignmentCheck}
          </p>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section>
            <h2 className="mb-3 text-xl font-semibold text-white">Task hierarchy</h2>
            {tree.map((t) => (
              <TaskBlock key={t.id} task={t} depth={0} signedIn={!!session?.user} />
            ))}
            {!session?.user && (
              <p className="text-sm text-zinc-500">
                <Link href="/login" className="text-sky-400 hover:underline">
                  Sign in
                </Link>{" "}
                to claim tasks and submit outputs.
              </p>
            )}
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-white">Public ledger</h2>
            <Card className="divide-y divide-white/5 p-0 overflow-hidden">
              {project.ledgerEntries.map((e) => (
                <div key={e.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
                  <div>
                    <span className="text-xs uppercase tracking-wide text-zinc-500">{e.kind}</span>
                    <p className="text-zinc-300">{e.summary}</p>
                  </div>
                  <div className="text-right text-xs text-zinc-500">
                    {e.amountCents > 0 && (
                      <div className="text-sky-300">{formatCents(e.amountCents)}</div>
                    )}
                    <div>{e.createdAt.toISOString().slice(0, 16).replace("T", " ")} UTC</div>
                  </div>
                </div>
              ))}
              {project.ledgerEntries.length === 0 && (
                <p className="p-4 text-sm text-zinc-500">No ledger events yet.</p>
              )}
            </Card>
          </section>
        </div>

        <aside className="space-y-4">
          <Card className="space-y-3">
            <h2 className="text-lg font-semibold text-white">Funding</h2>
            <div className="flex justify-between text-sm">
              <span className="text-zinc-400">Raised</span>
              <span className="font-semibold text-white">{formatCents(raised)}</span>
            </div>
            <ProgressBar value={pct} />
            <p className="text-xs text-zinc-500">Goal {formatCents(project.fundingGoalCents)}</p>
            <ul className="space-y-2 text-sm">
              {project.fundPots.map((p) => (
                <li key={p.id} className="flex justify-between gap-2 text-zinc-400">
                  <span>
                    {p.label}{" "}
                    <span className="text-xs text-zinc-600">
                      ({FUND_TYPE_LABELS[p.type] || p.type})
                    </span>
                  </span>
                  <span className="text-zinc-200">{formatCents(p.balanceCents)}</span>
                </li>
              ))}
            </ul>
            {session?.user ? (
              <DonateForm
                projectId={project.id}
                pots={project.fundPots.map((p) => ({
                  id: p.id,
                  label: p.label,
                  type: p.type,
                  balanceCents: p.balanceCents,
                }))}
              />
            ) : (
              <p className="text-xs text-zinc-500">
                <Link href="/login" className="text-sky-400">
                  Sign in
                </Link>{" "}
                to donate.
              </p>
            )}
          </Card>

          <Card>
            <h2 className="text-lg font-semibold text-white">Milestones</h2>
            <ul className="mt-3 space-y-3">
              {project.milestones.map((m) => (
                <li key={m.id} className="text-sm">
                  <div className="flex justify-between gap-2">
                    <span className="font-medium text-zinc-200">{m.title}</span>
                    <span className="text-xs text-zinc-500">{formatCents(m.targetCents)}</span>
                  </div>
                  <p className="text-xs text-zinc-500">{m.description}</p>
                  <p className="text-xs text-zinc-600">
                    {m.released ? "Released" : "Locked until human + multi-agent verification"}
                  </p>
                </li>
              ))}
            </ul>
          </Card>

          <Card>
            <h2 className="text-lg font-semibold text-white">Contributor leaderboard</h2>
            <ul className="mt-3 space-y-1 text-sm text-zinc-400">
              {leaders.map(([h, n]) => (
                <li key={h} className="flex justify-between">
                  <span>@{h}</span>
                  <span>{n} submissions</span>
                </li>
              ))}
              {leaders.length === 0 && <li>No contributions yet.</li>}
            </ul>
          </Card>

          <Card>
            <h2 className="text-lg font-semibold text-white">Artifacts</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {project.artifacts.map((a) => (
                <li key={a.id}>
                  <a href={a.url} className="text-sky-400 hover:underline">
                    {a.title}
                  </a>
                  <span className="ml-2 text-xs text-zinc-600">{a.license}</span>
                </li>
              ))}
              {project.artifacts.length === 0 && (
                <li className="text-zinc-500">Artifacts appear when work is submitted.</li>
              )}
            </ul>
          </Card>
        </aside>
      </div>
    </div>
  );
}
