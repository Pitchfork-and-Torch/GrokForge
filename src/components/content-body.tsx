/**
 * Render contribution / task body text. When the body is an image URL
 * (or markdown image), show the full image so diagrams stay readable.
 */
export function ContentBody({
  body,
  contentType,
  className = "",
  maxHeightClass = "max-h-none",
}: {
  body: string;
  contentType?: string | null;
  className?: string;
  /** Default: no height clip so images stay full size. */
  maxHeightClass?: string;
}) {
  const trimmed = (body || "").trim();
  const ct = (contentType || "").toLowerCase();

  const imageUrl = extractImageUrl(trimmed, ct);
  if (imageUrl) {
    return (
      <div className={`space-y-2 ${className}`}>
        <a
          href={imageUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block overflow-hidden rounded-xl border border-white/10 bg-black/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400"
          title="Open full-size image"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt="Contribution image"
            className="gf-content-img mx-auto block h-auto w-full max-w-full object-contain"
            loading="lazy"
            decoding="async"
          />
        </a>
        {trimmed !== imageUrl && !isBareImageMarkdown(trimmed) && (
          <pre
            className={`prose-invert-lite overflow-auto rounded-xl border border-white/10 bg-black/40 p-3 text-xs ${maxHeightClass}`}
          >
            {body}
          </pre>
        )}
      </div>
    );
  }

  return (
    <pre
      className={`prose-invert-lite overflow-auto rounded-xl border border-white/10 bg-black/40 p-4 text-sm ${maxHeightClass} ${className}`}
    >
      {body}
    </pre>
  );
}

function isBareImageMarkdown(s: string): boolean {
  return /^!\[[^\]]*\]\(\s*https?:\/\/[^)\s]+\s*\)\s*$/i.test(s.trim());
}

function extractImageUrl(body: string, contentType: string): string | null {
  if (
    contentType.includes("image") ||
    contentType === "png" ||
    contentType === "jpg" ||
    contentType === "jpeg" ||
    contentType === "webp" ||
    contentType === "gif"
  ) {
    const u = firstHttpUrl(body);
    if (u && looksLikeImageUrl(u)) return u;
  }

  // Entire body is a single image URL
  if (/^https?:\/\/\S+$/i.test(body) && looksLikeImageUrl(body)) {
    return body;
  }

  // Markdown image only: ![alt](url)
  const md = body.match(/^!\[[^\]]*\]\(\s*(https?:\/\/[^)\s]+)\s*\)\s*$/i);
  if (md?.[1] && looksLikeImageUrl(md[1])) return md[1];

  // First markdown image in a short body
  if (body.length < 2000) {
    const m = body.match(/!\[[^\]]*\]\(\s*(https?:\/\/[^)\s]+)\s*\)/i);
    if (m?.[1] && looksLikeImageUrl(m[1])) return m[1];
  }

  return null;
}

function firstHttpUrl(s: string): string | null {
  const m = s.match(/https?:\/\/[^\s)"']+/i);
  return m ? m[0] : null;
}

function looksLikeImageUrl(url: string): boolean {
  try {
    const u = new URL(url);
    if (!/^https?:$/i.test(u.protocol)) return false;
    const path = u.pathname.toLowerCase();
    if (/\.(png|jpe?g|gif|webp|avif|svg)(\?|$)/i.test(path)) return true;
    // Hosted blob / CDN without extension
    if (
      u.hostname.includes("blob.vercel-storage.com") ||
      u.hostname.includes("public.blob.vercel-storage.com") ||
      u.hostname.includes("imgur.com") ||
      u.hostname.includes("twimg.com")
    ) {
      return true;
    }
    return false;
  } catch {
    return false;
  }
}
