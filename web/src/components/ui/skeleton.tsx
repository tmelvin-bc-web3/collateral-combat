import { cn } from "@/lib/utils"
import { Card } from "./Card"

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'card' | 'text' | 'avatar' | 'button' | 'circle';
}

function Skeleton({
  className,
  variant = 'default',
  ...props
}: SkeletonProps) {
  const variantStyles = {
    default: '',
    card: 'rounded-lg',
    text: 'rounded-md h-4',
    avatar: 'rounded-full',
    button: 'rounded-lg h-10',
    circle: 'rounded-full aspect-square',
  };

  return (
    <div
      className={cn(
        "skeleton-shimmer bg-bg-tertiary",
        variantStyles[variant],
        className
      )}
      {...props}
    />
  )
}

// Pre-built skeleton patterns for common use cases
function SkeletonCard({ className }: { className?: string }) {
  return (
    <Card className={cn("space-y-4", className)}>
      <Skeleton className="h-6 w-1/3" variant="text" />
      <div className="space-y-2">
        <Skeleton className="h-4 w-full" variant="text" />
        <Skeleton className="h-4 w-4/5" variant="text" />
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-8 w-20" variant="button" />
        <Skeleton className="h-8 w-20" variant="button" />
      </div>
    </Card>
  )
}

function SkeletonStats({ className }: { className?: string }) {
  return (
    <div className={cn("grid grid-cols-2 md:grid-cols-4 gap-4", className)}>
      {[1, 2, 3, 4].map((i) => (
        <Card key={i} className="py-4">
          <Skeleton className="h-3 w-16 mb-2" variant="text" />
          <Skeleton className="h-8 w-24" variant="text" />
        </Card>
      ))}
    </div>
  )
}

function SkeletonLeaderboard({ rows = 5, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: rows }).map((_, i) => (
        <Card key={i} className="flex items-center gap-4 p-4">
          <Skeleton className="w-8 h-8" variant="avatar" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-32" variant="text" />
            <Skeleton className="h-3 w-24" variant="text" />
          </div>
          <Skeleton className="h-6 w-20" variant="text" />
        </Card>
      ))}
    </div>
  )
}

function SkeletonChart({ className }: { className?: string }) {
  return (
    <Card className={cn("overflow-hidden", className)}>
      <div className="flex items-center justify-between mb-4">
        <Skeleton className="h-6 w-24" variant="text" />
        <Skeleton className="h-8 w-32" variant="text" />
      </div>
      <Skeleton className="h-[240px] w-full rounded-lg" />
    </Card>
  )
}

function SkeletonBattleCard({ className }: { className?: string }) {
  return (
    <Card className={className}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Skeleton className="w-10 h-10" variant="avatar" />
          <div className="space-y-1">
            <Skeleton className="h-4 w-24" variant="text" />
            <Skeleton className="h-3 w-16" variant="text" />
          </div>
        </div>
        <Skeleton className="h-6 w-16" variant="text" />
        <div className="flex items-center gap-3">
          <div className="space-y-1 text-right">
            <Skeleton className="h-4 w-24" variant="text" />
            <Skeleton className="h-3 w-16" variant="text" />
          </div>
          <Skeleton className="w-10 h-10" variant="avatar" />
        </div>
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-10 flex-1" variant="button" />
        <Skeleton className="h-10 flex-1" variant="button" />
      </div>
    </Card>
  )
}

