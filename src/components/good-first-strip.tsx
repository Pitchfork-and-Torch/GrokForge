import Link from "next/link";
import { Badge, Card } from "@/components/ui";
import { formatTokens } from "@/lib/utils";

export type GoodFirstItem = {
  id: string;
  title: string;
  projectSlug: string;
  projectTitle: string;
  estimatedTokens: number;
};

/** Home / growth strip: low-friction leaves for new builders. */
export function GoodFirstStrip({ items }: { items: GoodFirstItem[] }) {
  if (items.length === 0) return null;

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold text-white">Good first leaves</h2>
          <p className="text-sm text-stone-500">
            Small claimable leaves - a good place to join a community project.
          </p>
        </div>
        <Link
          href="/tasks?goodFirst=1&ready=1"
          className="text-xs text-amber-400 hover:underline"
        >
          All good-first ready →
        </Link>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((t) => (
          <Link
            key={t.id}
            href={`/projects/${t.projectSlug}#task-${t.id}`}
            className="block"
          >
            <Card className="h-full transition hover:border-amber-500/40">
              <Badge className="border-sky-500/30 bg-sky-500/10 text-sky-200">
                good first
              </Badge>
              <h3 className="mt-2 text-sm font-semibold text-white line-clamp-2">
                {t.title}
              </h3>
              <p className="mt-1 text-[11px] text-stone-500 truncate">
                {t.projectTitle}
                {t.estimatedTokens > 0
                  ? ` · ~${formatTokens(t.estimatedTokens)}`
                  : ""}
              </p>
            </Card>
          </Link>
        ))}
      </div>
    </section>
  );
}
