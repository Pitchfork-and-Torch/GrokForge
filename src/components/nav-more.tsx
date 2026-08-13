"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

const MORE_LINKS = [
  { href: "/ships", label: "Ships" },
  { href: "/activity", label: "Activity" },
  { href: "/rankings", label: "Rankings" },
  { href: "/quests", label: "Quests" },
  { href: "/cockpit", label: "Cockpit" },
  { href: "/forge", label: "Forge map" },
  { href: "/about", label: "About" },
  { href: "/status", label: "Status" },
] as const;

type NavMoreProps = {
  linkClassName?: string;
};

/** Desktop overflow menu so primary nav stays one clean row. */
export function NavMore({ linkClassName }: NavMoreProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        className={cn(linkClassName, "inline-flex items-center gap-1")}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={menuId}
        onClick={() => setOpen((v) => !v)}
      >
        More
        <span aria-hidden className="text-[10px] text-stone-500">
          {open ? "▲" : "▼"}
        </span>
      </button>
      {open && (
        <div
          id={menuId}
          role="menu"
          className="absolute right-0 top-full z-50 mt-1.5 min-w-[11rem] rounded-xl border border-amber-900/50 bg-[#0a0a0a] py-1.5 shadow-[0_12px_40px_rgba(0,0,0,0.75)]"
        >
          {MORE_LINKS.map((l) => (
            <Link
              key={l.href}
              role="menuitem"
              href={l.href}
              className="block px-3.5 py-2 text-sm text-stone-200 hover:bg-amber-500/15 hover:text-amber-100"
              onClick={() => setOpen(false)}
            >
              {l.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
