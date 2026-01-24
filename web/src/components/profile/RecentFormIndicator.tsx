'use client';

import { cn } from '@/lib/utils';

interface RecentFormResult {
  result: 'win' | 'loss' | 'tie';
  pnlPercent?: number;
  endedAt?: number;
}

interface RecentFormIndicatorProps {
  form: RecentFormResult[];
  maxItems?: number;
  size?: 'sm' | 'md';
  showLabels?: boolean;
  className?: string;
}

// Follows pattern from research: /web/src/components/lds/RecentWinners.tsx
export function RecentFormIndicator({
  form,
  maxItems = 5,
  size = 'md',
  showLabels = false,
  className
}: RecentFormIndicatorProps) {
  const displayForm = form.slice(0, maxItems);

  // Pad with empty slots if less than maxItems
  const paddedForm: (RecentFormResult | null)[] = [
    ...displayForm,
    ...Array(Math.max(0, maxItems - displayForm.length)).fill(null)
  ];

  const sizeClasses = {
    sm: 'w-5 h-5 text-[10px]',
    md: 'w-6 h-6 text-xs',
  };

  const resultConfig = {
    win: {
      bg: 'bg-success/20',
      text: 'text-success',
      border: 'border-success/30',
      label: 'W',
    },
    loss: {
      bg: 'bg-danger/20',
      text: 'text-danger',
      border: 'border-danger/30',
      label: 'L',
    },
    tie: {
      bg: 'bg-warning/20',
      text: 'text-warning',
      border: 'border-warning/30',
      label: 'T',
    },
  };

  return (
    <div className={cn('flex items-center gap-1', className)}>
      {showLabels && (
        <span className="text-xs text-text-tertiary mr-1 uppercase tracking-wider">Form</span>
      )}
      {paddedForm.map((battle, i) => {
        if (!battle) {
          // Empty slot
          return (
            <div
              key={`empty-${i}`}
              className={cn(
                'rounded-full bg-bg-tertiary border border-border-primary flex items-center justify-center opacity-30',
                sizeClasses[size]
              )}
            >
              <span className="text-text-tertiary">-</span>
            </div>
          );
        }

        const config = resultConfig[battle.result];
        return (
          <div
            key={i}
            className={cn(
              'rounded-full flex items-center justify-center font-bold border',
              config.bg,
              config.text,
              config.border,
              sizeClasses[size]
            )}
            title={battle.pnlPercent !== undefined ? `${battle.pnlPercent.toFixed(1)}% PnL` : undefined}
          >
            {config.label}
          </div>
        );
      })}
    </div>
  );
}