function SkeletonProgression({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-6", className)}>
      {/* Level and XP */}
      <Card>
        <div className="flex items-center gap-4 mb-4">
          <Skeleton className="w-16 h-16" variant="avatar" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-32" variant="text" />
            <Skeleton className="h-3 w-full" />
          </div>
        </div>
      </Card>
      {/* Stats grid */}
      <SkeletonStats />
      {/* Perks */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SkeletonCard />
        <SkeletonCard />
      </div>
    </div>
  )
}

// Skeleton for prediction/oracle page
function SkeletonPrediction({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-3", className)}>
      {/* Results strip skeleton */}
      <div className="flex items-center gap-2 mb-3">
        <Skeleton className="h-3 w-12" variant="text" />
        <Skeleton className="h-px flex-1" />
      </div>
      <div className="flex gap-1.5 overflow-hidden">
        {Array.from({ length: 10 }).map((_, i) => (
          <Skeleton key={i} className="w-10 h-10 rounded-md flex-shrink-0" />
        ))}
      </div>

      {/* Chart skeleton */}
      <Card className="p-0 overflow-hidden">
        <Skeleton className="h-[180px] md:h-[240px] w-full" />
      </Card>

      {/* Timer and price skeleton */}
      <Card className="py-3 md:py-4 px-4 md:px-5">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-3 w-20" variant="text" />
            <Skeleton className="h-10 w-32" variant="text" />
          </div>
          <div className="text-right space-y-2">
            <Skeleton className="h-3 w-16 ml-auto" variant="text" />
            <Skeleton className="h-20 w-24 md:h-24 md:w-32" />
          </div>
        </div>
        <Skeleton className="h-1.5 w-full mt-3 rounded-full" />
      </Card>

      {/* Betting buttons skeleton */}
      <div className="grid grid-cols-2 gap-2 md:gap-3">
        <Skeleton className="h-32 md:h-40 rounded-xl" />
        <Skeleton className="h-32 md:h-40 rounded-xl" />
      </div>
    </div>
  )
}

// Skeleton for tournament tier cards
function SkeletonTournamentCard({ className }: { className?: string }) {
  return (
    <Card className={cn("h-full", className)}>
      <Skeleton className="w-14 h-14 rounded-xl mb-4" />
      <Skeleton className="h-6 w-24 mb-1" variant="text" />
      <Skeleton className="h-3 w-16 mb-2" variant="text" />
      <Skeleton className="h-4 w-full mb-1" variant="text" />
      <Skeleton className="h-4 w-3/4 mb-4" variant="text" />

      <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border-primary">
        <div className="space-y-1">
          <Skeleton className="h-3 w-16" variant="text" />
          <Skeleton className="h-6 w-20" variant="text" />
        </div>
        <div className="space-y-1">
          <Skeleton className="h-3 w-16" variant="text" />
          <Skeleton className="h-6 w-12" variant="text" />
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-border-primary space-y-1">
        <Skeleton className="h-3 w-20" variant="text" />
        <Skeleton className="h-8 w-24" variant="text" />
      </div>
    </Card>
  )
}

// Skeleton for wager/bet history items
function SkeletonWagerHistory({ rows = 3, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn("space-y-3", className)}>
      {Array.from({ length: rows }).map((_, i) => (
        <Card key={i} className="p-4">
          <div className="flex justify-between items-start mb-2">
            <div className="space-y-1">
              <Skeleton className="h-4 w-20" variant="text" />
              <Skeleton className="h-3 w-32" variant="text" />
            </div>
            <Skeleton className="h-6 w-16 rounded" />
          </div>
          <div className="flex justify-between">
            <Skeleton className="h-3 w-24" variant="text" />
            <Skeleton className="h-3 w-16" variant="text" />
          </div>
        </Card>
      ))}
    </div>
  )
}

// Skeleton for token/coin list items
function SkeletonTokenList({ rows = 6, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-bg-tertiary border border-border-primary">
          <Skeleton className="w-10 h-10 rounded-full" variant="avatar" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-4 w-20" variant="text" />
            <Skeleton className="h-3 w-28" variant="text" />
          </div>
          <div className="text-right space-y-1.5">
            <Skeleton className="h-4 w-16" variant="text" />
            <Skeleton className="h-3 w-12 ml-auto" variant="text" />
          </div>
        </div>
      ))}
    </div>
  )
}

// Generic data fetch wrapper with skeleton
interface DataFetchSkeletonProps {
  isLoading: boolean;
  skeleton: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

function DataFetchSkeleton({ isLoading, skeleton, children, className }: DataFetchSkeletonProps) {
  if (isLoading) {
    return <div className={className}>{skeleton}</div>;
  }
  return <>{children}</>;
}

// Inline skeleton for text placeholders
function SkeletonInline({ width = 'w-20', className }: { width?: string; className?: string }) {
  return (
    <span className={cn("inline-block skeleton-shimmer bg-bg-tertiary rounded h-[1em] align-middle", width, className)} />
  );
}

// Loading spinner with consistent styling
function LoadingSpinner({
  size = 'md',
  className
}: {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const sizeStyles = {
    sm: 'w-4 h-4 border',
    md: 'w-8 h-8 border-2',
    lg: 'w-12 h-12 border-2',
  };

  return (
    <div
      className={cn(
        "spinner",
        sizeStyles[size],
        className
      )}
    />
  )
}

// Full page loading state
function PageLoading({ message }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <LoadingSpinner size="lg" />
      {message && (
        <p className="text-text-secondary text-sm animate-pulse">{message}</p>
      )}
    </div>
  )
}

export {
  Skeleton,
  SkeletonCard,
  SkeletonStats,
  SkeletonLeaderboard,
  SkeletonChart,
  SkeletonBattleCard,
  SkeletonProgression,
  SkeletonPrediction,
  SkeletonTournamentCard,
  SkeletonWagerHistory,
  SkeletonTokenList,
  SkeletonInline,
  DataFetchSkeleton,
  LoadingSpinner,
  PageLoading,
}
