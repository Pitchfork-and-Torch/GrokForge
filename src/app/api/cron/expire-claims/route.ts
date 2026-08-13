import { NextRequest, NextResponse } from "next/server";
import { expireStaleClaims } from "@/lib/expire-claims";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    // Fail closed in production when secret missing
    if (process.env.VERCEL_ENV === "production") return false;
    return true;
  }
  const auth = req.headers.get("authorization") || "";
  if (auth === `Bearer ${secret}`) return true;
  const q = req.nextUrl.searchParams.get("secret");
  if (q && q === secret) return true;
  // Vercel Cron sends Authorization: Bearer <CRON_SECRET> when configured
  return false;
}

async function run(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const result = await expireStaleClaims({ limit: 50, notify: true });
    if (result.expired > 0) {
      revalidatePath("/tasks");
      revalidatePath("/dashboard");
      revalidatePath("/projects");
    }
    return NextResponse.json({
      ok: true,
      at: new Date().toISOString(),
      ...result,
    });
  } catch (e) {
    console.error("[cron/expire-claims]", e);
    return NextResponse.json({ ok: false, error: "expire failed" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  return run(req);
}

export async function POST(req: NextRequest) {
  return run(req);
}
