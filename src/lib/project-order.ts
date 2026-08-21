/**
 * Public project list ordering.
 * Founder-curated displayOrder (lower = higher), then newest.
 */
export const PROJECT_LIST_ORDER = [
  { displayOrder: "asc" as const },
  { createdAt: "desc" as const },
];

export type ProjectOrderRow = {
  id: string;
  slug: string;
  title: string;
  status: string;
  displayOrder: number;
  createdAt: Date;
};
