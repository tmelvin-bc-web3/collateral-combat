import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/Card';

/**
 * Next.js App Router loading state for the battle page.
 * Automatically wraps page in Suspense and shows this skeleton while loading.
 */
export default function Loading() {
  return (
    <div className="min-h-screen px-3 sm:px-4 lg:px-6 py-4">
      {/* Header skeleton */}
      <div className="flex items-center justify-between mb-4">
        <Skeleton className="h-8 w-40" variant="text" />
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-24" variant="button" />
          <Skeleton className="h-10 w-10" variant="circle" />
        </div>
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left column - Battle info and controls */}
        <div className="lg:col-span-2 space-y-4">
          {/* Chart area skeleton */}
          <Card className="p-0 overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <Skeleton className="h-6 w-32" variant="text" />
              <Skeleton className="h-8 w-24" variant="text" />
            </div>
            <Skeleton className="h-[300px] w-full" />
          </Card>

          {/* Trading panel skeleton */}
          <Card className="p-4">
            <div className="flex items-center justify-between mb-4">
              <Skeleton className="h-5 w-24" variant="text" />
              <Skeleton className="h-6 w-20" variant="text" />
            </div>

            {/* Position controls */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <Skeleton className="h-12 rounded-lg" variant="button" />
              <Skeleton className="h-12 rounded-lg" variant="button" />
            </div>

            {/* Leverage selector */}
            <div className="flex items-center gap-2 mb-4">
              <Skeleton className="h-3 w-16" variant="text" />
              <div className="flex gap-2 flex-1">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-9 flex-1" variant="button" />
                ))}
              </div>
            </div>

            {/* Size input */}
            <Skeleton className="h-12 w-full rounded-lg mb-4" />

            {/* Action buttons */}
            <div className="grid grid-cols-2 gap-3">
              <Skeleton className="h-14 rounded-xl" variant="button" />
              <Skeleton className="h-14 rounded-xl" variant="button" />
            </div>
          </Card>
        </div>

        {/* Right column - Position list and stats */}
        <div className="space-y-4">
          {/* Player stats skeleton */}
          <Card className="p-4">
            <Skeleton className="h-5 w-20 mb-3" variant="text" />
            <div className="space-y-3">
              <div className="flex justify-between">
                <Skeleton className="h-4 w-16" variant="text" />
                <Skeleton className="h-4 w-24" variant="text" />
              </div>
              <div className="flex justify-between">
                <Skeleton className="h-4 w-16" variant="text" />
                <Skeleton className="h-4 w-20" variant="text" />
              </div>
              <div className="flex justify-between">
                <Skeleton className="h-4 w-16" variant="text" />
                <Skeleton className="h-4 w-16" variant="text" />
              </div>
            </div>
          </Card>

          {/* Open positions skeleton */}
          <Card className="p-4">
            <Skeleton className="h-5 w-32 mb-3" variant="text" />
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="p-3 rounded-lg bg-white/5 border border-white/10">
                  <div className="flex items-center justify-between mb-2">
                    <Skeleton className="h-4 w-16" variant="text" />
                    <Skeleton className="h-4 w-12" variant="text" />
                  </div>
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-3 w-20" variant="text" />
                    <Skeleton className="h-3 w-16" variant="text" />
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Battle timer skeleton */}
          <Card className="p-4 text-center">
            <Skeleton className="h-4 w-24 mx-auto mb-2" variant="text" />
            <Skeleton className="h-10 w-32 mx-auto" variant="text" />
          </Card>
        </div>
      </div>
    </div>
  );
}
