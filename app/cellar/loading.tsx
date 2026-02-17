import { Skeleton } from '@/components/ui/skeleton';

export default function CellarLoading() {
  return (
    <div className="animate-page py-6 md:py-8 lg:py-10 md:pl-16 lg:pl-64">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        {/* Page header skeleton */}
        <div className="mb-6 md:mb-8">
          <Skeleton className="h-8 w-40" />
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="rounded-xl bg-card p-4 shadow-soft">
              <Skeleton className="mx-auto h-8 w-16 mb-2" />
              <Skeleton className="mx-auto h-4 w-24" />
            </div>
          ))}
        </div>

        {/* Filter chips */}
        <div className="flex gap-2 mb-6">
          <Skeleton className="h-9 w-16 rounded-full" />
          <Skeleton className="h-9 w-24 rounded-full" />
        </div>

        {/* Wine list items */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 rounded-2xl bg-card p-3.5 shadow-soft">
              <Skeleton className="h-16 w-12 rounded-xl flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-3 w-2/3" />
              </div>
              <Skeleton className="h-7 w-12 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
