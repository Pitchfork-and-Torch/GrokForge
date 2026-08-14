import { isIP } from "node:net";

/** Max persisted / fired user webhook URL length. */
export const MAX_WEBHOOK_URL_LENGTH = 500;

export type PublicHttpsWebhookUrlResult =
  | { ok: true; url: string }
  | { ok: false; error: string };

const BLOCKED_HOSTS = new Set([
  "localhost",
  "metadata",
  "metadata.google.internal",
  "metadata.google.com",
  "instance-data",
  "kubernetes.default",
  "kubernetes.default.svc",
  "kubernetes.default.svc.cluster.local",
]);

const BLOCKED_SUFFIXES = [
  ".localhost",
  ".local",
  ".internal",
  ".intranet",
  ".lan",
  ".home",
  ".corp",
  ".private",
  ".nip.io",
  ".sslip.io",
  ".xip.io",
  ".localtest.me",
  ".lvh.me",
  ".vcap.me",
];

function fail(error: string): PublicHttpsWebhookUrlResult {
  return { ok: false, error };
}

function stripTrailingDots(host: string): string {
  return host.replace(/\.+$/, "");
}

function stripIpv6Brackets(host: string): string {
  return host.startsWith("[") && host.endsWith("]")
    ? host.slice(1, -1)
    : host;
}

function parseIpv4Octets(host: string): number[] | null {
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(host);
  if (!m) return null;
  const octets = [m[1], m[2], m[3], m[4]].map(Number);
  if (octets.some((n) => n > 255)) return null;
  return octets;
}

/** RFC1918, loopback, link-local, unspecified, CGNAT, multicast/reserved. */
export function isBlockedIpv4(octets: number[]): boolean {
  const [a, b] = octets;
  if (a === 0) return true;
  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  if (a >= 224) return true;
  return false;
}

function parseIpv6Hextets(ip: string): number[] | null {
  const raw = ip.toLowerCase();
  if (raw.includes("%")) return null;

  let s = raw;
  const dotted = s.match(/:(\d{1,3}(?:\.\d{1,3}){3})$/);
  if (dotted) {
    const oct = parseIpv4Octets(dotted[1]);
    if (!oct) return null;
    const hi = ((oct[0] << 8) | oct[1]).toString(16);
    const lo = ((oct[2] << 8) | oct[3]).toString(16);
    s = `${s.slice(0, -dotted[1].length)}${hi}:${lo}`;
  }

  if ((s.match(/::/g) || []).length > 1) return null;
  const parts = s.split("::");
  const left = parts[0] ? parts[0].split(":") : [];
  const right =
    parts.length === 2 ? (parts[1] ? parts[1].split(":") : []) : [];
  if (parts.length === 1) {
    if (left.length !== 8) return null;
    return hextetsOrNull(left);
  }
  const missing = 8 - left.length - right.length;
  if (missing < 0) return null;
  return hextetsOrNull([...left, ...Array(missing).fill("0"), ...right]);
}

function hextetsOrNull(parts: string[]): number[] | null {
  const out: number[] = [];
  for (const p of parts) {
    if (!/^[0-9a-f]{1,4}$/.test(p)) return null;
    out.push(parseInt(p, 16));
  }
  return out.length === 8 ? out : null;
}

function ipv4FromMapped(hextets: number[]): number[] | null {
  const mapped =
    hextets[0] === 0 &&
    hextets[1] === 0 &&
    hextets[2] === 0 &&
    hextets[3] === 0 &&
    hextets[4] === 0 &&
    hextets[5] === 0xffff;
  const compat =
    hextets[0] === 0 &&
    hextets[1] === 0 &&
    hextets[2] === 0 &&
    hextets[3] === 0 &&
    hextets[4] === 0 &&
    hextets[5] === 0 &&
    !(hextets[6] === 0 && hextets[7] <= 1);
  if (!mapped && !compat) return null;
  return [(hextets[6] >> 8) & 0xff, hextets[6] & 0xff, (hextets[7] >> 8) & 0xff, hextets[7] & 0xff];
}

export function isBlockedIpv6(ip: string): boolean {
  const hextets = parseIpv6Hextets(ip);
  if (!hextets) return true;
  if (hextets.every((h) => h === 0)) return true;
  if (hextets.slice(0, 7).every((h) => h === 0) && hextets[7] === 1) return true;
  if ((hextets[0] & 0xffc0) === 0xfe80) return true;
  if ((hextets[0] & 0xfe00) === 0xfc00) return true;
  if ((hextets[0] & 0xff00) === 0xff00) return true;
  const mapped = ipv4FromMapped(hextets);
  if (mapped && isBlockedIpv4(mapped)) return true;
  return false;
}

function hostnameHasEmbeddedPrivateIpv4(host: string): boolean {
  const labels = host.split(".");
  for (let i = 0; i <= labels.length - 4; i++) {
    const maybe = labels.slice(i, i + 4).join(".");
    const octets = parseIpv4Octets(maybe);
    if (octets && isBlockedIpv4(octets)) return true;
  }
  return false;
}

function isBlockedHostname(host: string): boolean {
  const h = stripTrailingDots(host).toLowerCase();
  if (!h) return true;
  if (BLOCKED_HOSTS.has(h)) return true;
  if (BLOCKED_SUFFIXES.some((s) => h.endsWith(s))) return true;
  if (hostnameHasEmbeddedPrivateIpv4(h)) return true;

  const ipHost = stripIpv6Brackets(h);
  const kind = isIP(ipHost);
  if (kind === 4) {
    const octets = parseIpv4Octets(ipHost);
    return !octets || isBlockedIpv4(octets);
  }
  if (kind === 6) return isBlockedIpv6(ipHost);

  // Single-label names resolve via search domains (often internal).
  if (!h.includes(".")) return true;
  return false;
}

/**
 * Public-HTTPS allowlist for user-controlled webhooks (save + fire).
 * No DNS lookup — host/IP checks only.
 */
export function checkPublicHttpsWebhookUrl(
  raw: string
): PublicHttpsWebhookUrlResult {
  const trimmed = (raw || "").trim();
  if (!trimmed) return fail("Webhook URL is required");
  if (trimmed.length > MAX_WEBHOOK_URL_LENGTH) {
    return fail("Webhook URL is too long");
  }
  if (/[\u0000-\u001f\u007f\\]/.test(trimmed)) {
    return fail("Webhook URL contains invalid characters");
  }
  if (trimmed.includes("#")) {
    return fail("Webhook URL must not include a fragment");
  }
  if (!/^https:\/\//i.test(trimmed)) {
    return fail("Webhook must be https://");
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return fail("Invalid webhook URL");
  }

  if (parsed.protocol !== "https:") {
    return fail("Webhook must be https://");
  }
  if (parsed.username || parsed.password) {
    return fail("Webhook URL must not include credentials");
  }
  if (parsed.hash) {
    return fail("Webhook URL must not include a fragment");
  }
  if (isBlockedHostname(parsed.hostname)) {
    return fail(
      "Webhook host must be a public HTTPS address (no localhost, private, or metadata hosts)"
    );
  }

  return { ok: true, url: parsed.href };
}
