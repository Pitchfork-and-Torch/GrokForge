export default function Loading() {
  return (
    <div className="space-y-8" aria-busy="true" aria-label="Loading GrokForge">
      <div className="h-56 rounded-3xl border border-amber-900/30 gf-skeleton sm:h-72" />
      <div className="h-10 w-48 rounded-full border border-amber-900/20 gf-skeleton" />
      <div className="space-y-2 rounded-2xl border border-amber-900/25 p-2">
        <div className="h-14 rounded-xl gf-skeleton" />
        <div className="h-14 rounded-xl gf-skeleton" />
        <div className="h-14 rounded-xl gf-skeleton" />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="h-44 rounded-2xl border border-amber-900/30 gf-skeleton" />
        <div className="h-44 rounded-2xl border border-amber-900/30 gf-skeleton" />
      </div>
    </div>
  );
}
