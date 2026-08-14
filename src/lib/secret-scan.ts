/**
 * Block secrets in contribution bodies and public paste surfaces.
 */

const PATTERNS: { re: RegExp; label: string }[] = [
  { re: /\bghp_[A-Za-z0-9]{20,}\b/g, label: "GitHub PAT (ghp_)" },
  { re: /\bgithub_pat_[A-Za-z0-9_]{20,}\b/g, label: "GitHub fine-grained PAT" },
  { re: /\bgho_[A-Za-z0-9]{20,}\b/g, label: "GitHub OAuth token" },
  { re: /\bghu_[A-Za-z0-9]{20,}\b/g, label: "GitHub user token" },
  { re: /\bsk-[A-Za-z0-9]{20,}\b/g, label: "API key (sk-)" },
  { re: /\bsk_live_[A-Za-z0-9]{20,}\b/g, label: "Stripe live secret key" },
  { re: /\bsk_test_[A-Za-z0-9]{20,}\b/g, label: "Stripe test secret key" },
  { re: /\brk_live_[A-Za-z0-9]{20,}\b/g, label: "Stripe restricted key" },
  { re: /\bwhsec_[A-Za-z0-9]{20,}\b/g, label: "Stripe webhook secret" },
  { re: /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/g, label: "Slack token" },
  { re: /\bxai-[A-Za-z0-9]{20,}\b/gi, label: "xAI-style key" },
  { re: /\bgf_[A-Za-z0-9]{20,}\b/g, label: "GrokForge PAT (do not paste raw tokens)" },
  { re: /\bAKIA[0-9A-Z]{16}\b/g, label: "AWS access key" },
  { re: /-----BEGIN (RSA |OPENSSH |EC )?PRIVATE KEY-----/g, label: "Private key block" },
  { re: /\bvercel_[A-Za-z0-9]{20,}\b/g, label: "Vercel token" },
  {
    re: /postgres(?:ql)?:\/\/[^\s/:]+:[^\s/@]+@/gi,
    label: "PostgreSQL URL with password",
  },
];

export function scanForSecrets(text: string): { ok: true } | { ok: false; hits: string[] } {
  const hits: string[] = [];
  for (const p of PATTERNS) {
    if (p.re.test(text)) hits.push(p.label);
    p.re.lastIndex = 0;
  }
  if (hits.length) return { ok: false, hits: [...new Set(hits)] };
  return { ok: true };
}

/** Shared reject shape for UI actions + Agent API writers of public paste. */
export function rejectSecretPaste(text: string): { error: string } | null {
  const scan = scanForSecrets(text);
  if (scan.ok) return null;
  return {
    error: `Secret scan failed: remove ${scan.hits.join(", ")}. Never paste PATs or API keys.`,
  };
}

/** Persist-safe public text: keep clean paste, drop a secret hit (do not fail the writer). */
export function persistPublicPaste(text: string | null | undefined): string | null {
  const t = (text || "").trim();
  if (!t) return null;
  return rejectSecretPaste(t) ? null : t;
}
