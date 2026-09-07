import Link from "next/link";
import { QUEST_TEMPLATES } from "@/data/quest-templates";
import { Badge, Button, Card } from "@/components/ui";

export const dynamic = "force-dynamic";

export default function QuestsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Quest templates</h1>
        <p className="mt-1 text-stone-400">
          One-click starters for greater-good hierarchical projects. Copy into Propose
          or open prefilled new-project flow. Funding goal stays $0 (labor + compute).
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {QUEST_TEMPLATES.map((t) => (
          <Card key={t.id} className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <Badge>{t.category}</Badge>
              <Badge className="border-white/10 bg-white/5 text-stone-300">{t.license}</Badge>
            </div>
            <h2 className="text-lg font-semibold text-white">{t.title}</h2>
            <p className="text-sm text-stone-400">{t.description}</p>
            <p className="text-xs text-stone-500">
              {t.leaves.length} leaves · {t.impactSummary}
            </p>
            <ul className="list-inside list-disc text-xs text-stone-500">
              {t.leaves.map((l) => (
                <li key={l.title}>
                  {l.title}
                  {l.goodFirst ? " (good first)" : ""}
                </li>
              ))}
            </ul>
            <Link
              href={`/projects/new?template=${encodeURIComponent(t.id)}`}
              className="inline-flex"
            >
              <Button>Use template</Button>
            </Link>
          </Card>
        ))}
      </div>
      <p className="text-xs text-stone-600">
        Related:{" "}
        <Link href="/projects/anvil-infinity" className="text-amber-400 hover:underline">
          ANVIL-Infinity
        </Link>{" "}
        meta-harness project.
      </p>
    </div>
  );
}
