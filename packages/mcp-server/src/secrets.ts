/**
 * Secret hygiene: redact tokens and refuse to leak xAI / model keys.
 * GrokForge PATs (gf_) are not treated as xAI secrets by looksLikeXaiKey.
 */

/** Show only a short prefix/suffix so logs never contain a full token. */
export function redactToken(token: string): string {
  if (!token) return "(empty)";
  if (token.length <= 8) return "***";
  return `${token.slice(0, 4)}…${token.slice(-4)} (len=${token.length})`;
}

/**
 * Heuristic detector for xAI / OpenAI-style secret material.
 * Intentionally avoids flagging GrokForge gf_ PATs.
 */
export function looksLikeXaiKey(text: string): boolean {
  if (!text || typeof text !== "string") return false;

  if (/\bxai[_-]?api[_-]?key\b/i.test(text)) return true;
  if (/\bXAI_API_KEY\b/.test(text)) return true;
  if (/\bSUPERGROK[_\s-]?KEY\b/i.test(text)) return true;

  // xai- prefixed secrets (not gf_)
  if (/\bxai-[A-Za-z0-9_-]{16,}\b/.test(text)) return true;

  // sk- model API keys; require enough entropy
  if (/(?<![A-Za-z0-9_])sk-(?:proj-|or-v1-|svcacct-)?[A-Za-z0-9_-]{20,}\b/.test(text)) {
    return true;
  }

  if (/Bearer\s+xai-[A-Za-z0-9_-]{16,}/i.test(text)) return true;
  if (/Bearer\s+sk-[A-Za-z0-9_-]{20,}/i.test(text)) return true;

  return false;
}

/** Raw GrokForge PAT in a deliverable — server secret-scan also rejects these. */
export function looksLikeForgePat(text: string): boolean {
  if (!text || typeof text !== "string") return false;
  return /\bgf_[A-Za-z0-9]{20,}\b/.test(text);
}

/** Throw if body text appears to contain an xAI / model API key or a raw gf_ PAT. */
export function assertNoSecretLeak(body: string): void {
  if (looksLikeXaiKey(body)) {
    throw new Error(
      "Refusing to send body: looks like an xAI / model API key. " +
        "GrokForge only accepts gf_ PATs for auth; never put SuperGrok/xAI keys in submit payloads.",
    );
  }
  if (looksLikeForgePat(body)) {
    throw new Error(
      "Refusing to send body: looks like a raw GrokForge gf_ PAT. " +
        "Keep tokens in GROKFORGE_TOKEN / the MCP env — never in deliverables.",
    );
  }
}
