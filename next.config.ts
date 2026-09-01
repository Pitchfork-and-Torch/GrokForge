import type { NextConfig } from "next";
import { wwwToApexRedirects } from "./src/lib/site-identity";

const securityHeaders = [
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      // Contribution / banner images: twimg avatars, Vercel Blob, plus CDNs
      // ContentBody already recognizes (imgur, GitHub user content).
      "img-src 'self' data: blob: https://pbs.twimg.com https://abs.twimg.com https://api.dicebear.com https://*.public.blob.vercel-storage.com https://*.blob.vercel-storage.com https://i.imgur.com https://imgur.com https://raw.githubusercontent.com https://user-images.githubusercontent.com https://*.githubusercontent.com",
      "font-src 'self' data:",
      "connect-src 'self' https://api.x.com https://x.com https://api.stripe.com",
      "frame-ancestors 'self'",
      "base-uri 'self'",
      "form-action 'self' https://x.com https://twitter.com https://api.x.com",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  // Native ws + Neon driver must not be bundled into Server Components.
  serverExternalPackages: [
    "@neondatabase/serverless",
    "@prisma/adapter-neon",
    "ws",
  ],
  // Banner uploads (client-resized ~900KB) need headroom above the 1MB default.
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "pbs.twimg.com" },
      { protocol: "https", hostname: "abs.twimg.com" },
      { protocol: "https", hostname: "api.dicebear.com" },
      { protocol: "https", hostname: "*.public.blob.vercel-storage.com" },
      { protocol: "https", hostname: "*.blob.vercel-storage.com" },
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
  async redirects() {
    return wwwToApexRedirects();
  },
};

export default nextConfig;
