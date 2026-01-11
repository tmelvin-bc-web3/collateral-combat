import { cn } from "@/lib/utils"

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'card' | 'text' | 'avatar' | 'button';
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
    <div className={cn("card space-y-4", className)}>
      <Skeleton className="h-6 w-1/3" variant="text" />
      <div className="space-y-2">
        <Skeleton className="h-4 w-full" variant="text" />
        <Skeleton className="h-4 w-4/5" variant="text" />
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-8 w-20" variant="button" />
        <Skeleton className="h-8 w-20" variant="button" />
      </div>
    </div>
  )
}

function SkeletonStats({ className }: { className?: string }) {
  return (
    <div className={cn("grid grid-cols-2 md:grid-cols-4 gap-4", className)}>
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="card py-4">
          <Skeleton className="h-3 w-16 mb-2" variant="text" />
          <Skeleton className="h-8 w-24" variant="text" />
        </div>
      ))}
    </div>
  )
}

function SkeletonLeaderboard({ rows = 5, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-4 card">
          <Skeleton className="w-8 h-8" variant="avatar" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-32" variant="text" />
            <Skeleton className="h-3 w-24" variant="text" />
          </div>
          <Skeleton className="h-6 w-20" variant="text" />
        </div>
      ))}
    </div>
  )
}

function SkeletonChart({ className }: { className?: string }) {
  return (
    <div className={cn("card overflow-hidden", className)}>
      <div className="flex items-center justify-between mb-4">
        <Skeleton className="h-6 w-24" variant="text" />
        <Skeleton className="h-8 w-32" variant="text" />
      </div>
      <Skeleton className="h-[240px] w-full rounded-lg" />
    </div>
  )
}

function SkeletonBattleCard({ className }: { className?: string }) {
  return (
    <div className={cn("card", className)}>
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
    </div>
  )
}

function SkeletonProgression({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-6", className)}>
      {/* Level and XP */}
      <div className="card">
        <div className="flex items-center gap-4 mb-4">
          <Skeleton className="w-16 h-16" variant="avatar" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-32" variant="text" />
            <Skeleton className="h-3 w-full" />
          </div>
        </div>
      </div>
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
  LoadingSpinner,
  PageLoading,
}
