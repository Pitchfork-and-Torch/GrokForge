/** Server-rendered contribution activity heatmap (GitHub-style weeks). */

export function ContributionHeatmap({
  days,
}: {
  /** ISO date (YYYY-MM-DD) -> count */
  days: Record<string, number>;
}) {
  const weeks = 16;
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  // Align to week start (Sunday UTC)
  const end = new Date(today);
  const cells: { date: string; count: number }[] = [];
  const totalDays = weeks * 7;
  for (let i = totalDays - 1; i >= 0; i--) {
    const d = new Date(end);
    d.setUTCDate(end.getUTCDate() - i);
    const key = d.toISOString().slice(0, 10);
    cells.push({ date: key, count: days[key] || 0 });
  }

  const max = Math.max(1, ...cells.map((c) => c.count));
  const level = (n: number) => {
    if (n <= 0) return "bg-white/5";
    const r = n / max;
    if (r < 0.25) return "bg-amber-500/20";
    if (r < 0.5) return "bg-amber-500/40";
    if (r < 0.75) return "bg-amber-500/65";
    return "bg-amber-500";
  };

  // column-major: 7 rows (Sun-Sat), weeks columns
  const cols: { date: string; count: number }[][] = [];
  for (let w = 0; w < weeks; w++) {
    cols.push(cells.slice(w * 7, w * 7 + 7));
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-2">
        <h2 className="font-semibold text-white">Contribution heat</h2>
        <span className="text-[10px] text-stone-600">Last {weeks} weeks (UTC)</span>
      </div>
      <div className="flex gap-1 overflow-x-auto pb-1">
        {cols.map((col, wi) => (
          <div key={wi} className="flex flex-col gap-1">
            {col.map((c) => (
              <div
                key={c.date}
                title={`${c.date}: ${c.count} contribution${c.count === 1 ? "" : "s"}`}
                className={`h-2.5 w-2.5 rounded-[2px] ${level(c.count)}`}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="mt-2 flex items-center gap-1.5 text-[10px] text-stone-600">
        <span>Less</span>
        <span className="h-2.5 w-2.5 rounded-[2px] bg-white/5" />
        <span className="h-2.5 w-2.5 rounded-[2px] bg-amber-500/20" />
        <span className="h-2.5 w-2.5 rounded-[2px] bg-amber-500/40" />
        <span className="h-2.5 w-2.5 rounded-[2px] bg-amber-500/65" />
        <span className="h-2.5 w-2.5 rounded-[2px] bg-amber-500" />
        <span>More</span>
      </div>
    </div>
  );
}
