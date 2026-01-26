'use client';

import { useState } from 'react';
import { Coins, Rocket, Skull, Flame, Crown, Trophy, Radio, ChevronDown, ChevronUp, X } from 'lucide-react';
import { ActivityItem } from './types';

interface FloatingActivityFeedProps {
  activities: ActivityItem[];
}

export function FloatingActivityFeed({ activities }: FloatingActivityFeedProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className="fixed bottom-24 right-4 z-30 flex items-center gap-2 px-3 py-2 rounded-lg bg-black/90 border border-white/10 text-white/60 hover:text-white hover:border-white/20 transition-all shadow-xl"
      >
        <Radio className="w-4 h-4 text-danger animate-pulse" />
        <span className="text-xs font-bold uppercase tracking-wider">Live Feed</span>
      </button>
    );
  }

  return (
    <div className="fixed bottom-24 right-4 z-30 w-80 max-w-[calc(100vw-2rem)] shadow-2xl">
      {/* Header - always visible */}
      <div
        className="flex items-center justify-between px-4 py-3 bg-black/95 border border-white/10 rounded-t-xl cursor-pointer hover:bg-white/5 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <Radio className="w-4 h-4 text-danger animate-pulse" />
          <span className="text-sm font-bold uppercase tracking-wider text-white/80">Live Activity</span>
          <span className="text-[10px] text-white/40">({activities.length})</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsVisible(false);
            }}
            className="p-1 text-white/40 hover:text-white/60 transition-colors"
            aria-label="Close activity feed"
          >
            <X className="w-4 h-4" />
          </button>
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-white/40" />
          ) : (
            <ChevronUp className="w-4 h-4 text-white/40" />
          )}
        </div>
      </div>

      {/* Expandable content */}
      {isExpanded && (
        <div className="bg-black/95 border border-t-0 border-white/10 rounded-b-xl overflow-hidden">
          <div className="max-h-[300px] overflow-y-auto">
            {activities.slice(0, 10).map((activity, index) => (
              <ActivityFeedItem
                key={activity.id}
                activity={activity}
                isFirst={index === 0}
              />
            ))}
            {activities.length === 0 && (
              <div className="p-6 text-center text-white/40 text-sm">
                No recent activity
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2 bg-white/[0.02] border-t border-white/[0.06] flex items-center justify-center">
            <span className="text-[10px] text-white/40 flex items-center gap-2">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-success"></span>
              </span>
              Auto-updating
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

function ActivityFeedItem({
  activity,
  isFirst,
}: {
  activity: ActivityItem;
  isFirst: boolean;
}) {
  const timeAgo = getTimeAgo(activity.timestamp);
  const { icon, iconColor, bgColor } = getActivityStyle(activity.type);

  return (
    <div
      className={`flex items-center gap-2 px-3 py-2 border-b border-white/[0.04] last:border-b-0 ${
        isFirst ? 'animate-slideIn bg-white/[0.02]' : ''
      } hover:bg-white/[0.02] transition-colors`}
    >
      {/* Icon */}
      <div className={`w-6 h-6 rounded flex items-center justify-center shrink-0 ${bgColor}`}>
        <span className={iconColor}>{icon}</span>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1 flex-wrap text-xs">
          <span className="font-medium text-white/90 truncate max-w-[80px]">{activity.user.username}</span>
          <span className="text-white/40">{getActionText(activity.type)}</span>
          {activity.amount !== undefined && (
            <span className={`font-bold ${activity.type === 'big_win' || activity.type === 'victory' ? 'text-warning' : 'text-success'}`}>
              +{activity.amount.toFixed(2)}
            </span>
          )}
          {activity.type === 'streak' && activity.context && (
            <span className="text-fire font-bold">{activity.context}</span>
          )}
        </div>
        <div className="text-[10px] text-white/30">{activity.game}</div>
      </div>

      {/* Time */}
      <div className="text-[10px] text-white/30 whitespace-nowrap shrink-0">{timeAgo}</div>
    </div>
  );
}

function getActivityStyle(type: ActivityItem['type']) {
  switch (type) {
    case 'win':
      return {
        icon: <Coins className="w-3 h-3" />,
        iconColor: 'text-success',
        bgColor: 'bg-success/10',
      };
    case 'big_win':
      return {
        icon: <Flame className="w-3 h-3" />,
        iconColor: 'text-warning',
        bgColor: 'bg-warning/10',
      };
    case 'join':
      return {
        icon: <Rocket className="w-3 h-3" />,
        iconColor: 'text-sky-400',
        bgColor: 'bg-sky-400/10',
      };
    case 'elimination':
      return {
        icon: <Skull className="w-3 h-3" />,
        iconColor: 'text-danger',
        bgColor: 'bg-danger/10',
      };
    case 'streak':
      return {
        icon: <Flame className="w-3 h-3" />,
        iconColor: 'text-fire',
        bgColor: 'bg-fire/10',
      };
    case 'victory':
      return {
        icon: <Crown className="w-3 h-3" />,
        iconColor: 'text-warning',
        bgColor: 'bg-warning/10',
      };
    default:
      return {
        icon: <Trophy className="w-3 h-3" />,
        iconColor: 'text-white/60',
        bgColor: 'bg-white/5',
      };
  }
}

function getActionText(type: ActivityItem['type']) {
  switch (type) {
    case 'win':
      return 'won';
    case 'big_win':
      return 'crushed';
    case 'join':
      return 'joined';
    case 'elimination':
      return 'out';
    case 'streak':
      return '';
    case 'victory':
      return 'won';
    default:
      return '';
  }
}

function getTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  return `${Math.floor(minutes / 60)}h`;
}
