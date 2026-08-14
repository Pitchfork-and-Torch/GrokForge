/**
 * X Money P2P adapter.
 * No public third-party send API yet - deep-link + self-reported ledger.
 * When X ships a Money API, implement XMoneyProvider.nativeSend and set
 * X_MONEY_API_MODE=native with credentials.
 */

export type XMoneySendIntent = {
  recipientHandle: string;
  amountUsd?: number;
  note?: string;
};

export type XMoneyProvider = {
  id: "deeplink" | "native";
  /** Open or invoke the send flow; returns URL or null if in-app native handled it */
  buildSendUrl: (intent: XMoneySendIntent) => string;
  label: string;
};

function cleanHandle(h: string): string {
  return h.replace(/^@/, "").trim();
}

/** Best-effort deep links while X Money stays in-app only. */
export const deeplinkProvider: XMoneyProvider = {
  id: "deeplink",
  label: "Open on X",
  buildSendUrl(intent) {
    const h = cleanHandle(intent.recipientHandle);
    // Profile is the reliable entry; users complete X Money in the X client.
    // Pre-filled compose is a soft assist only.
    if (intent.amountUsd && intent.amountUsd > 0) {
      const text = encodeURIComponent(
        `Sending ~$${intent.amountUsd.toFixed(0)} via X Money for greater-good work on GrokForge${
          intent.note ? `: ${intent.note.slice(0, 80)}` : ""
        }`
      );
      return `https://x.com/intent/tweet?text=${text}`;
    }
    return `https://x.com/${encodeURIComponent(h)}`;
  },
};

/**
 * Placeholder for future official X Money API.
 * Never calls a fake endpoint - falls back to deeplink.
 */
export const nativeProvider: XMoneyProvider = {
  id: "native",
  label: "X Money API (when available)",
  buildSendUrl(intent) {
    // Future: POST to X Money API with vaulted credentials.
    // Until then, same deep-link path keeps the product honest.
    return deeplinkProvider.buildSendUrl(intent);
  },
};

export function getXMoneyProvider(): XMoneyProvider {
  const mode = (process.env.X_MONEY_API_MODE || "deeplink").toLowerCase();
  if (mode === "native" && process.env.X_MONEY_API_KEY?.trim()) {
    return nativeProvider;
  }
  return deeplinkProvider;
}

export function xMoneyNativeReady(): boolean {
  return (
    (process.env.X_MONEY_API_MODE || "").toLowerCase() === "native" &&
    Boolean(process.env.X_MONEY_API_KEY?.trim())
  );
}
