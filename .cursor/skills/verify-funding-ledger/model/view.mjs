// Chart view for FundingLedger.tla, in the words of someone reading the
// project's public ledger and match-pool panel.

const cents = (n) => `$${(n / 100).toFixed(2)}`;

export const state = (v) => {
  const parts = [`pool ${cents(v.pool)}, ${cents(v.remaining)} left to match, pot ${cents(v.potBalance)}`];
  const credits = Object.values(v.credits ?? {});
  if (credits.some((c) => c > 1)) parts.push("one payment on the ledger twice");
  if (v.remaining < 0) parts.push("match pool overdrawn");
  else if (v.matched > v.pool) parts.push("matched more than pledged");
  const pcs = Object.values(v.pc ?? {});
  const going = [];
  if (pcs.includes("pot_commit")) going.push("a Stripe gift");
  if (pcs.includes("demo_pot_commit")) going.push("a demo gift");
  if (pcs.includes("pool_commit")) going.push("a pool top-up");
  if (going.length) parts.push(`${going.join(" and ")} being recorded`);
  return parts.join(" · ");
};

export const group = (v) => (v.remaining < 0 || Object.values(v.credits ?? {}).some((c) => c > 1) ? "Wrong" : v.pool > 0 ? "Matching on" : "No pool");

export const colors = { "No pool": "blue", "Matching on": "teal", Wrong: "orange" };

const mover = (from, to) => Object.keys(from.pc ?? {}).find((s) => from.pc[s] !== to.pc[s]);

export const step = (action, from, to) => {
  const d = mover(from, to);
  switch (action) {
    case "PotRead":
      return to.pc[d] === "done" ? "Stripe re-delivers a gift already recorded; answered as duplicate" : "Stripe delivers a gift to a pot";
    case "PotCommit":
      return to.pc[d] === "idle"
        ? "the gift's row already exists; the insert is refused and Stripe will retry"
        : from.local[d] > 0
          ? "the gift is recorded and matched from the pool"
          : "the gift is recorded";
    case "DemoPotRead":
      return "a signed-in user gives to a pot (demo ledger)";
    case "DemoPotCommit":
      return from.local[d] > 0 ? "the demo gift is recorded and matched from the pool" : "the demo gift is recorded";
    case "PoolRead":
      return to.pc[d] === "done" ? "Stripe re-delivers a top-up already on the ledger; answered as duplicate" : "Stripe delivers a match-pool top-up";
    case "PoolCommit":
      return "the top-up is added to the pool";
    case "DemoPoolCommit":
      return "a signed-in user tops up the pool (demo ledger)";
    default:
      return action;
  }
};

export const title = "GrokForge project funding: gifts, matching, webhook retries";
