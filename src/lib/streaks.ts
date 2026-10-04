/**
 * Contribution activity streaks (UTC calendar days with at least one submission).
 */

export function computeStreak(dates: Date[], now = new Date()): {
  current: number;
  longest: number;
  activeToday: boolean;
} {
  if (!dates.length) {
    return { current: 0, longest: 0, activeToday: false };
  }

  const dayKey = (d: Date) => {
    const x = new Date(d);
    return `${x.getUTCFullYear()}-${x.getUTCMonth()}-${x.getUTCDate()}`;
  };

  const unique = [...new Set(dates.map(dayKey))].sort().reverse();
  // unique is newest first as strings YYYY-M-D which sort lexicographically only if zero-padded
  // use epoch day numbers instead
  const dayNums = [
    ...new Set(
      dates.map((d) => {
        const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
        return Math.floor(x.getTime() / 86_400_000);
      })
    ),
  ].sort((a, b) => b - a);

  const today = Math.floor(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) / 86_400_000
  );
  const activeToday = dayNums[0] === today;
  const start = activeToday || dayNums[0] === today - 1 ? dayNums[0] : -1;

  let current = 0;
  if (start >= 0) {
    let expect = start;
    for (const n of dayNums) {
      if (n === expect) {
        current += 1;
        expect -= 1;
      } else if (n < expect) {
        break;
      }
    }
  }

  let longest = 0;
  let run = 0;
  let prev = -1;
  const ascending = [...dayNums].sort((a, b) => a - b);
  for (const n of ascending) {
    if (prev === -1 || n === prev + 1) {
      run += 1;
    } else if (n !== prev) {
      run = 1;
    }
    longest = Math.max(longest, run);
    prev = n;
  }

  return { current, longest: Math.max(longest, current), activeToday };
}

export function streakBadgeLabel(current: number): string | null {
  if (current >= 30) return "30-day streak";
  if (current >= 14) return "14-day streak";
  if (current >= 7) return "7-day streak";
  if (current >= 3) return "3-day streak";
  if (current >= 1) return "Active today";
  return null;
}
