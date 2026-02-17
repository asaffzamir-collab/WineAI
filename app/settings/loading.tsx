import { Skeleton } from '@/components/ui/skeleton';

export default function SettingsLoading() {
  return (
    <div className="animate-page py-6 md:py-8 lg:py-10 md:pl-16 lg:pl-64">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        {/* Page header */}
        <div className="mb-6 md:mb-8">
          <Skeleton className="h-8 w-36" />
        </div>

        <div className="max-w-2xl space-y-6">
          {/* Account card */}
          <div className="rounded-xl bg-card p-6 shadow-soft space-y-3">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-4 w-36" />
          </div>

          {/* Language card */}
          <div className="rounded-xl bg-card p-6 shadow-soft space-y-3">
            <Skeleton className="h-5 w-20" />
            <div className="flex gap-3">
              <Skeleton className="h-12 flex-1 rounded-xl" />
              <Skeleton className="h-12 flex-1 rounded-xl" />
            </div>
          </div>

          {/* Dark mode card */}
          <div className="rounded-xl bg-card p-6 shadow-soft space-y-3">
            <Skeleton className="h-5 w-28" />
            <Skeleton className="h-7 w-12 rounded-full" />
          </div>

          {/* Sign out button */}
          <Skeleton className="h-11 w-full rounded-lg" />
        </div>
      </div>
    </div>
  );
}
