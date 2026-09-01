import type { MetadataRoute } from "next";

import { canonicalSiteUrl } from "@/lib/site-identity";

const site = canonicalSiteUrl(
  process.env.NEXTAUTH_URL || process.env.AUTH_URL
);

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/dashboard", "/api/"],
      },
      {
        userAgent: [
          "Twitterbot",
          "facebookexternalhit",
          "Discordbot",
          "Slackbot",
          "LinkedInBot",
          "GPTBot",
          "ClaudeBot",
          "PerplexityBot",
          "OAI-SearchBot",
        ],
        allow: "/",
      },
    ],
    sitemap: `${site}/sitemap.xml`,
  };
}
