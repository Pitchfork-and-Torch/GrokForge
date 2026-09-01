import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { decomposeProjectWithGrok } from "@/lib/grok";
import { rateLimit } from "@/lib/rate-limit";

const bodySchema = z.object({
  title: z.string().min(5).max(120),
  description: z.string().min(40).max(8000),
  category: z.string().min(2).max(40),
  license: z.string().min(2).max(40).default("MIT"),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }

  const rl = rateLimit(`decompose:${session.user.id}`, {
    limit: 8,
    windowMs: 60 * 60 * 1000,
  });
  if (!rl.ok) {
    return NextResponse.json(
      { error: `Rate limit: try again in ${rl.retryAfterSec}s` },
      { status: 429 }
    );
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().formErrors.join("; ") || "Invalid body" },
      { status: 400 }
    );
  }

  const result = await decomposeProjectWithGrok(parsed.data);
  return NextResponse.json(result);
}
