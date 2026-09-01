import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  APEX_ORIGIN,
  APP_VERSION,
  FOUNDER,
  apexUrlForWwwPath,
  canonicalSiteUrl,
  founderPersonJsonLd,
  isAuthCallbackPath,
  ogImagePath,
  requestHostname,
  shouldRedirectWww,
  siteGraphJsonLd,
  wwwToApexRedirects,
} from "../site-identity";

function readRepo(rel: string): string {
  return readFileSync(resolve(process.cwd(), rel), "utf8");
}

describe("product version 2.4.0", () => {
  it("is one advertised number across package, llms, openapi, and identity", () => {
    expect(APP_VERSION).toBe("2.4.0");
    const pkg = JSON.parse(readRepo("package.json")) as { version: string };
    expect(pkg.version).toBe(APP_VERSION);

    const llms = readRepo("public/llms.txt");
    expect(llms).toContain(`Version: ${APP_VERSION}`);
    expect(llms).toContain(`og.jpg?v=${APP_VERSION}`);
    expect(llms).not.toMatch(/Version:\s*2\.3\.0/);
    expect(llms).toContain(FOUNDER.name);

    const openapi = JSON.parse(readRepo("public/openapi-agent-v1.json")) as {
      info: { "x-product-version"?: string };
    };
    expect(openapi.info["x-product-version"]).toBe(APP_VERSION);
  });

  it("og cache-bust path matches APP_VERSION", () => {
    expect(ogImagePath()).toBe("/og.jpg?v=2.4.0");
  });
});

describe("founder identity (Jon Bailey, musician/maker)", () => {
  it("names Jon Bailey and disambiguates the actor", () => {
    expect(FOUNDER.name).toBe("Jon Bailey");
    expect(FOUNDER.handle).toBe("SuddenlyJon");
    expect(FOUNDER.jobTitle.toLowerCase()).toContain("musician");
    expect(FOUNDER.jobTitle.toLowerCase()).toContain("maker");
    expect(FOUNDER.description).toContain("Not Jonathan Bailey the actor");
    expect(FOUNDER.description.toLowerCase()).not.toContain("epic voice");
    expect(FOUNDER.org).toBe("Pitchfork-and-Torch");
  });

  it("Person JSON-LD is on the site graph (homepage inherits layout)", () => {
    const person = founderPersonJsonLd();
    expect(person["@type"]).toBe("Person");
    expect(person.name).toBe("Jon Bailey");
    expect(person.jobTitle).toBe("Musician and maker");
    expect(person.sameAs).toContain("https://x.com/suddenlyjon");
    expect(person.sameAs).toContain("https://grokforge.app/u/SuddenlyJon");
    expect(JSON.stringify(person).toLowerCase()).not.toContain("epic voice");

    const graph = siteGraphJsonLd();
    expect(JSON.stringify(graph)).not.toContain("localhost");
    const types = graph["@graph"].map((n) => n["@type"]);
    expect(types).toContain("Person");
    expect(types).toContain("WebApplication");
    const app = graph["@graph"].find((n) => n["@type"] === "WebApplication") as {
      softwareVersion: string;
      author: { "@id": string };
    };
    expect(app.softwareVersion).toBe("2.4.0");
    expect(app.author["@id"]).toBe(person["@id"]);
  });

  it("homepage FAQ names the founder", () => {
    const faq = readRepo("src/components/home-faq.tsx");
    expect(faq).toContain("Jon Bailey");
    expect(faq).toContain("musician and maker");
    expect(faq).toMatch(/not Jonathan Bailey the actor/i);
  });
});

describe("www → apex canonical", () => {
  it("redirects marketing www paths and skips Auth.js callbacks", () => {
    expect(shouldRedirectWww("www.grokforge.app", "/")).toBe(true);
    expect(shouldRedirectWww("www.grokforge.app", "/llms.txt")).toBe(true);
    expect(shouldRedirectWww("www.grokforge.app", "/projects")).toBe(true);
    expect(shouldRedirectWww("WWW.GROKFORGE.APP:443", "/about")).toBe(true);
    expect(shouldRedirectWww("www.grokforge.app", "/api/auth/callback/twitter")).toBe(
      false
    );
    expect(shouldRedirectWww("www.grokforge.app", "/api/auth")).toBe(false);
    expect(shouldRedirectWww("grokforge.app", "/")).toBe(false);
    expect(shouldRedirectWww("localhost", "/")).toBe(false);
  });

  it("builds apex URLs and next.config redirect rules", () => {
    expect(apexUrlForWwwPath("/about", "?x=1")).toBe(
      "https://grokforge.app/about?x=1"
    );
    expect(isAuthCallbackPath("/api/auth/session")).toBe(true);
    expect(requestHostname("www.grokforge.app, grokforge.app")).toBe(
      "www.grokforge.app"
    );

    const rules = wwwToApexRedirects();
    expect(rules.every((r) => r.permanent === true)).toBe(true);
    expect(rules.every((r) => r.has[0].value === "www.grokforge.app")).toBe(true);
    expect(rules.some((r) => r.source === "/")).toBe(true);
    expect(rules.some((r) => r.source.includes("api/auth"))).toBe(true);
    expect(JSON.stringify(rules)).not.toContain("vercel.com/authorize");
  });

  it("canonicalSiteUrl collapses www and leaves localhost alone", () => {
    expect(canonicalSiteUrl("https://www.grokforge.app/")).toBe(APEX_ORIGIN);
    expect(canonicalSiteUrl("https://grokforge.app")).toBe(APEX_ORIGIN);
    expect(canonicalSiteUrl("http://localhost:3000")).toBe("http://localhost:3000");
    expect(canonicalSiteUrl(null)).toBe(APEX_ORIGIN);
  });
});
