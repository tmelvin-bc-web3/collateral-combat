import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/Card';

/**
 * Next.js App Router loading state for the predict page.
 * Automatically wraps page in Suspense and shows this skeleton while loading.
 */
export default function Loading() {
  return (
    <div className="h-screen flex flex-col px-3 sm:px-4 lg:px-6 py-2 overflow-hidden safe-area-inset">
      {/* Header skeleton */}
      <div className="flex items-center justify-between mb-2 sm:mb-3 flex-shrink-0">
        <div className="flex items-center gap-2 sm:gap-3">
          <Skeleton className="h-6 sm:h-8 w-32" variant="text" />
          <Skeleton className="h-2 w-2" variant="circle" />
        </div>
        <Skeleton className="h-6 w-20" variant="text" />
      </div>

      {/* 3-Column Layout skeleton */}
      <div className="flex gap-2 sm:gap-4 flex-1 min-h-0">
        {/* Left sidebar skeleton - only on lg screens */}
        <aside className="hidden lg:flex w-72 flex-col flex-shrink-0">
          <Card className="flex-1 p-4">
            <Skeleton className="h-3 w-24 mb-4" variant="text" />
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between py-2">
                  <Skeleton className="h-4 w-24" variant="text" />
                  <Skeleton className="h-4 w-16" variant="text" />
                </div>
              ))}
            </div>
            <div className="mt-auto pt-3 border-t border-white/10 grid grid-cols-2 gap-2">
              <Skeleton className="h-8 w-full" variant="text" />
              <Skeleton className="h-8 w-full" variant="text" />
            </div>
          </Card>
        </aside>

        {/* Main game area skeleton */}
        <div className="flex-1 flex flex-col min-h-0 gap-2">
          {/* Chart area - 50% */}
          <div className="flex-1 min-h-0 rounded-xl border-2 border-white/10 p-[2px]" style={{ flexBasis: '50%' }}>
            <Skeleton className="w-full h-full rounded-[10px]" />
          </div>

          {/* Betting section - 50% */}
          <div className="flex-1 flex flex-col min-h-0 gap-2" style={{ flexBasis: '50%' }}>
            {/* Betting buttons */}
            <div className="grid grid-cols-2 gap-2 sm:gap-4 flex-1 min-h-0">
              <Skeleton className="min-h-[120px] rounded-xl" />
              <Skeleton className="min-h-[120px] rounded-xl" />
            </div>

            {/* Wager selector */}
            <div className="flex-shrink-0 flex items-center justify-center gap-2">
              <Skeleton className="h-3 w-12" variant="text" />
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-11 w-11" variant="button" />
              ))}
            </div>
          </div>
        </div>

        {/* Right sidebar skeleton - only on lg screens */}
        <aside className="hidden lg:flex w-64 flex-col flex-shrink-0">
          <Card className="flex-1 p-4">
            <Skeleton className="h-3 w-16 mb-4" variant="text" />
            <div className="space-y-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between py-2 px-3 rounded-lg bg-white/5">
                  <Skeleton className="h-4 w-12" variant="text" />
                  <Skeleton className="h-4 w-16" variant="text" />
                </div>
              ))}
            </div>
          </Card>
        </aside>
      </div>
    </div>
  );
}
