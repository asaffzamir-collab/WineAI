export default function Loading() {
  return (
    <div className="animate-pulse py-6 md:py-8 lg:py-10">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        {/* Back link */}
        <div className="h-4 w-20 rounded bg-muted mb-4" />

        {/* Title */}
        <div className="h-8 w-64 rounded bg-muted mb-2" />
        <div className="h-4 w-96 rounded bg-muted mb-6" />

        {/* Tabs */}
        <div className="flex gap-1 rounded-xl bg-muted/50 p-1 max-w-sm mb-8">
          <div className="flex-1 h-9 rounded-lg bg-muted" />
          <div className="flex-1 h-9 rounded-lg bg-muted/50" />
        </div>

        {/* Feature cards grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border bg-card p-5 space-y-3">
              <div className="h-11 w-11 rounded-xl bg-muted" />
              <div className="h-5 w-3/4 rounded bg-muted" />
              <div className="space-y-1.5">
                <div className="h-3 w-full rounded bg-muted" />
                <div className="h-3 w-5/6 rounded bg-muted" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
