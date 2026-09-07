import { prisma } from "@/lib/prisma";
import { weeklyChallenges, type Challenge } from "@/lib/challenges";

export async function fetchWeeklyChallenges(userId: string): Promise<Challenge[]> {
  try {
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const [acceptedLast7, reviewsLast7, donationsLast7, commentsLast7] =
      await Promise.all([
        prisma.contribution.count({
          where: {
            userId,
            status: "ACCEPTED",
            updatedAt: { gte: since },
          },
        }),
        prisma.contributionReview.count({
          where: { reviewerId: userId, createdAt: { gte: since } },
        }),
        prisma.donation.count({
          where: { donorId: userId, createdAt: { gte: since } },
        }),
        prisma.projectComment.count({
          where: { userId, createdAt: { gte: since } },
        }),
      ]);

    return weeklyChallenges({
      acceptedLast7,
      reviewsLast7,
      donationsLast7,
      commentsLast7,
    });
  } catch (e) {
    console.error("[fetchWeeklyChallenges]", e);
    return [];
  }
}
