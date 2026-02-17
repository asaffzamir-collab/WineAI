import { Skeleton } from '@/components/ui/skeleton';

export default function ProfileLoading() {
  return (
    <div className="animate-page py-6 md:py-8 lg:py-10 md:pl-16 lg:pl-64">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        {/* Page header */}
        <div className="mb-6 md:mb-8">
          <Skeleton className="h-8 w-48" />
        </div>

        {/* Tabs */}
        <div className="rounded-xl bg-card shadow-soft">
          <div className="flex gap-1 p-1 border-b border-border">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-10 flex-1 rounded-lg" />
            ))}
          </div>

          <div className="p-6 space-y-6">
            {/* Spectrum chart skeleton */}
            <div className="rounded-2xl border border-border p-5 space-y-4">
              <Skeleton className="mx-auto h-4 w-32 mb-4" />
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="space-y-1.5">
                  <Skeleton className="h-3 w-24" />
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-4 w-14" />
                    <Skeleton className="h-2 flex-1 rounded-full" />
                    <Skeleton className="h-4 w-14" />
                  </div>
                </div>
              ))}
            </div>

            {/* Profile sections */}
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            ))}

            {/* Tags */}
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-7 w-20 rounded-full" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
