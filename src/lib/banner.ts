/**
 * Project banner images: user upload or Grok Imagine auto-gen.
 * Prefer Vercel Blob when BLOB_READ_WRITE_TOKEN is set; else data URLs (size-capped).
 */

export const BANNER_MAX_BYTES = 900_000; // ~900KB raw
export const BANNER_DATA_URL_MAX = 1_200_000; // ~1.2MB string
export const BANNER_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);

export type BannerSource = "upload" | "imagine";

export type BannerStoreResult =
  | { ok: true; url: string; source: BannerSource }
  | { ok: false; error: string };

const CATEGORY_VISUAL: Record<string, string> = {
  CLIMATE:
    "earth systems, clean energy, living oceans, regenerative landscapes, teal and emerald light",
  OPEN_SCIENCE:
    "open laboratory, luminous data lattices, peer-reviewed discovery, glass instruments, cool blue light",
  EDUCATION:
    "learning constellation, open books dissolving into light networks, warm amber knowledge sparks",
  PUBLIC_GOODS_SOFTWARE:
    "open-source constellation of nodes and agents, bronze and amber circuit geometry, civic infrastructure",
  HEALTH:
    "human wellbeing, soft medical geometry, protective light, calm cyan and white",
  OTHER:
    "abstract greater-good collaboration, nested agent hierarchy, void black and amber forge light",
};

/** Build a cinematic GrokForge-branded prompt for Imagine. */
export function buildBannerPrompt(input: {
  title: string;
  description: string;
  category: string;
  impactSummary?: string | null;
}): string {
  const visual =
    CATEGORY_VISUAL[input.category] || CATEGORY_VISUAL.OTHER;
  const impact = (input.impactSummary || "").trim().slice(0, 160);
  const desc = input.description.replace(/\s+/g, " ").trim().slice(0, 280);
  const title = input.title.trim().slice(0, 100);

  return [
    `Cinematic wide project banner for an open multi-agent public-goods forge called GrokForge.`,
    `Subject: "${title}".`,
    impact ? `Impact: ${impact}.` : "",
    `Context: ${desc}`,
    `Visual language: ${visual}.`,
    `Style: premium dark void (#050505) with amber (#f59e0b) and bronze accents, subtle tech grid, hierarchical agent constellation, soft volumetric light, no text, no logos, no watermarks, no UI chrome, high-end product marketing still, 16:9 composition.`,
  ]
    .filter(Boolean)
    .join(" ");
}

function sniffMime(buf: Buffer): string | null {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    buf.length >= 8 &&
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47
  ) {
    return "image/png";
  }
  // RIFF....WEBP
  if (
    buf.length >= 12 &&
    buf[0] === 0x52 &&
    buf[1] === 0x49 &&
    buf[2] === 0x46 &&
    buf[3] === 0x46 &&
    buf[8] === 0x57 &&
    buf[9] === 0x45 &&
    buf[10] === 0x42 &&
    buf[11] === 0x50
  ) {
    return "image/webp";
  }
  return null;
}

function extForMime(mime: string): string {
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  return "jpg";
}

/** Validate raw image bytes (magic + size + declared type). */
export function validateImageBuffer(
  buf: Buffer,
  declaredType?: string | null
): { ok: true; mime: string } | { ok: false; error: string } {
  if (!buf.length) return { ok: false, error: "Empty image" };
  if (buf.length > BANNER_MAX_BYTES) {
    return {
      ok: false,
      error: `Image too large (max ${Math.round(BANNER_MAX_BYTES / 1024)}KB). Resize and try again.`,
    };
  }
  const sniffed = sniffMime(buf);
  if (!sniffed) {
    return { ok: false, error: "Only JPEG, PNG, or WebP banners are allowed." };
  }
  if (declaredType && declaredType !== sniffed) {
    // Allow jpeg/jpg alias mismatch; otherwise prefer sniffed type
    const declaredOk =
      (declaredType === "image/jpeg" || declaredType === "image/jpg") &&
      sniffed === "image/jpeg";
    if (!declaredOk && declaredType !== sniffed) {
      // Still accept if magic is valid (browsers sometimes mislabel)
    }
  }
  if (!BANNER_MIME.has(sniffed)) {
    return { ok: false, error: "Only JPEG, PNG, or WebP banners are allowed." };
  }
  return { ok: true, mime: sniffed };
}

async function storeBytes(
  buf: Buffer,
  mime: string,
  pathHint: string
): Promise<{ url: string } | { error: string }> {
  const token = process.env.BLOB_READ_WRITE_TOKEN?.trim();
  if (token) {
    try {
      const { put } = await import("@vercel/blob");
      const ext = extForMime(mime);
      const blob = await put(`banners/${pathHint}.${ext}`, buf, {
        access: "public",
        contentType: mime,
        token,
        addRandomSuffix: true,
      });
      return { url: blob.url };
    } catch (e) {
      console.warn("[banner] blob put failed", e);
      // fall through to data URL
    }
  }

  const b64 = buf.toString("base64");
  const dataUrl = `data:${mime};base64,${b64}`;
  if (dataUrl.length > BANNER_DATA_URL_MAX) {
    return {
      error:
        "Banner too large to store without BLOB_READ_WRITE_TOKEN. Add Vercel Blob or use a smaller image.",
    };
  }
  return { url: dataUrl };
}

