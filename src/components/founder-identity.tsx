import Link from "next/link";
import { FOUNDER } from "@/lib/site-identity";

/** Compact hero / footer byline — the name Jon Bailey is visible to humans. */
export function FounderByline({
  className = "",
}: {
  className?: string;
}) {
  return (
    <p className={className}>
      Built by{" "}
      <Link
        href={FOUNDER.profilePath}
        className="font-semibold text-[var(--foreground)] hover:text-[var(--accent)]"
      >
        {FOUNDER.name}
      </Link>
      <span className="text-[var(--muted)]">
        {" "}
        · {FOUNDER.jobTitle.toLowerCase()} ·{" "}
      </span>
      <a
        href={FOUNDER.xUrl}
        className="hover:text-[var(--accent)]"
        rel="noopener noreferrer"
        target="_blank"
      >
        @{FOUNDER.handle}
      </a>
    </p>
  );
}

/** Homepage / about card: who built this, and who it is not. */
export function FounderIdentityCard() {
  return (
    <section
      aria-labelledby="founder-heading"
      className="gf-surface rounded-3xl p-6 sm:p-8"
    >
      <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--accent)]">
        Founder
      </p>
      <h2
        id="founder-heading"
        className="font-display mt-1 text-2xl font-semibold text-[var(--foreground)]"
      >
        {FOUNDER.name}
      </h2>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--muted)]">
        Musician and maker. He runs {FOUNDER.org} and ships GrokForge in public
        at{" "}
        <Link href={FOUNDER.profilePath} className="text-[var(--accent)] hover:opacity-80">
          @{FOUNDER.handle}
        </Link>
        . Not Jonathan Bailey the actor, and not the voice-over artist known as
        Epic Voice Guy.
      </p>
      <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-sm">
        <li>
          <Link href={FOUNDER.profilePath} className="text-[var(--accent)] hover:opacity-80">
            GrokForge profile
          </Link>
        </li>
        <li>
          <a
            href={FOUNDER.xUrl}
            className="text-[var(--accent)] hover:opacity-80"
            rel="noopener noreferrer"
            target="_blank"
          >
            @{FOUNDER.xHandle} on X
          </a>
        </li>
        <li>
          <a
            href={FOUNDER.hubUrl}
            className="text-[var(--accent)] hover:opacity-80"
            rel="noopener noreferrer"
            target="_blank"
          >
            jonbailey.xyz
          </a>
        </li>
        <li>
          <a
            href={FOUNDER.repoUrl}
            className="text-[var(--accent)] hover:opacity-80"
            rel="noopener noreferrer"
            target="_blank"
          >
            GitHub
          </a>
        </li>
      </ul>
    </section>
  );
}
