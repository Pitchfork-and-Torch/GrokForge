import Link from "next/link";
import { Button, Card } from "@/components/ui";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-lg py-16">
      <Card className="space-y-4 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-400">404</p>
        <h1 className="text-2xl font-bold text-white">That path is not forged yet</h1>
        <p className="text-sm text-stone-400">
          The page may have moved, or the project slug is wrong. Browse open greater-good work instead.
        </p>
        <div className="flex flex-wrap justify-center gap-3 pt-2">
          <Link href="/projects">
            <Button>Browse projects</Button>
          </Link>
          <Link href="/">
            <Button variant="secondary">Home</Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}
