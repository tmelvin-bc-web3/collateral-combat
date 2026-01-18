'use client';

import { TrendingUp, TrendingDown, CheckCircle } from 'lucide-react';
import { OpponentActivityFeedProps, ActivityEvent } from './types';

function formatTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}

function ActivityItem({ event }: { event: ActivityEvent }) {
  const isOpen = event.type === 'open';
  const isLong = event.side === 'long';

  return (
    <div className="flex items-center gap-2 py-2 px-3 rounded-lg bg-white/[0.02] hover:bg-white/[0.04] transition-colors">
      {/* Icon */}
      <div className={`flex-shrink-0 ${isOpen ? (isLong ? 'text-success' : 'text-danger') : 'text-white/60'}`}>
        {isOpen ? (
          isLong ? (
            <TrendingUp className="w-4 h-4" />
          ) : (
            <TrendingDown className="w-4 h-4" />
          )
        ) : (
          <CheckCircle className="w-4 h-4" />
        )}
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <span className="text-xs text-white/80">
          {isOpen ? 'Opened ' : 'Closed '}
          <span className={isLong ? 'text-success font-medium' : 'text-danger font-medium'}>
            {event.side.toUpperCase()}
          </span>
          {' '}
          <span className="text-white font-medium">{event.asset}</span>
          {' '}
          <span className="text-warning">{event.leverage}x</span>
        </span>
      </div>

      {/* P&L (for closes) or Time */}
      <div className="flex-shrink-0 text-right">
        {!isOpen && event.pnl !== undefined ? (
          <span className={`text-xs font-medium ${event.pnl >= 0 ? 'text-success' : 'text-danger'}`}>
            {event.pnl >= 0 ? '+' : ''}${event.pnl.toFixed(2)}
          </span>
        ) : (
          <span className="text-[10px] text-white/40">{formatTimeAgo(event.timestamp)}</span>
        )}
      </div>
    </div>
  );
}

export function OpponentActivityFeed({ activity, opponentName }: OpponentActivityFeedProps) {
  return (
    <div className="flex flex-col h-full bg-[#0d0d0d] rounded-lg border border-white/[0.06]">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-white/[0.06]">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-danger opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-danger"></span>
        </span>
        <span className="text-xs font-semibold text-white/60 uppercase tracking-wider">
          {opponentName}&apos;s Activity
        </span>
      </div>

      {/* Activity List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {activity.length > 0 ? (
          activity.map((event) => <ActivityItem key={event.id} event={event} />)
        ) : (
          <div className="flex flex-col items-center justify-center h-full py-4 text-center">
            <div className="text-white/20 mb-2">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div className="text-xs text-white/40">No activity yet</div>
            <div className="text-[10px] text-white/30">Waiting for opponent&apos;s first move...</div>
          </div>
        )}
      </div>
    </div>
  );
}
