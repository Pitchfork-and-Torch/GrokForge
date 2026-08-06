import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const credentialsSchema = z.object({
  mode: z.enum(["email", "x-demo"]).default("email"),
  email: z.string().email().optional(),
  password: z.string().min(6).optional(),
  handle: z.string().min(2).max(32).optional(),
  name: z.string().min(1).max(80).optional(),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma) as never,
  session: { strategy: "jwt" },
  trustHost: true,
  pages: {
    signIn: "/login",
  },

  providers: [
    Credentials({
      id: "credentials",
      name: "Email or X Demo",
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

        // Demo X OAuth stand-in: one click identity for local / MVP demos
        if (data.mode === "x-demo") {
          const handle = (data.handle || "grokforge_demo").replace(/^@/, "");
          const email = `${handle.toLowerCase()}@x-demo.grokforge.local`;
          let user = await prisma.user.findUnique({ where: { email } });
          if (!user) {
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
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user?.id) {
        token.sub = user.id;
      }
      if (token.sub) {
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
});
