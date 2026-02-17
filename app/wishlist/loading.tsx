import { Skeleton } from '@/components/ui/skeleton';

export default function WishlistLoading() {
  return (
    <div className="animate-page py-6 md:py-8 lg:py-10 md:pl-16 lg:pl-64">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        {/* Page header */}
        <div className="mb-6 md:mb-8">
          <Skeleton className="h-8 w-40" />
        </div>

        {/* Wine list items */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 rounded-2xl bg-card p-3.5 shadow-soft">
              <Skeleton className="h-14 w-10 rounded-xl flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-3 w-2/3" />
              </div>
              <Skeleton className="h-4 w-4" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
