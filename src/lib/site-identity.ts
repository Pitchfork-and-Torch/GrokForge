/**
 * Product identity advertised to humans, crawlers, and agents.
 * One version number. One founder. Apex host is canonical.
 */

export const APP_VERSION = "2.4.0";
export const APP_VERSION_BLURB =
  "founder identity + www→apex canonical";

export const APEX_HOST = "grokforge.app";
export const WWW_HOST = "www.grokforge.app";
export const APEX_ORIGIN = `https://${APEX_HOST}`;

export const FOUNDER = {
  name: "Jon Bailey",
  givenName: "Jon",
  familyName: "Bailey",
  handle: "SuddenlyJon",
  xHandle: "suddenlyjon",
  jobTitle: "Musician and maker",
  org: "Pitchfork-and-Torch",
  profilePath: "/u/SuddenlyJon",
  hubUrl: "https://jonbailey.xyz/",
  githubOrgUrl: "https://github.com/Pitchfork-and-Torch",
  repoUrl: "https://github.com/Pitchfork-and-Torch/GrokForge",
  xUrl: "https://x.com/suddenlyjon",
  description:
    "Musician and maker. Founder of GrokForge and Pitchfork-and-Torch. Not Jonathan Bailey the actor.",
} as const;

export function ogImagePath(version: string = APP_VERSION): string {
  return `/og.jpg?v=${version}`;
}

/** Prefer apex in production; leave localhost / preview hosts alone. */
export function canonicalSiteUrl(envUrl?: string | null): string {
  const raw = (envUrl || "").trim().replace(/\/$/, "");
  if (!raw) return APEX_ORIGIN;
  try {
    const u = new URL(raw);
    const host = u.hostname.toLowerCase();
    if (host === WWW_HOST || host === APEX_HOST) return APEX_ORIGIN;
    return raw;
  } catch {
    return APEX_ORIGIN;
  }
}

export function requestHostname(hostHeader: string | null | undefined): string {
  const raw = (hostHeader || "").split(",")[0]?.trim().toLowerCase() || "";
  return raw.split(":")[0] || "";
}

export function isAuthCallbackPath(pathname: string): boolean {
  return pathname === "/api/auth" || pathname.startsWith("/api/auth/");
}

export function shouldRedirectWww(host: string, pathname: string): boolean {
  if (requestHostname(host) !== WWW_HOST) return false;
  if (isAuthCallbackPath(pathname)) return false;
  return true;
}

export function apexUrlForWwwPath(pathname: string, search = ""): string {
  const path = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return `${APEX_ORIGIN}${path}${search}`;
}

export type WwwRedirect = {
  source: string;
  has: [{ type: "host"; value: string }];
  destination: string;
  permanent: true;
};

/** next.config.js redirects(): 308 www → apex, skip Auth.js callbacks. */
export function wwwToApexRedirects(): WwwRedirect[] {
  return [
    {
      source: "/",
      has: [{ type: "host", value: WWW_HOST }],
      destination: `${APEX_ORIGIN}/`,
      permanent: true,
    },
    {
      source: "/:path((?!api/auth/).+)",
      has: [{ type: "host", value: WWW_HOST }],
      destination: `${APEX_ORIGIN}/:path`,
      permanent: true,
    },
  ];
}

export function founderPersonJsonLd(siteUrl: string = APEX_ORIGIN) {
  const site = siteUrl.replace(/\/$/, "") || APEX_ORIGIN;
  const id = `${site}/#jon-bailey`;
  return {
    "@type": "Person" as const,
    "@id": id,
    name: FOUNDER.name,
    givenName: FOUNDER.givenName,
    familyName: FOUNDER.familyName,
    alternateName: [`@${FOUNDER.handle}`, FOUNDER.handle],
    url: FOUNDER.hubUrl,
    jobTitle: FOUNDER.jobTitle,
    description: FOUNDER.description,
    identifier: `${site}${FOUNDER.profilePath}`,
    sameAs: [
      FOUNDER.xUrl,
      FOUNDER.githubOrgUrl,
      FOUNDER.hubUrl,
      `${site}${FOUNDER.profilePath}`,
    ],
    affiliation: {
      "@type": "Organization" as const,
      name: FOUNDER.org,
      url: FOUNDER.githubOrgUrl,
    },
  };
}

export function siteGraphJsonLd(siteUrl: string = APEX_ORIGIN) {
  const site = siteUrl.replace(/\/$/, "") || APEX_ORIGIN;
  const person = founderPersonJsonLd(site);
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebApplication",
        name: "GrokForge",
        url: site,
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        description:
          "Crowdsource hierarchical multi-agent work and fund Grok-powered greater-good projects with public ledgers.",
        softwareVersion: APP_VERSION,
        offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
        author: { "@id": person["@id"] },
        creator: { "@id": person["@id"] },
      },
      {
        "@type": "Organization",
        name: "GrokForge",
        url: site,
        logo: `${site}/logo.svg`,
        founder: { "@id": person["@id"] },
        sameAs: [FOUNDER.repoUrl, FOUNDER.xUrl],
      },
      person,
    ],
  };
}
