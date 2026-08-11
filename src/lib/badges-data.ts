import { prisma } from "@/lib/prisma";
import { isFounderHandle } from "@/lib/identity";
import { computeStreak } from "@/lib/streaks";
import {
  badgeGallery,
  computeBadges,
  type BadgeDef,
  type BadgeInput,
  type BadgeProgress,
} from "@/lib/badges";

async function loadBadgeInput(userId: string): Promise<BadgeInput | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      handle: true,
      createdAt: true,
      projects: { select: { id: true } },
      contributions: {
        select: { status: true, createdAt: true },
      },
      donations: { select: { amountCents: true } },
      reviews: { select: { id: true } },
    },
  });
  if (!user) return null;

  const accepted = user.contributions.filter((c) => c.status === "ACCEPTED");
  const donationCents = user.donations.reduce((s, d) => s + d.amountCents, 0);
  const streak = computeStreak(user.contributions.map((c) => c.createdAt));
  const earlyCutoff = new Date("2026-09-01T00:00:00Z");
  const isPioneer = user.createdAt < earlyCutoff;

  return {
    donationCents,
    acceptedCount: accepted.length,
    reviewCount: user.reviews.length,
    projectCount: user.projects.length,
    currentStreak: streak.current,
    longestStreak: streak.longest,
    isFounder: isFounderHandle(user.handle),
    isPioneer,
  };
}

export async function fetchUserBadges(userId: string): Promise<BadgeDef[]> {
  const input = await loadBadgeInput(userId);
  if (!input) return [];
  return computeBadges(input);
}

export async function fetchUserBadgeGallery(
  userId: string
): Promise<BadgeProgress[]> {
  const input = await loadBadgeInput(userId);
  if (!input) return [];
  return badgeGallery(input);
}

export async function fetchBadgesForUsers(
  userIds: string[]
): Promise<Map<string, BadgeDef[]>> {
  const map = new Map<string, BadgeDef[]>();
  const unique = [...new Set(userIds.filter(Boolean))];
  await Promise.all(
    unique.map(async (id) => {
      map.set(id, await fetchUserBadges(id));
    })
  );
  return map;
}
