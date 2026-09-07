import { redirect } from "next/navigation";

/** Alias for /leaderboard - brief asked for /leaders. */
export default function LeadersAliasPage() {
  redirect("/leaderboard");
}
