/**
 * Optional dedicated Stripe Price IDs for compute pot types.
 * When unset, Checkout uses dynamic price_data (amount from form).
 *
 * Env (optional):
 *   STRIPE_PRICE_COMPUTE
 *   STRIPE_PRICE_API_CREDITS
 *   STRIPE_PRICE_SUPERGROK_SPONSOR
 *   STRIPE_PRICE_MATCHING_POOL
 *   STRIPE_PRICE_GENERAL
 */

export type PotTypeKey =
  | "COMPUTE"
  | "API_CREDITS"
  | "SUPERGROK_SPONSOR"
  | "GENERAL"
  | "MATCHING_POOL";

const ENV_MAP: Record<PotTypeKey, string> = {
  COMPUTE: "STRIPE_PRICE_COMPUTE",
  API_CREDITS: "STRIPE_PRICE_API_CREDITS",
  SUPERGROK_SPONSOR: "STRIPE_PRICE_SUPERGROK_SPONSOR",
  GENERAL: "STRIPE_PRICE_GENERAL",
  MATCHING_POOL: "STRIPE_PRICE_MATCHING_POOL",
};

export function stripePriceIdForPotType(
  potType: string | null | undefined
): string | null {
  const key = (potType || "GENERAL").toUpperCase() as PotTypeKey;
  const envName = ENV_MAP[key] || ENV_MAP.GENERAL;
  const id = process.env[envName]?.trim();
  return id || null;
}

/**
 * Build Stripe Checkout line_items: fixed Price ID when configured,
 * else ad-hoc price_data for the requested USD amount.
 */
export function buildCheckoutLineItem(opts: {
  potType?: string | null;
  amountCents: number;
  productName: string;
  productDescription?: string;
  /** When using fixed price IDs, quantity scales $1 units if amount matches; else fallback price_data */
  preferFixedPrice?: boolean;
}):
  | { price: string; quantity: number }
  | {
      price_data: {
        currency: string;
        unit_amount: number;
        product_data: { name: string; description?: string };
      };
      quantity: number;
    } {
  const fixed =
    opts.preferFixedPrice !== false
      ? stripePriceIdForPotType(opts.potType)
      : null;

  // Fixed prices are typically $1 units; quantity = dollars
  if (fixed && opts.amountCents % 100 === 0) {
    const qty = Math.max(1, Math.round(opts.amountCents / 100));
    return { price: fixed, quantity: qty };
  }

  return {
    quantity: 1,
    price_data: {
      currency: "usd",
      unit_amount: opts.amountCents,
      product_data: {
        name: opts.productName.slice(0, 120),
        description: (opts.productDescription || "").slice(0, 400) || undefined,
      },
    },
  };
}

export function stripePricesConfigured(): Record<string, boolean> {
  return Object.fromEntries(
    Object.entries(ENV_MAP).map(([k, env]) => [k, Boolean(process.env[env]?.trim())])
  );
}
