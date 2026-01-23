'use client';

import { PositionSide } from '@/types';

interface LiquidationIndicatorProps {
  distance: number; // Percentage distance to liquidation (e.g., 5.2 = 5.2%)
  side: PositionSide;
}

type LiquidationStatus = 'critical' | 'warning' | 'caution' | 'safe';

function getStatus(distance: number): LiquidationStatus {
  if (distance < 2) return 'critical';
  if (distance < 5) return 'warning';
  if (distance < 10) return 'caution';
  return 'safe';
}

function getStatusConfig(status: LiquidationStatus) {
  switch (status) {
    case 'critical':
      return {
        bgColor: 'bg-red-500/20',
        barColor: 'bg-red-500',
        textColor: 'text-red-500',
        borderColor: 'border-red-500/50',
        icon: (
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.47 2 2 6.47 2 12s4.47 10 10 10 10-4.47 10-10S17.53 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm3.59-13L12 10.59 8.41 7 7 8.41 10.59 12 7 15.59 8.41 17 12 13.41 15.59 17 17 15.59 13.41 12 17 8.41z"/>
          </svg>
        ),
        label: 'CRITICAL',
        animate: true,
      };
    case 'warning':
      return {
        bgColor: 'bg-orange-500/20',
        barColor: 'bg-orange-500',
        textColor: 'text-orange-500',
        borderColor: 'border-orange-500/50',
        icon: (
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
          </svg>
        ),
        label: 'WARNING',
        animate: false,
      };
    case 'caution':
      return {
        bgColor: 'bg-yellow-500/20',
        barColor: 'bg-yellow-500',
        textColor: 'text-yellow-500',
        borderColor: 'border-yellow-500/50',
        icon: (
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
          </svg>
        ),
        label: 'CAUTION',
        animate: false,
      };
    case 'safe':
      return {
        bgColor: 'bg-green-500/20',
        barColor: 'bg-green-500',
        textColor: 'text-green-500',
        borderColor: 'border-green-500/50',
        icon: (
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z"/>
          </svg>
        ),
        label: 'SAFE',
        animate: false,
      };
  }
}

export function LiquidationIndicator({ distance, side }: LiquidationIndicatorProps) {
  const status = getStatus(distance);
  const config = getStatusConfig(status);

  // Progress bar fills inversely (closer to liquidation = more filled)
  // Max distance for display purposes is 20%, so normalize to 0-100%
  const normalizedDistance = Math.min(distance, 20);
  const fillPercent = Math.max(0, Math.min(100, ((20 - normalizedDistance) / 20) * 100));

  return (
    <div className={`flex items-center gap-2 px-2 py-1 rounded-md border ${config.bgColor} ${config.borderColor} ${config.animate ? 'animate-pulse' : ''}`}>
      {/* Icon */}
      <span className={config.textColor}>
        {config.icon}
      </span>

      {/* Distance + Progress */}
      <div className="flex flex-col gap-0.5 min-w-[60px]">
        {/* Distance percentage */}
        <div className="flex items-center justify-between">
          <span className={`text-[10px] font-bold ${config.textColor}`}>
            {distance.toFixed(1)}%
          </span>
        </div>

        {/* Progress bar (inverse - fills as liquidation approaches) */}
        <div className="h-1 w-full bg-black/30 rounded-full overflow-hidden">
          <div
            className={`h-full ${config.barColor} transition-all duration-300`}
            style={{ width: `${fillPercent}%` }}
          />
        </div>
      </div>
    </div>
  );
}
