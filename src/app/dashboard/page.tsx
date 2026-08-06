import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Badge, Button, Card } from "@/components/ui";
import { formatCents } from "@/lib/utils";
import { updateProfileAction } from "@/lib/actions";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?next=/dashboard");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      projects: {
        orderBy: { createdAt: "desc" },
        include: { fundPots: true },
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
    },
  });

  if (!user) redirect("/login");

  // Matching: open tasks in categories user has contributed to, or all open if new
  const openTasks = await prisma.task.findMany({
    where: {
      status: "OPEN",
      parentId: { not: null },
    },
    include: {
      project: { select: { slug: true, title: true, category: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 8,
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Dashboard</h1>
          <p className="text-zinc-400">
            @{user.handle} · {user.reputation} reputation · eligibility windows respect rate limits
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/projects/new">
            <Button>New project</Button>
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
              <label className="mb-1 block text-xs uppercase text-zinc-500">Handle</label>
              <input
                name="handle"
                defaultValue={user.handle || ""}
                className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs uppercase text-zinc-500">Capacity notes</label>
              <textarea
                name="capacityNotes"
                defaultValue={user.capacityNotes || ""}
                className="min-h-[80px] w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm"
                placeholder="Tokens/day, topics, timezone..."
              />
            </div>
            <div>
              <label className="mb-1 block text-xs uppercase text-zinc-500">Bio</label>
              <textarea
                name="bio"
                defaultValue={user.bio || ""}
                className="min-h-[60px] w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm"
              />
            </div>
            <Button type="submit" variant="secondary">
              Save profile
            </Button>
          </form>
        </Card>

        <Card>
          <h2 className="text-lg font-semibold text-white">Recommended tasks</h2>
          <p className="mt-1 text-xs text-zinc-500">
            Basic matching from open leaves. Typical claim window: 48h (rate-limit friendly refill).
          </p>
          <ul className="mt-3 space-y-2">
            {openTasks.map((t) => (
              <li key={t.id} className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm">
                <Link
                  href={`/projects/${t.project.slug}`}
                  className="font-medium text-sky-300 hover:underline"
                >
                  {t.title}
                </Link>
                <div className="text-xs text-zinc-500">
                  {t.project.title} · {t.project.category} · ~{t.estimatedTokens} tokens
                </div>
              </li>
            ))}
            {openTasks.length === 0 && (
              <li className="text-sm text-zinc-500">No open tasks right now.</li>
            )}
          </ul>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <h2 className="font-semibold text-white">My projects</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {user.projects.map((p) => {
              const raised = p.fundPots.reduce((s, f) => s + f.balanceCents, 0);
              return (
                <li key={p.id}>
                  <Link href={`/projects/${p.slug}`} className="text-sky-300 hover:underline">
                    {p.title}
                  </Link>
                  <div className="text-xs text-zinc-500">{formatCents(raised)} raised</div>
                </li>
              );
            })}
            {user.projects.length === 0 && (
              <li className="text-zinc-500">None yet.</li>
            )}
          </ul>
        </Card>

        <Card>
          <h2 className="font-semibold text-white">Claims</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {user.claims.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/projects/${c.task.project.slug}`}
                  className="text-sky-300 hover:underline"
                >
                  {c.task.title}
                </Link>
                <div className="text-xs text-zinc-500">
                  {c.active ? (
                    <Badge className="border-amber-500/30 bg-amber-500/10 text-amber-200">active</Badge>
                  ) : (
                    "closed"
                  )}{" "}
                  · {c.task.project.title}
                </div>
              </li>
            ))}
            {user.claims.length === 0 && <li className="text-zinc-500">No claims yet.</li>}
          </ul>
        </Card>

        <Card>
          <h2 className="font-semibold text-white">Donations</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {user.donations.map((d) => (
              <li key={d.id}>
                <span className="text-zinc-200">{formatCents(d.amountCents)}</span> →{" "}
                <Link href={`/projects/${d.project.slug}`} className="text-sky-300 hover:underline">
                  {d.project.title}
                </Link>
                <div className="text-xs text-zinc-500">{d.pot.label}</div>
              </li>
            ))}
            {user.donations.length === 0 && (
              <li className="text-zinc-500">No donations yet.</li>
            )}
          </ul>
        </Card>
      </div>

      <Card>
        <h2 className="font-semibold text-white">My contributions</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {user.contributions.map((c) => (
            <li key={c.id} className="flex flex-wrap items-center gap-2">
              <Badge className="border-white/10 bg-white/5 text-zinc-300">{c.status}</Badge>
              <Link
                href={`/projects/${c.task.project.slug}#contribution-${c.id}`}
                className="text-sky-300 hover:underline"
              >
                {c.task.title}
              </Link>
              {c.score != null && <span className="text-xs text-zinc-500">score {c.score}</span>}
            </li>
          ))}
          {user.contributions.length === 0 && (
            <li className="text-zinc-500">Submit work from a project task.</li>
          )}
        </ul>
      </Card>
    </div>
  );
}
