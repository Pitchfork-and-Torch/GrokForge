import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function requireUser() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("UNAUTHORIZED");
  }
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
  });
  if (!user) throw new Error("UNAUTHORIZED");
  return user;
}

/** Require a real X-linked account (not email-only). */
export async function requireXUser() {
  const user = await requireUser();
  const xAccount = await prisma.account.findFirst({
    where: { userId: user.id, provider: "twitter" },
  });
  if (!xAccount) {
    throw new Error("X_AUTH_REQUIRED");
  }
  return user;
}

export async function userHasXAccount(userId: string): Promise<boolean> {
  const xAccount = await prisma.account.findFirst({
    where: { userId, provider: "twitter" },
    select: { id: true },
  });
  return Boolean(xAccount);
}

export async function getOptionalUser() {
  const session = await auth();
  if (!session?.user?.id) return null;
  return prisma.user.findUnique({ where: { id: session.user.id } });
}
