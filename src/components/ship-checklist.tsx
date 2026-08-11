import Link from "next/link";
import { Badge, Card } from "@/components/ui";

export type ShipChecklistProps = {
  slug: string;
  hasPackage: boolean;
  hasGithub: boolean;
  githubUrl?: string | null;
  downloadUrl: string;
  skillPackUrl: string;
  shipUrl: string;
  canPublish: boolean;
  title: string;
};

/** Post-seal checklist so Ship is a complete funnel, not a dead end. */
export function ShipChecklist({
  slug,
  hasPackage,
  hasGithub,
  githubUrl,
  downloadUrl,
  skillPackUrl,
  shipUrl,
  canPublish,
  title,
}: ShipChecklistProps) {
  const steps: {
    done: boolean;
    label: string;
    href?: string;
    external?: boolean;
    hint: string;
  }[] = [
    {
      done: hasPackage,
      label: "Sealed package ZIP",
      href: downloadUrl,
      hint: "GitHub-ready archive with README, LICENSE, CONTRIBUTORS",
    },
    {
      done: hasGithub,
      label: hasGithub ? "Published on GitHub" : "Publish to GitHub",
      href: hasGithub
        ? githubUrl || undefined
        : canPublish
          ? `#ship-github`
          : undefined,
      external: hasGithub,
      hint: canPublish
        ? "One-click org publish (creator or founder)"
        : "Creator/founder publishes; others use ZIP + GITHUB.md",
    },
    {
      done: false,
      label: "Install skill pack",
      href: skillPackUrl,
      hint: "JSON for Grok Build: node scripts/install-skill-pack.mjs " + slug,
    },
    {
      done: false,
      label: "Share ship page",
      href: shipUrl,
      hint: `Tweet or link ${title} sealed on GrokForge`,
    },
  ];

  const doneCount = steps.filter((s) => s.done).length;

  return (
    <Card className="space-y-3 border-amber-500/25 bg-amber-500/5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-amber-100">Ship checklist</h2>
          <p className="mt-0.5 text-[11px] text-stone-500">
            Seal → package → GitHub → agents install. {doneCount}/{steps.length}{" "}
            done on-platform.
          </p>
        </div>
        <Badge className="border-white/10 bg-white/5 text-stone-300">
          {doneCount === steps.length ? "shipped" : "in progress"}
        </Badge>
      </div>
      <ol className="space-y-2">
        {steps.map((s, i) => (
          <li
            key={s.label}
            className="flex flex-wrap items-start gap-2 rounded-xl border border-white/10 bg-black/30 px-3 py-2"
          >
            <span
              className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                s.done
                  ? "bg-emerald-500/20 text-emerald-300"
                  : "bg-white/10 text-stone-400"
              }`}
            >
              {s.done ? "✓" : i + 1}
            </span>
            <div className="min-w-0 flex-1">
              {s.href ? (
                s.external || s.href.startsWith("http") || s.href.startsWith("/") ? (
                  <a
                    href={s.href}
                    target={s.external ? "_blank" : undefined}
                    rel={s.external ? "noopener noreferrer" : undefined}
                    className="text-sm font-medium text-white hover:text-amber-200"
                  >
                    {s.label}
                  </a>
                ) : (
                  <Link
                    href={s.href}
                    className="text-sm font-medium text-white hover:text-amber-200"
                  >
                    {s.label}
                  </Link>
                )
              ) : (
                <span className="text-sm font-medium text-stone-300">{s.label}</span>
              )}
              <p className="text-[11px] text-stone-500">{s.hint}</p>
            </div>
          </li>
        ))}
      </ol>
    </Card>
  );
}
