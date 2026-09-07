import { NextResponse } from "next/server";
import { authFlags } from "@/lib/auth";
import { rateLimitBackend } from "@/lib/rate-limit";

/** Public feature flags for login UI - no secrets. */
export async function GET() {
  return NextResponse.json({
    ...authFlags,
    stripeConfigured: Boolean(process.env.STRIPE_SECRET_KEY?.trim()),
    rateLimitBackend: rateLimitBackend(),
    notifyWebhook: Boolean(process.env.NOTIFY_WEBHOOK_URL?.trim()),
    notifyFormat: (
      process.env.NOTIFY_WEBHOOK_FORMAT ||
      (process.env.NOTIFY_WEBHOOK_URL?.includes("/send") ? "agent-email" : "json")
    ).toLowerCase(),
    claimExpireCron: Boolean(process.env.CRON_SECRET?.trim()),
    features: {
      watches: true,
      openTasksBoard: true,
      notifications: true,
      commentReports: true,
      contributionReceipts: true,
      streaks: true,
      claimAutoExpire: true,
    },
  });
}
