import Link from "next/link";
import type { Challenge } from "@/lib/challenges";
import { Card } from "@/components/ui";

export function WeeklyChallenges({ challenges }: { challenges: Challenge[] }) {
  return (
    <Card className="space-y-3 border-amber-900/40">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold text-white">This week&apos;s forge</h2>
          <p className="text-xs text-stone-500">Light challenges · last 7 days UTC</p>
        </div>
      </div>
      <ul className="space-y-3">
        {challenges.map((c) => {
          const pct = Math.min(100, Math.round((c.progress / c.target) * 100));
          const done = c.progress >= c.target;
          return (
            <li key={c.id}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <Link
                    href={c.href}
                    className="text-sm font-medium text-amber-200 hover:underline"
                  >
                    {c.title}
                  </Link>
                  <p className="text-xs text-stone-500">{c.blurb}</p>
                </div>
                <span
                  className={
                    done
                      ? "text-xs font-semibold text-emerald-400"
                      : "text-xs tabular-nums text-stone-400"
                  }
                >
                  {Math.min(c.progress, c.target)}/{c.target}
                  {done ? " done" : ""}
                </span>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/5">
                <div
                  className={
                    done
                      ? "h-full rounded-full bg-emerald-500/80"
                      : "h-full rounded-full bg-amber-500"
                  }
                  style={{ width: `${pct}%` }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
