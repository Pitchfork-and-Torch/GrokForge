import type { ReactNode } from "react";
import { ContentBody } from "@/components/content-body";

/**
 * Project long description: keep plain text readable, and surface
 * embedded image URLs / markdown images at full size (no crop).
 */
export function ProjectDescription({ text }: { text: string }) {
  const parts = splitDescription(text || "");
  if (parts.length === 0) return null;

  return (
    <div className="max-w-3xl space-y-4 text-stone-400">
      {parts.map((p, i) => {
        if (p.kind === "image") {
          return (
            <ContentBody
              key={i}
              body={p.src}
              contentType="image"
              maxHeightClass="max-h-none"
            />
          );
        }
        return (
          <p key={i} className="whitespace-pre-wrap leading-relaxed">
            {linkify(p.text)}
          </p>
        );
      })}
    </div>
  );
}

type Part =
  | { kind: "text"; text: string }
  | { kind: "image"; src: string };

function splitDescription(raw: string): Part[] {
  const parts: Part[] = [];
  // Split on markdown images or bare image URLs on their own line
  const re =
    /(?:!\[[^\]]*\]\(\s*(https?:\/\/[^)\s]+)\s*\)|(?:^|\n)(https?:\/\/[^\s]+\.(?:png|jpe?g|gif|webp|avif)(?:\?[^\s]*)?))(?=\n|$)/gi;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(raw)) !== null) {
    const start = m.index;
    const before = raw.slice(last, start).replace(/^\n+|\n+$/g, "");
    if (before.trim()) parts.push({ kind: "text", text: before });
    const src = (m[1] || m[2] || "").trim();
    if (src) parts.push({ kind: "image", src });
    last = re.lastIndex;
  }
  const tail = raw.slice(last).replace(/^\n+/, "");
  if (tail.trim()) parts.push({ kind: "text", text: tail });
  if (parts.length === 0 && raw.trim()) {
    parts.push({ kind: "text", text: raw });
  }
  return parts;
}

function linkify(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const re = /(https?:\/\/[^\s]+)/gi;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    const href = m[1];
    nodes.push(
      <a
        key={`l-${i++}`}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="break-all text-amber-300/90 underline-offset-2 hover:text-amber-200 hover:underline"
      >
        {href}
      </a>
    );
    last = re.lastIndex;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}
