"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/projects/new", label: "Propose", icon: "＋" },
  { href: "/tasks", label: "Tasks", icon: "≡" },
  { href: "/dashboard", label: "Dash", icon: "◆" },
  { href: "/leaderboard", label: "Leaders", icon: "▲" },
] as const;

/**
 * Logged-in mobile sticky bottom bar for core forge flows.
 * Sits above safe-area; theme control stays top-right of this band.
 */
export function StickyMobileBar({
  signedIn,
  profileHref,
}: {
  signedIn: boolean;
  profileHref?: string | null;
}) {
  const path = usePathname() || "";
  if (!signedIn) return null;

  const links = profileHref
    ? [...items.slice(0, 3), { href: profileHref, label: "You", icon: "@" } as const]
    : [...items];

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-[55] border-t border-white/10 bg-[color:var(--background-elevated)]/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md sm:hidden"
      aria-label="Primary mobile"
      style={{ backgroundColor: "color-mix(in srgb, var(--background-elevated) 95%, transparent)" }}
    >
      <ul className="mx-auto flex max-w-lg items-stretch justify-around px-1 pt-1">
        {links.map((it) => {
          const active =
            path === it.href ||
            (it.href !== "/" && path.startsWith(it.href.split("?")[0]));
          return (
            <li key={it.href} className="flex-1">
              <Link
                href={it.href}
                className={
                  active
                    ? "flex min-h-[48px] flex-col items-center justify-center gap-0.5 text-[10px] font-semibold text-[color:var(--accent)]"
                    : "flex min-h-[48px] flex-col items-center justify-center gap-0.5 text-[10px] font-medium text-stone-500 hover:text-stone-300"
                }
                aria-current={active ? "page" : undefined}
              >
                <span className="text-base leading-none" aria-hidden>
                  {it.icon}
                </span>
                {it.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
