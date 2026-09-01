import type { Metadata } from "next";
import type { Session } from "next-auth";
import { Geist_Mono } from "next/font/google";
import "./globals.css";
import { headers } from "next/headers";
import { Providers } from "@/components/providers";
import { AppChrome } from "@/components/app-chrome";
import { ThemePanel } from "@/components/theme-panel";
import type { BellItem } from "@/components/notification-bell";
import { auth } from "@/lib/auth";
import { prisma, probeDatabase } from "@/lib/prisma";
import { bumpVisitor } from "@/lib/site-stats";
import { ForgeOfflineBanner } from "@/components/forge-offline-banner";
import {
  APP_VERSION,
  canonicalSiteUrl,
  ogImagePath,
  siteGraphJsonLd,
} from "@/lib/site-identity";

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl = canonicalSiteUrl(
  process.env.NEXTAUTH_URL || process.env.AUTH_URL
);

/** Auth + notifications always need a request context */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "GrokForge - Crowdsource multi-agent work for the greater good",
  description:
    "Transparent platform for hierarchical multi-agent tasks, open-license projects, and funding Grok-powered public goods. Sign in with X. Obsidian Amber.",
  alternates: {
    canonical: siteUrl,
    types: {
      "text/plain": `${siteUrl}/llms.txt`,
    },
  },
  openGraph: {
    title: "GrokForge - multi-agent work that ships in public",
    description:
      "Claim hierarchical Grok-powered leaves. Public ledgers. Open licenses. Never stores user API keys.",
    url: siteUrl,
    siteName: "GrokForge",
    type: "website",
    locale: "en_US",
    images: [
      {
        url: ogImagePath(APP_VERSION),
        width: 1200,
        height: 630,
        alt: "GrokForge - Obsidian Amber multi-agent crowdfunding for the greater good",
        type: "image/jpeg",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: "@suddenlyjon",
    creator: "@suddenlyjon",
    title: "GrokForge - multi-agent work that ships in public",
    description:
      "Claim hierarchical Grok-powered leaves. Public ledgers. Open licenses. Sign in with X.",
    images: [ogImagePath(APP_VERSION)],
  },
};

export const viewport = {
  themeColor: "#050505",
};


export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Soft-fail when AUTH_SECRET is missing at build (Vercel env lag) so static
  // shells like robots.txt still compile; pages that need auth still work at runtime.
  let session: Session | null = null;
  try {
    session = await auth();
  } catch (err) {
    console.warn("[layout] auth() unavailable during render", err);
  }

  let notifications: BellItem[] = [];
  let unreadCount = 0;
  let themePref: string | null = null;
  let profileHref: string | null = null;
  if (session?.user?.id) {
    try {
      const rows = await prisma.notification.findMany({
        where: { userId: session.user.id },
        orderBy: { createdAt: "desc" },
        take: 12,
        select: {
          id: true,
          title: true,
          body: true,
          href: true,
          read: true,
          createdAt: true,
        },
      });
      notifications = rows.map((n) => ({
        id: n.id,
        title: n.title,
        body: n.body,
        href: n.href,
        read: n.read,
        createdAt: n.createdAt.toISOString().slice(0, 16).replace("T", " "),
      }));
      unreadCount = rows.filter((n) => !n.read).length;
      // Prefer accurate unread even if older than 12
      unreadCount = await prisma.notification.count({
        where: { userId: session.user.id, read: false },
      });
      const u = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { themePref: true, handle: true },
      });
      themePref = u?.themePref || null;
      if (u?.handle) profileHref = `/u/${u.handle}`;
    } catch (err) {
      console.warn("[layout] notifications unavailable", err);
    }
  }

  // Live visitor counter (rate-limited per coarse IP hash)
  try {
    const h = await headers();
    const ip =
      h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      h.get("x-real-ip") ||
      "anon";
    await bumpVisitor(ip);
  } catch {
    /* non-fatal */
  }

  const dbProbe = await probeDatabase();

  const jsonLd = siteGraphJsonLd(siteUrl);
  return (
    <html lang="en" className="dark" data-theme="amber">
      <body className={`${geistMono.variable} antialiased font-sans`}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <Providers>
          <a href="#main" className="sr-only">
            Skip to content
          </a>

          <AppChrome
            user={session?.user}
            notifications={notifications}
            unreadCount={unreadCount}
            profileHref={profileHref}
          >
            {dbProbe.ok ? null : <ForgeOfflineBanner quota={dbProbe.quota} />}
            {children}
          </AppChrome>
          <ThemePanel
            signedIn={!!session?.user}
            initialTheme={themePref}
          />
        </Providers>
      </body>
    </html>
  );
}

