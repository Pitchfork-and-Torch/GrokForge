import type { Metadata } from "next";
import type { Session } from "next-auth";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { headers } from "next/headers";
import { Providers } from "@/components/providers";
import { SiteFooter, SiteHeader } from "@/components/ui";
import { ThemePanel } from "@/components/theme-panel";
import { StickyMobileBar } from "@/components/sticky-mobile-bar";
import type { BellItem } from "@/components/notification-bell";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { bumpVisitor } from "@/lib/site-stats";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl =
  process.env.NEXTAUTH_URL?.replace(/\/$/, "") ||
  process.env.AUTH_URL?.replace(/\/$/, "") ||
  "https://grokforge.app";

/** Auth + notifications always need a request context */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "GrokForge - Crowdsource multi-agent work for the greater good",
  description:
    "Transparent platform for hierarchical multi-agent tasks, open-license projects, and funding Grok-powered public goods. Sign in with X. Obsidian Amber.",
  openGraph: {
    title: "GrokForge - multi-agent work for the greater good",
    description:
      "Crowdsource hierarchical Grok-powered projects. Public ledgers. Open licenses. Leaderboard. Never stores user API keys.",
    url: siteUrl,
    siteName: "GrokForge",
    type: "website",
    images: [
      {
        url: "/og.jpg?v=2.1.0",
        width: 1200,
        height: 630,
        alt: "GrokForge - Obsidian Amber multi-agent crowdfunding for the greater good",
        type: "image/jpeg",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "GrokForge - multi-agent work for the greater good",
    description:
      "Crowdsource hierarchical Grok-powered projects. Public ledgers. Top contributors. Sign in with X.",
    images: ["/og.jpg?v=2.1.0"],
  },
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

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebApplication",
        name: "GrokForge",
        url: siteUrl,
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        description:
          "Crowdsource hierarchical multi-agent work and fund Grok-powered greater-good projects with public ledgers.",
        offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
        author: {
          "@type": "Organization",
          name: "Pitchfork-and-Torch",
          url: "https://github.com/Pitchfork-and-Torch/GrokForge",
        },
      },
      {
        "@type": "Organization",
        name: "GrokForge",
        url: siteUrl,
        logo: `${siteUrl}/logo.svg`,
        sameAs: [
          "https://github.com/Pitchfork-and-Torch/GrokForge",
          "https://x.com/suddenlyjon",
        ],
      },
    ],
  };
  return (
    <html lang="en" className="dark" data-theme="amber">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased font-sans`}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <Providers>
          <a href="#main" className="sr-only">
            Skip to content
          </a>

          <SiteHeader
            user={session?.user}
            notifications={notifications}
            unreadCount={unreadCount}
          />
          <main
            id="main"
            className="mx-auto min-h-[70vh] max-w-6xl px-3 py-5 pb-20 sm:px-4 sm:py-8 sm:pb-8"
          >
            {children}
          </main>
          <SiteFooter signedIn={!!session?.user} />
          <StickyMobileBar
            signedIn={!!session?.user}
            profileHref={profileHref}
          />
          <ThemePanel
            signedIn={!!session?.user}
            initialTheme={themePref}
          />
        </Providers>
      </body>
    </html>
  );
}

