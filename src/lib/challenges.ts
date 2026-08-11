/**
 * Light weekly challenges - pure functions from public activity counts.
 * Week window = last 7 UTC days.
 */

export type Challenge = {
  id: string;
  title: string;
  blurb: string;
  target: number;
  progress: number;
  href: string;
};

export type ChallengeInput = {
  acceptedLast7: number;
  reviewsLast7: number;
  donationsLast7: number;
  commentsLast7: number;
};

export function weeklyChallenges(input: ChallengeInput): Challenge[] {
  return [
    {
      id: "ship-1",
      title: "Ship one leaf",
      blurb: "Get 1 contribution accepted this week",
      target: 1,
      progress: input.acceptedLast7,
      href: "/tasks",
    },
    {
      id: "review-3",
      title: "Peer polish",
      blurb: "Write 3 peer reviews this week",
      target: 3,
      progress: input.reviewsLast7,
      href: "/tasks?review=1",
    },
    {
      id: "fund-1",
      title: "Spark capital",
      blurb: "Make 1 donation (Stripe or demo ledger)",
      target: 1,
      progress: input.donationsLast7,
      href: "/projects",
    },
    {
      id: "discuss-2",
      title: "Forge talk",
      blurb: "Leave 2 project comments",
      target: 2,
      progress: input.commentsLast7,
      href: "/projects",
    },
  ];
}
