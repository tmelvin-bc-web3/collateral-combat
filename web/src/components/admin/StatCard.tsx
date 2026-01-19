'use client';

import { cn } from '@/lib/utils';
import { ReactNode } from 'react';

interface StatCardProps {
  label: string;
  value: string | number | ReactNode;
  sublabel?: string;
  icon?: ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  variant?: 'default' | 'warning' | 'success' | 'danger';
  className?: string;
}

const variantStyles = {
  default: 'text-white',
  warning: 'text-warning',
  success: 'text-success',
  danger: 'text-danger',
};

export function StatCard({
  label,
  value,
  sublabel,
  icon,
  trend,
  variant = 'default',
  className,
}: StatCardProps) {
  return (
    <div
      className={cn(
        'bg-black/60 border border-white/10 rounded-xl p-4 transition-all hover:border-white/20',
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-white/60 text-sm mb-1">{label}</p>
          <div className={cn('text-3xl font-bold', variantStyles[variant])}>
            {typeof value === 'number' ? value.toLocaleString() : value}
          </div>
          {sublabel && (
            <p className="text-white/40 text-xs mt-1">{sublabel}</p>
          )}
          {trend && (
            <p
              className={cn(
                'text-xs mt-1 flex items-center gap-1',
                trend.isPositive ? 'text-success' : 'text-danger'
              )}
            >
              <span>{trend.isPositive ? '↑' : '↓'}</span>
              <span>{Math.abs(trend.value)}%</span>
            </p>
          )}
        </div>
        {icon && (
          <div className="text-white/40 ml-3">{icon}</div>
        )}
      </div>
    </div>
  );
}
