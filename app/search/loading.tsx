import { Skeleton } from '@/components/ui/skeleton';

export default function SearchLoading() {
  return (
    <div className="animate-page py-6 md:py-8 lg:py-10 md:pl-16 lg:pl-64">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        {/* Page header skeleton */}
        <div className="mb-6 md:mb-8">
          <Skeleton className="h-8 w-48 mb-4" />
          <Skeleton className="h-12 w-full max-w-xl rounded-lg" />
        </div>

        {/* Upload card */}
        <div className="rounded-xl bg-card p-4 shadow-soft mb-8">
          <Skeleton className="mx-auto h-4 w-40 mb-3" />
          <div className="flex gap-3">
            <Skeleton className="h-10 flex-1 rounded-lg" />
            <Skeleton className="h-10 flex-1 rounded-lg" />
          </div>
        </div>

        {/* Recent searches */}
        <Skeleton className="h-6 w-36 mb-3" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 rounded-xl bg-card p-3 shadow-soft">
              <Skeleton className="h-10 w-8 rounded-lg flex-shrink-0" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
