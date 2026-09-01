import Link from "next/link";

export function ForgeOfflineBanner({ quota }: { quota: boolean }) {
  return (
    <div
      role="status"
      className="mb-6 rounded-2xl border border-rose-500/40 bg-rose-950/40 px-4 py-3 text-sm text-rose-100"
    >
      <p className="font-semibold text-rose-50">Forge catalog offline</p>
      <p className="mt-1 text-rose-100/90">
        {quota
          ? "The database hit its monthly compute limit, so projects, tasks, and sign-in data cannot load. They return when compute is restored."
          : "The database is unreachable, so projects, tasks, and sign-in data cannot load. They should return shortly."}{" "}
        <Link href="/status" className="font-medium text-amber-200 underline underline-offset-2">
          System status
        </Link>
      </p>
    </div>
  );
}
