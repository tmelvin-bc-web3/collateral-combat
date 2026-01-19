'use client';

import { cn } from '@/lib/utils';

export type HealthStatus = 'healthy' | 'degraded' | 'down' | 'unknown';

interface HealthIndicatorProps {
  status: HealthStatus;
  label?: string;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const statusStyles: Record<HealthStatus, { dot: string; text: string; label: string }> = {
  healthy: {
    dot: 'bg-success',
    text: 'text-success',
    label: 'Healthy',
  },
  degraded: {
    dot: 'bg-yellow-500',
    text: 'text-yellow-500',
    label: 'Degraded',
  },
  down: {
    dot: 'bg-danger',
    text: 'text-danger',
    label: 'Down',
  },
  unknown: {
    dot: 'bg-white/40',
    text: 'text-white/40',
    label: 'Unknown',
  },
};

const sizeStyles = {
  sm: 'w-2 h-2',
  md: 'w-3 h-3',
  lg: 'w-4 h-4',
};

export function HealthIndicator({
  status,
  label,
  showLabel = true,
  size = 'md',
  className,
}: HealthIndicatorProps) {
  const styles = statusStyles[status];

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className="relative">
        <div
          className={cn(
            'rounded-full',
            sizeStyles[size],
            styles.dot
          )}
        />
        {status === 'healthy' && (
          <div
            className={cn(
              'absolute inset-0 rounded-full animate-ping opacity-75',
              styles.dot
            )}
          />
        )}
      </div>
      {showLabel && (
        <span className={cn('text-sm', styles.text)}>
          {label || styles.label}
        </span>
      )}
    </div>
  );
}

interface HealthBadgeProps {
  status: HealthStatus;
  label?: string;
  className?: string;
}

export function HealthBadge({ status, label, className }: HealthBadgeProps) {
  const styles = statusStyles[status];

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium',
        status === 'healthy' && 'bg-success/20',
        status === 'degraded' && 'bg-yellow-500/20',
        status === 'down' && 'bg-danger/20',
        status === 'unknown' && 'bg-white/10',
        styles.text,
        className
      )}
    >
      <div className={cn('w-1.5 h-1.5 rounded-full', styles.dot)} />
      {label || styles.label}
    </div>
  );
}
