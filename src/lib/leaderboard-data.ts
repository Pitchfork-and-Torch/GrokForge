import { prisma } from "@/lib/prisma";
import {
  type LeaderboardWindow,
  type LeaderboardInput,
  rankContributors,
  windowStart,
} from "@/lib/leaderboard";
import { isDemoBotUser, isFounderHandle } from "@/lib/identity";
import { computeStreak } from "@/lib/streaks";

export async function fetchLeaderboard(opts: {
  window?: LeaderboardWindow;
  projectId?: string | null;
  limit?: number;
}) {
  const window = opts.window || "all";
  const since = windowStart(window);
  const projectId = opts.projectId || null;
  const limit = opts.limit ?? 50;

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
  // Never rank seed bots / demo identities
  const users = allUsers.filter((u) => !isDemoBotUser(u));

  const donationWhere = {
    ...(since ? { createdAt: { gte: since } } : {}),
    ...(projectId ? { projectId } : {}),
  };
  const donations = await prisma.donation.groupBy({
    by: ["donorId"],
    where: { ...donationWhere, donorId: { not: null } },
    _sum: { amountCents: true },
  });
  const donationMap = new Map(
    donations
      .filter((d) => d.donorId)
      .map((d) => [d.donorId as string, d._sum.amountCents || 0])
  );

  const contributionWhere = {
    status: "ACCEPTED" as const,
    ...(since ? { createdAt: { gte: since } } : {}),
    ...(projectId ? { task: { projectId } } : {}),
  };
  const contributions = await prisma.contribution.findMany({
    where: contributionWhere,
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

  const reviewWhere = {
    ...(since ? { createdAt: { gte: since } } : {}),
    ...(projectId
      ? { contribution: { task: { projectId } } }
      : {}),
  };
  const reviews = await prisma.contributionReview.groupBy({
    by: ["reviewerId"],
    where: reviewWhere,
    _count: { _all: true },
  });
  const reviewMap = new Map(reviews.map((r) => [r.reviewerId, r._count._all]));

  // Streaks use all-time submission dates (not window-filtered)
  const allSubs = await prisma.contribution.findMany({
    where: {
      userId: { in: users.map((u) => u.id) },
      ...(projectId ? { task: { projectId } } : {}),
    },
    select: { userId: true, createdAt: true },
  });
  const datesByUser = new Map<string, Date[]>();
  for (const s of allSubs) {
    const list = datesByUser.get(s.userId) || [];
    list.push(s.createdAt);
    datesByUser.set(s.userId, list);
  }

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
    streakCurrent: computeStreak(datesByUser.get(u.id) || []).current,
  }));

  return rankContributors(inputs, limit);
}