/** Persist a user-uploaded File/Blob from FormData. */
export async function storeUploadedBanner(
  file: File,
  pathHint: string
): Promise<BannerStoreResult> {
  if (!file || typeof file.arrayBuffer !== "function") {
    return { ok: false, error: "Invalid banner file" };
  }
  if (file.size > BANNER_MAX_BYTES) {
    return {
      ok: false,
      error: `Image too large (max ${Math.round(BANNER_MAX_BYTES / 1024)}KB).`,
    };
  }
  const buf = Buffer.from(await file.arrayBuffer());
  const checked = validateImageBuffer(buf, file.type || null);
  if (!checked.ok) return { ok: false, error: checked.error };

  const stored = await storeBytes(buf, checked.mime, pathHint);
  if ("error" in stored) return { ok: false, error: stored.error };
  return { ok: true, url: stored.url, source: "upload" };
}

/**
 * Generate a banner with Grok Imagine (xAI images API).
 * Requests base64 so we can persist (temp URLs expire).
 */
export async function generateImagineBanner(input: {
  title: string;
  description: string;
  category: string;
  impactSummary?: string | null;
  pathHint: string;
}): Promise<BannerStoreResult> {
  const apiKey = process.env.XAI_API_KEY?.trim();
  if (!apiKey) {
    return {
      ok: false,
      error: "Grok Imagine unavailable (platform XAI_API_KEY not configured).",
    };
  }

  const model =
    process.env.XAI_IMAGE_MODEL?.trim() || "grok-imagine-image";
  const prompt = buildBannerPrompt(input);

  try {
    const res = await fetch("https://api.x.ai/v1/images/generations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        prompt,
        n: 1,
        aspect_ratio: "16:9",
        resolution: "1k",
        response_format: "b64_json",
      }),
      signal: AbortSignal.timeout(55_000),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.warn("[banner] imagine HTTP", res.status, body.slice(0, 400));
      return {
        ok: false,
        error:
          res.status === 429
            ? "Imagine rate limit - try regenerate in a minute."
            : `Imagine failed (${res.status}). Try again or upload your own.`,
      };
    }

    const data = (await res.json()) as {
      data?: { b64_json?: string; url?: string; revised_prompt?: string }[];
    };
    const item = data.data?.[0];
    if (!item) {
      return { ok: false, error: "Imagine returned no image." };
    }

    let buf: Buffer;
    let mime = "image/jpeg";
    if (item.b64_json) {
      buf = Buffer.from(item.b64_json, "base64");
    } else if (item.url) {
      // Temporary URL - download immediately
      const imgRes = await fetch(item.url, {
        signal: AbortSignal.timeout(30_000),
      });
      if (!imgRes.ok) {
        return { ok: false, error: "Could not download Imagine result." };
      }
      const ct = imgRes.headers.get("content-type") || "image/jpeg";
      if (ct.includes("png")) mime = "image/png";
      else if (ct.includes("webp")) mime = "image/webp";
      buf = Buffer.from(await imgRes.arrayBuffer());
    } else {
      return { ok: false, error: "Imagine returned empty payload." };
    }

    const checked = validateImageBuffer(buf, mime);
    if (!checked.ok) {
      // Imagine may return large images; if slightly over, still try store with blob
      if (buf.length > BANNER_MAX_BYTES * 1.5) {
        return { ok: false, error: checked.error };
      }
      // allow modest oversize for Imagine into blob only
    }

    const stored = await storeBytes(
      buf,
      checked.ok ? checked.mime : mime,
      input.pathHint
    );
    if ("error" in stored) return { ok: false, error: stored.error };
    return { ok: true, url: stored.url, source: "imagine" };
  } catch (e) {
    console.warn("[banner] imagine failed", e);
    const msg = e instanceof Error ? e.message : "Imagine request failed";
    if (msg.includes("Timeout") || msg.includes("abort")) {
      return {
        ok: false,
        error: "Imagine timed out. Use Regenerate or upload a banner.",
      };
    }
    return { ok: false, error: "Imagine request failed." };
  }
}

/** Read optional banner file from FormData field "banner". */
export function getBannerFile(formData: FormData): File | null {
  const raw = formData.get("banner");
  if (!raw || typeof raw === "string") return null;
  // File is a Blob with name
  if (typeof (raw as File).arrayBuffer === "function" && (raw as File).size > 0) {
    return raw as File;
  }
  return null;
}
