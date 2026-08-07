import { cn } from "@/lib/utils";

const X_URL = "https://x.com/suddenlyjon";
const X_HANDLE = "suddenlyjon";

/** Compact X glyph - hard px size so it never blows up full-viewport. */
function XMark() {
  return (
    <svg
      width={11}
      height={11}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
      className="shrink-0"
      style={{ width: 11, height: 11, maxWidth: 11, maxHeight: 11 }}
    >
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

/**
 * Discreet follow control for the sticky header (left of logo).
 * Obsidian Amber fleet chrome.
 */
export function XFollowPill({ className }: { className?: string }) {
  return (
    <a
      href={X_URL}
      target="_blank"
      rel="noopener noreferrer"
      title={`Follow @${X_HANDLE} on X`}
      aria-label={`Follow @${X_HANDLE} on X`}
      className={cn(
        "group inline-flex h-7 max-h-7 shrink-0 items-center gap-1 overflow-hidden rounded-full",
        "border border-amber-500/40 bg-gradient-to-r from-amber-500/15 via-amber-700/10 to-amber-500/5",
        "pl-0.5 pr-0.5 text-[0.62rem] font-semibold tracking-tight text-stone-200",
        "transition duration-200",
        "hover:border-amber-400/70 hover:from-amber-500/25 hover:text-amber-200",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400",
        "2xl:gap-1 2xl:pr-2",
        className
      )}
    >
      <span
        className={cn(
          "inline-flex h-6 w-6 max-h-6 max-w-6 shrink-0 items-center justify-center rounded-full",
          "bg-stone-100 text-black",
          "transition group-hover:bg-amber-500 group-hover:text-black"
        )}
      >
        <XMark />
      </span>
      <span className="hidden max-w-[9rem] truncate whitespace-nowrap leading-none text-amber-300 2xl:inline">
        @{X_HANDLE}
      </span>
    </a>
  );
}
