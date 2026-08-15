import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Twitter from "next-auth/providers/twitter";
import GitHub from "next-auth/providers/github";
import { PrismaAdapter } from "@auth/prisma-adapter";
import type { AdapterUser } from "@auth/core/adapters";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  persistOAuthDisplayName,
  rejectSignupIdentity,
} from "@/lib/secret-scan";

const credentialsSchema = z.object({
  mode: z.enum(["email", "x-demo"]).default("email"),
  email: z.string().email().optional(),
  password: z.string().min(6).optional(),
  handle: z.string().min(2).max(32).optional(),
  name: z.string().min(1).max(80).optional(),
});

const demoAuthEnabled =
  process.env.ENABLE_DEMO_AUTH === "true" ||
  process.env.NODE_ENV === "development";

const twitterId =
  process.env.AUTH_TWITTER_ID ||
  process.env.TWITTER_CLIENT_ID ||
  process.env.TWITTER_ID ||
  "";
const twitterSecret =
  process.env.AUTH_TWITTER_SECRET ||
  process.env.TWITTER_CLIENT_SECRET ||
  process.env.TWITTER_SECRET ||
  "";

const providers = [];

if (twitterId && twitterSecret) {
  providers.push(
    Twitter({
      clientId: twitterId,
      clientSecret: twitterSecret,
      // Request username so we can set handle after account create
      userinfo: "https://api.x.com/2/users/me?user.fields=profile_image_url,username",
    })
  );
}

const githubId =
  process.env.AUTH_GITHUB_ID || process.env.GITHUB_ID || process.env.GITHUB_CLIENT_ID || "";
const githubSecret =
  process.env.AUTH_GITHUB_SECRET ||
  process.env.GITHUB_SECRET ||
  process.env.GITHUB_CLIENT_SECRET ||
  "";

if (githubId && githubSecret) {
  providers.push(
    GitHub({
      clientId: githubId,
      clientSecret: githubSecret,
      allowDangerousEmailAccountLinking: true,
    })
  );
}

providers.push(
  Credentials({
    id: "credentials",
    name: "Email",
    credentials: {
      mode: { label: "Mode", type: "text" },
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
      handle: { label: "Handle", type: "text" },
      name: { label: "Name", type: "text" },
    },
    async authorize(raw) {
      const parsed = credentialsSchema.safeParse(raw);
      if (!parsed.success) return null;
      const data = parsed.data;

      // Demo X stand-in - local/dev or ENABLE_DEMO_AUTH=true only
      if (data.mode === "x-demo") {
        if (!demoAuthEnabled) return null;
        const handle = (data.handle || "grokforge_demo").replace(/^@/, "");
        const email = `${handle.toLowerCase()}@x-demo.grokforge.local`;
        let user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
          const leak = rejectSignupIdentity(data.name, handle);
          if (leak) return null;
          user = await prisma.user.create({
            data: {
              email,
              name: data.name || handle,
              handle,
              image: `https://api.dicebear.com/9.x/shapes/svg?seed=${encodeURIComponent(handle)}`,
              capacityNotes: "Demo capacity: ~50k tokens / day for greater-good tasks",
              reputation: 10,
            },
          });
        }
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        };
      }

      if (!data.email || !data.password) return null;

      const existing = await prisma.user.findUnique({
        where: { email: data.email },
      });

      if (!existing) {
        const handleBase =
          data.handle?.replace(/^@/, "") ||
          data.email.split("@")[0].replace(/[^a-zA-Z0-9_]/g, "").slice(0, 24) ||
          "builder";
        const leak = rejectSignupIdentity(data.name, handleBase);
        if (leak) return null;
        let handle = handleBase;
        let n = 0;
        while (await prisma.user.findUnique({ where: { handle } })) {
          n += 1;
          handle = `${handleBase}${n}`;
        }
        const passwordHash = await bcrypt.hash(data.password, 10);
        const user = await prisma.user.create({
          data: {
            email: data.email,
            name: data.name || handle,
            handle,
            passwordHash,
            reputation: 0,
            capacityNotes: "Tell the community your available bandwidth",
          },
        });
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        };
      }

      if (!existing.passwordHash) return null;
      const ok = await bcrypt.compare(data.password, existing.passwordHash);
      if (!ok) return null;
      return {
        id: existing.id,
        email: existing.email,
        name: existing.name,
        image: existing.image,
      };
    },
  })
);

async function ensureUniqueHandle(base: string, userId: string): Promise<string> {
  let handle = base.replace(/^@/, "").replace(/[^a-zA-Z0-9_]/g, "").slice(0, 32) || "user";
  const seed = handle;
  let n = 0;
  while (true) {
    const hit = await prisma.user.findUnique({ where: { handle } });
    if (!hit || hit.id === userId) return handle;
    n += 1;
    handle = `${seed.slice(0, 28)}${n}`;
  }
}

/** Pull X username / avatar from Auth.js profile (raw X v2 shape or flat). */
function twitterProfileBits(
  profile: unknown,
  fallback?: { name?: string | null; image?: string | null }
) {
  const p = profile as Record<string, unknown> | undefined;
  const data = (p?.data as Record<string, unknown> | undefined) || p || {};
  const username =
    (data.username as string | undefined) ||
    (data.screen_name as string | undefined) ||
    (p?.username as string | undefined) ||
    "";
  const image =
    (data.profile_image_url as string | undefined) ||
    (data.profile_image_url_https as string | undefined) ||
    fallback?.image ||
    null;
  const name =
    (data.name as string | undefined) || fallback?.name || username || null;
  return { username, image, name };
}

