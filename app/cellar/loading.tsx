import { Skeleton } from '@/components/ui/skeleton';

export default function CellarLoading() {
  return (
    <div className="animate-page py-6 md:py-8 lg:py-10 md:pl-16 lg:pl-64">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <Skeleton className="h-8 w-40" />
            <Skeleton className="h-4 w-24 mt-1" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-9 w-9 rounded-lg" />
            <Skeleton className="h-9 w-9 rounded-lg" />
            <Skeleton className="h-9 w-24 rounded-lg" />
          </div>
        </div>

        {/* Tabs */}
        <Skeleton className="h-10 w-64 rounded-xl mb-4" />

        {/* Layout */}
        <div className="flex gap-6">
          {/* Sidebar skeleton - desktop only */}
          <div className="hidden lg:block w-[280px] flex-shrink-0 space-y-4">
            <Skeleton className="h-16 w-full rounded-xl" />
            <Skeleton className="h-px w-full" />
            <div className="space-y-2">
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-10 w-full rounded-lg" />
              <Skeleton className="h-10 w-full rounded-lg" />
            </div>
            <Skeleton className="h-px w-full" />
            <div className="space-y-2">
              <Skeleton className="h-9 w-full rounded-lg" />
              <div className="flex gap-2">
                <Skeleton className="h-7 w-14 rounded-full" />
                <Skeleton className="h-7 w-14 rounded-full" />
                <Skeleton className="h-7 w-14 rounded-full" />
              </div>
            </div>
          </div>

          {/* Main content - rack grid skeleton */}
          <div className="flex-1 rounded-2xl bg-card shadow-soft p-4">
            <div className="grid grid-cols-6 gap-2">
              {Array.from({ length: 36 }).map((_, i) => (
                <Skeleton key={i} className="aspect-[3/5] rounded-lg" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
