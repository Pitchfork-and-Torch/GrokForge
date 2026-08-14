import { NextRequest, NextResponse } from "next/server";
import { expireStaleClaims } from "@/lib/expire-claims";
import { authorizeCron } from "@/lib/cron-auth";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

async function run(req: NextRequest) {
  if (!authorizeCron(req)) {
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