/**
 * Enrich DB user with X handle after adapter create/link.
 * MUST NOT run in callbacks.signIn for first-time OAuth: Auth.js calls signIn
 * before createUser, with a temporary UUID that is not in Postgres yet. An
 * update there throws and Auth.js maps it to AccessDenied.
 */
async function enrichTwitterUser(
  userId: string,
  profile: unknown,
  fallback?: { name?: string | null; image?: string | null }
) {
  const existing = await prisma.user.findUnique({ where: { id: userId } });
  if (!existing) return;

  const { username, image, name } = twitterProfileBits(profile, fallback);
  const data: {
    handle?: string;
    name?: string;
    image?: string;
  } = {};

  const safeName = persistOAuthDisplayName(name);
  if (username) {
    data.handle = await ensureUniqueHandle(username, userId);
    data.name = safeName || data.handle;
  } else if (safeName && !existing.name) {
    data.name = safeName;
  }

  if (image) {
    data.image = image.replace("_normal", "_400x400");
  }

  if (Object.keys(data).length === 0) return;
  await prisma.user.update({ where: { id: userId }, data });

  // Keep Live Forge X-builder counter in sync after successful X enrich
  try {
    const { refreshXBuilders } = await import("@/lib/site-stats");
    await refreshXBuilders();
  } catch {
    /* non-fatal */
  }
}

const prismaAdapter = PrismaAdapter(prisma);

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: {
    ...prismaAdapter,
    async createUser(data: AdapterUser) {
      return prismaAdapter.createUser!({
        ...data,
        name: persistOAuthDisplayName(data.name),
      });
    },
  } as never,
  session: { strategy: "jwt" },
  trustHost: true,
  pages: {
    signIn: "/login",
    // Surface Auth.js errors on our login UI instead of blank AccessDenied page
    error: "/login",
  },
  providers,
  callbacks: {
    /**
     * First-time X login: user.id is a temp UUID not yet in the DB.
     * Returning users: userByAccount is the real row.
     * Never throw here - Auth.js converts throws into AccessDenied.
     */
    async signIn({ user, account }) {
      if (account?.provider !== "twitter") return true;
      try {
        if (!user?.id) return true;
        const existing = await prisma.user.findUnique({
          where: { id: user.id },
          select: { id: true },
        });
        // First-time OAuth: row not created yet. Allow; enrich in events.signIn.
        if (!existing) return true;
      } catch (err) {
        console.error("[auth] twitter signIn check failed (allowing)", err);
      }
      return true;
    },
    async jwt({ token, user, account, profile, trigger }) {
      if (user?.id) {
        token.sub = user.id;
      }
      // After adapter create/link, user.id is real. Enrich handle here so first JWT has it.
      if (account?.provider === "twitter" && user?.id && profile) {
        try {
          await enrichTwitterUser(user.id, profile, {
            name: user.name,
            image: user.image,
          });
        } catch (err) {
          console.error("[auth] twitter enrich in jwt failed", err);
        }
      }
      if (account?.provider === "github" && user?.id && profile) {
        try {
          const login =
            (profile as { login?: string }).login ||
            (profile as { name?: string }).name ||
            "";
          const gh = String(login)
            .replace(/^@/, "")
            .replace(/[^A-Za-z0-9-]/g, "")
            .slice(0, 39);
          if (gh) {
            await prisma.user.update({
              where: { id: user.id },
              data: { githubHandle: gh },
            });
          }
        } catch (err) {
          console.error("[auth] github enrich in jwt failed", err);
        }
      }
      // Refresh profile fields on sign-in and periodically
      if (token.sub && (user || trigger === "signIn" || trigger === "signUp" || !token.handle)) {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: token.sub },
            select: {
              id: true,
              handle: true,
              reputation: true,
              name: true,
              image: true,
              email: true,
            },
          });
          if (dbUser) {
            token.handle = dbUser.handle;
            token.reputation = dbUser.reputation;
            token.name = dbUser.name;
            token.picture = dbUser.image;
            token.email = dbUser.email;
          }
        } catch (err) {
          console.error("[auth] jwt user lookup failed", err);
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
        session.user.handle = (token.handle as string) || null;
        session.user.reputation = (token.reputation as number) || 0;
      }
      return session;
    },
  },
  events: {
    // Runs AFTER adapter createUser/linkAccount - user.id is a real DB id
    async signIn({ user, account, profile }) {
      if (account?.provider !== "twitter" || !user?.id) return;
      try {
        await enrichTwitterUser(user.id, profile, {
          name: user.name,
          image: user.image,
        });
      } catch (err) {
        console.error("[auth] twitter enrich after signIn failed", err);
      }
    },
  },
});

/** Exported for login UI feature flags (no secrets). */
export const authFlags = {
  twitterConfigured: Boolean(twitterId && twitterSecret),
  githubConfigured: Boolean(githubId && githubSecret),
  demoAuthEnabled: demoAuthEnabled,
};
