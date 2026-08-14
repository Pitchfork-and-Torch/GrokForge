import type { MetadataRoute } from "next";

const site =
  process.env.NEXTAUTH_URL?.replace(/\/$/, "") ||
  process.env.AUTH_URL?.replace(/\/$/, "") ||
  "https://grokforge.app";

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
