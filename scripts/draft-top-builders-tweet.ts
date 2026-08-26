/**
 * Human-gated top builders tweet draft.
 * Writes Desktop/GrokForge-tweet-ready/top-builders-tweet.txt (never auto-posts).
 *
 *   npx tsx scripts/draft-top-builders-tweet.ts
 *   npx tsx scripts/draft-top-builders-tweet.ts week
 */
import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import { homedir } from "os";
import { PrismaClient } from "@prisma/client";
import {
  rankContributors,
  type LeaderboardInput,
  windowStart,
  type LeaderboardWindow,
} from "../src/lib/leaderboard";
import { isDemoBotUser, isFounderHandle } from "../src/lib/identity";

const prisma = new PrismaClient();

async function main() {
  const arg = (process.argv[2] || "week").toLowerCase();
  const window = (["all", "month", "week"].includes(arg)
    ? arg
    : "week") as LeaderboardWindow;
  const since = windowStart(window);

  const allUsers = await prisma.user.findMany({
    select: {
      id: true,
      handle: true,
      name: true,
      image: true,
      reputation: true,
      email: true,
    },
  });
  const users = allUsers.filter((u) => !isDemoBotUser(u));

  const donations = await prisma.donation.groupBy({
    by: ["donorId"],
    where: {
      donorId: { not: null },
      ...(since ? { createdAt: { gte: since } } : {}),
    },
    _sum: { amountCents: true },
  });
  const donationMap = new Map(
    donations
      .filter((d) => d.donorId)
      .map((d) => [d.donorId as string, d._sum.amountCents || 0])
  );

  const contributions = await prisma.contribution.findMany({
    where: {
      status: "ACCEPTED",
      ...(since ? { createdAt: { gte: since } } : {}),
    },
    select: {
      userId: true,
      task: { select: { estimatedTokens: true } },
    },
  });
  const contribCount = new Map<string, number>();
  const tokenSum = new Map<string, number>();
  for (const c of contributions) {
    contribCount.set(c.userId, (contribCount.get(c.userId) || 0) + 1);
    tokenSum.set(
      c.userId,
      (tokenSum.get(c.userId) || 0) + (c.task?.estimatedTokens || 0)
    );
  }

  const reviews = await prisma.contributionReview.groupBy({
    by: ["reviewerId"],
    where: since ? { createdAt: { gte: since } } : {},
    _count: { _all: true },
  });
  const reviewMap = new Map(reviews.map((r) => [r.reviewerId, r._count._all]));

  const inputs: LeaderboardInput[] = users.map((u) => ({
    userId: u.id,
    handle: u.handle,
    name: u.name,
    image: u.image,
    reputation: u.reputation,
    donationCents: donationMap.get(u.id) || 0,
    acceptedContributions: contribCount.get(u.id) || 0,
    estimatedTokens: tokenSum.get(u.id) || 0,
    reviewsGiven: reviewMap.get(u.id) || 0,
    isFounder: isFounderHandle(u.handle),
  }));

  const rows = rankContributors(inputs, 5);
  const windowLabel =
    window === "week" ? "this week" : window === "month" ? "this month" : "all time";

  const lines: string[] = [];
  lines.push(`GrokForge top builders (${windowLabel}):`);
  lines.push("");
  if (rows.length === 0) {
    lines.push("Board is open - claim a task and climb the ranks.");
  } else {
    rows.forEach((r, i) => {
      const medal = i === 0 ? "1." : i === 1 ? "2." : i === 2 ? "3." : `${i + 1}.`;
      const founder = r.isFounder ? " [Founder]" : "";
      lines.push(
        `${medal} @${r.handle || "anon"}${founder} - ${r.score.toFixed(1)} pts (${r.acceptedContributions} accepted, $${(r.donationCents / 100).toFixed(0)} capital)`
      );
    });
  }
  lines.push("");
  lines.push("Sign in with X. Open licenses. Public ledgers.");
  lines.push("https://grokforge.app/leaderboard");
  lines.push("");
  lines.push("---");
  lines.push("HUMAN GATE: review, edit, attach tweet-card-1200x630.jpg, then post manually.");
  lines.push("Do not auto-post.");

  const body = lines.join("\n");
  const dir = join(homedir(), "Desktop", "GrokForge-tweet-ready");
  mkdirSync(dir, { recursive: true });
  const out = join(dir, "top-builders-tweet.txt");
  writeFileSync(out, body, "utf8");
  console.log("wrote", out);
  console.log("---");
  console.log(body);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
