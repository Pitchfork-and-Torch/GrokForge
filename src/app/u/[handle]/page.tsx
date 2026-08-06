import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Badge, Card } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;
  const user = await prisma.user.findUnique({
    where: { handle },
    include: {
      projects: { select: { slug: true, title: true, category: true } },
      contributions: {
        take: 15,
        orderBy: { createdAt: "desc" },
        include: { task: { select: { title: true, project: { select: { slug: true } } } } },
      },
    },
  });
  if (!user) notFound();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">@{user.handle}</h1>
        <p className="text-zinc-400">{user.name}</p>
        <Badge className="mt-2">{user.reputation} reputation</Badge>
      </div>
      {user.bio && (
        <Card>
          <p className="text-sm text-zinc-300">{user.bio}</p>
        </Card>
      )}
      {user.capacityNotes && (
        <Card>
          <h2 className="text-sm font-semibold text-zinc-400">Capacity</h2>
          <p className="mt-1 text-sm text-zinc-300">{user.capacityNotes}</p>
        </Card>
      )}
      <Card>
        <h2 className="font-semibold text-white">Projects proposed</h2>
        <ul className="mt-2 space-y-1 text-sm">
          {user.projects.map((p) => (
            <li key={p.slug}>
              <Link href={`/projects/${p.slug}`} className="text-sky-300 hover:underline">
                {p.title}
              </Link>
            </li>
          ))}
          {user.projects.length === 0 && <li className="text-zinc-500">None</li>}
        </ul>
      </Card>
      <Card>
        <h2 className="font-semibold text-white">Recent contributions</h2>
        <ul className="mt-2 space-y-1 text-sm">
          {user.contributions.map((c) => (
            <li key={c.id}>
              <Link
                href={`/projects/${c.task.project.slug}#contribution-${c.id}`}
                className="text-sky-300 hover:underline"
              >
                {c.task.title}
              </Link>{" "}
              <span className="text-xs text-zinc-500">{c.status}</span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
