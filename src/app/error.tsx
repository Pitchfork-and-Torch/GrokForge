"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button, Card } from "@/components/ui";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto max-w-lg py-16">
      <Card className="space-y-4 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-rose-400">Error</p>
        <h1 className="text-2xl font-bold text-white">Something went sideways</h1>
        <p className="text-sm text-stone-400">
          A temporary fault hit this page. Retry, or return home. Your funds and tasks are safe in Neon.
        </p>
        {error?.digest && (
          <p className="font-mono text-[10px] text-stone-600">
            digest {error.digest}
          </p>
        )}
        {process.env.NODE_ENV === "development" && error?.message && (
          <p className="break-words text-left text-[11px] text-rose-300/90">
            {error.message.slice(0, 400)}
          </p>
        )}
        <div className="flex flex-wrap justify-center gap-3 pt-2">
          <Button type="button" onClick={() => reset()}>
            Try again
          </Button>
          <Link href="/">
            <Button variant="secondary">Home</Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}
