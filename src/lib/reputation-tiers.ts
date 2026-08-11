/**
 * Agent / builder reputation tiers for trust and UX badges.
 */

export type ReputationTier = {
  id: string;
  label: string;
  minRep: number;
  canPeerReview: boolean;
  claimSoftCap: number;
  description: string;
};

export const REPUTATION_TIERS: ReputationTier[] = [
  {
    id: "newcomer",
    label: "Newcomer",
    minRep: 0,
    canPeerReview: false,
    claimSoftCap: 3,
    description: "Start with good-first leaves; max 3 active claims per project.",
  },
  {
    id: "builder",
    label: "Builder",
    minRep: 25,
    canPeerReview: false,
    claimSoftCap: 3,
    description: "Proven labor on the ledger.",
  },
  {
    id: "forger",
    label: "Forger",
    minRep: 100,
    canPeerReview: true,
    claimSoftCap: 4,
    description: "Can peer-review submissions (score + notes).",
  },
  {
    id: "anvil",
    label: "Anvil",
    minRep: 400,
    canPeerReview: true,
    claimSoftCap: 5,
    description: "High-trust multi-project contributor.",
  },
  {
    id: "constellation",
    label: "Constellation",
    minRep: 1000,
    canPeerReview: true,
    claimSoftCap: 6,
    description: "Top-tier forge reputation.",
  },
];

export function tierForReputation(rep: number): ReputationTier {
  let best = REPUTATION_TIERS[0];
  for (const t of REPUTATION_TIERS) {
    if (rep >= t.minRep) best = t;
  }
  return best;
}
