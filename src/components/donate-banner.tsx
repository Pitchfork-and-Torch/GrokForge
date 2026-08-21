"use client";

import { useEffect, useState } from "react";

/** Client banner for ?donated=1 / ?canceled=1 after Stripe or return. */
export function DonateBanner({
  donated,
  canceled,
}: {
  donated?: boolean;
  canceled?: boolean;
}) {
  const [show, setShow] = useState(donated || canceled);

  useEffect(() => {
    if (!donated && !canceled) return;
    // Clean query from address bar without reload
    try {
      const u = new URL(window.location.href);
      u.searchParams.delete("donated");
      u.searchParams.delete("canceled");
      window.history.replaceState({}, "", u.pathname + u.search);
    } catch {
      /* ignore */
    }
  }, [donated, canceled]);

  if (!show) return null;

  return (
    <div
      className={
        donated
          ? "rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100"
          : "rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100"
      }
      role="status"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p>
          {donated
            ? "Thank you. Payment received or demo capital recorded - check the public ledger and fund pots."
            : "Checkout canceled. No charge was made. You can try donate again anytime."}
        </p>
        <button
          type="button"
          className="text-xs underline opacity-80 hover:opacity-100"
          onClick={() => setShow(false)}
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
