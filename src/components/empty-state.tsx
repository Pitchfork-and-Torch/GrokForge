import Link from "next/link";
import { Button, Card } from "@/components/ui";

export function EmptyState({
  title,
  body,
  primaryHref,
  primaryLabel,
  secondaryHref,
  secondaryLabel,
  signedIn = false,
}: {
  title: string;
  body: string;
  primaryHref?: string;
  primaryLabel?: string;
  secondaryHref?: string;
  secondaryLabel?: string;
  /** When true, never offer Sign in with X - use builder actions instead */
  signedIn?: boolean;
}) {
  let pHref = primaryHref;
  let pLabel = primaryLabel;
  let sHref = secondaryHref;
  let sLabel = secondaryLabel;

  if (signedIn) {
    const isSignIn =
      (pLabel && /sign in with x/i.test(pLabel)) || pHref === "/login";
    if (isSignIn) {
      pHref = "/projects/new";
      pLabel = "Propose a project";
    }
    if (sHref === "/login" || (sLabel && /sign in with x/i.test(sLabel))) {
      sHref = "/tasks";
      sLabel = "Browse open tasks";
    }
  } else {
    // signed out: if only propose without login, keep as-is
  }

  return (
    <Card className="text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[color:var(--accent)]/15 font-display text-lg font-black text-[var(--accent)]">
        GF
      </div>
      <h3 className="mt-4 font-display text-lg font-semibold text-[var(--foreground)]">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm text-[var(--muted)]">{body}</p>
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        {pHref && pLabel && (
          <Link href={pHref}>
            <Button>{pLabel}</Button>
          </Link>
        )}
        {sHref && sLabel && (
          <Link href={sHref}>
            <Button variant="secondary">{sLabel}</Button>
          </Link>
        )}
      </div>
    </Card>
  );
}
