import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Badge, Button, Card, ProgressBar } from "@/components/ui";
import { CATEGORY_LABELS, formatCents } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const projects = await prisma.project.findMany({
    where: { status: "ACTIVE" },
    include: {
      proposer: { select: { handle: true, reputation: true } },
      fundPots: true,
      tasks: { where: { status: "OPEN", parentId: { not: null } } },
      _count: { select: { tasks: true, donations: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 6,
  });

  return (
    <div className="space-y-12">
      <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-zinc-950 via-black to-sky-950/40 p-8 sm:p-12">
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-sky-500/20 blur-3xl" />
        <Badge>MVP · Neon-backed · X/Grok aesthetic</Badge>
        <h1 className="mt-4 max-w-2xl text-4xl font-bold tracking-tight text-white sm:text-5xl">
          Crowdsource hierarchical multi-agent work for the{" "}
          <span className="bg-gradient-to-r from-sky-400 to-cyan-300 bg-clip-text text-transparent">
            greater good
          </span>
        </h1>
        <p className="mt-4 max-w-2xl text-base text-zinc-400 sm:text-lg">
          GrokForge is GoFundMe + task marketplace + open-source collab hub for Grok users.
          Propose projects, fund compute and SuperGrok sponsorship, claim nested tasks, submit
          outputs - all on a public ledger. We never store your xAI API keys.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/projects">
            <Button>Browse projects</Button>
          </Link>
          <Link href="/projects/new">
            <Button variant="secondary">Propose a project</Button>
          </Link>
          <Link href="/login">
            <Button variant="ghost">Sign in (X demo)</Button>
          </Link>
        </div>
        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          {[
            { k: "Labor", v: "Claim hierarchical tasks, run with your own Grok, submit + peer review" },
            { k: "Capital", v: "Transparent pots: API credits, compute, SuperGrok sponsorship" },
            { k: "Open", v: "Funded work defaults to open licenses; public contribution ledgers" },
          ].map((item) => (
            <div key={item.k} className="rounded-2xl border border-white/10 bg-black/40 p-4">
              <div className="text-xs font-semibold uppercase tracking-widest text-sky-400">{item.k}</div>
              <p className="mt-2 text-sm text-zinc-300">{item.v}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold text-white">Live projects</h2>
            <p className="text-sm text-zinc-500">Seeded climate + public-goods examples, plus anything you create.</p>
          </div>
          <Link href="/projects" className="text-sm text-sky-400 hover:text-sky-300">
            View all
          </Link>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {projects.map((p) => {
            const raised = p.fundPots.reduce((s, f) => s + f.balanceCents, 0);
            const pct = p.fundingGoalCents > 0 ? (raised / p.fundingGoalCents) * 100 : 0;
            return (
              <Link key={p.id} href={`/projects/${p.slug}`}>
                <Card className="h-full transition hover:border-sky-500/40 hover:shadow-[0_0_30px_rgba(14,165,233,0.12)]">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge>{CATEGORY_LABELS[p.category] || p.category}</Badge>
                    <span className="text-xs text-zinc-500">{p.license}</span>
                  </div>
                  <h3 className="mt-3 text-lg font-semibold text-white">{p.title}</h3>
                  <p className="mt-2 line-clamp-2 text-sm text-zinc-400">{p.description}</p>
                  <div className="mt-4 space-y-2">
                    <div className="flex justify-between text-xs text-zinc-500">
                      <span>{formatCents(raised)} raised</span>
                      <span>goal {formatCents(p.fundingGoalCents)}</span>
                    </div>
                    <ProgressBar value={pct} />
                  </div>
                  <div className="mt-4 flex flex-wrap gap-3 text-xs text-zinc-500">
                    <span>@{p.proposer.handle} · {p.proposer.reputation} rep</span>
                    <span>{p.tasks.length} open tasks</span>
                    <span>{p._count.donations} donations</span>
                  </div>
                </Card>
              </Link>
            );
          })}
          {projects.length === 0 && (
            <Card>
              <p className="text-zinc-400">No projects yet. Run seed or propose the first one.</p>
            </Card>
          )}
        </div>
      </section>
    </div>
  );
}
