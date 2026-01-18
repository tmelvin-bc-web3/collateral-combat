'use client';

import { useState } from 'react';
import { Coins, Rocket, Skull, Flame, Crown, Trophy, Radio } from 'lucide-react';
import { ActivityItem } from './types';

interface LiveActivityFeedProps {
  activities: ActivityItem[];
  eventsLastHour?: number;
}

type FilterType = 'all' | 'big_wins' | 'streaks';

export function LiveActivityFeed({ activities, eventsLastHour = 0 }: LiveActivityFeedProps) {
  const [filter, setFilter] = useState<FilterType>('all');

  const filteredActivities = activities.filter(activity => {
    if (filter === 'all') return true;
    if (filter === 'big_wins') return activity.type === 'big_win' || activity.type === 'victory';
    if (filter === 'streaks') return activity.type === 'streak';
    return true;
  });

  return (
    <section className="mb-14">
      {/* Section Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Radio className="w-4 h-4 text-danger animate-pulse" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-white/60">Live Activity</h2>
        </div>
        <div className="flex items-center gap-2">
          <FilterButton
            label="All"
            active={filter === 'all'}
            onClick={() => setFilter('all')}
          />
          <FilterButton
            label="Big Wins"
            active={filter === 'big_wins'}
            onClick={() => setFilter('big_wins')}
          />
          <FilterButton
            label="Streaks"
            active={filter === 'streaks'}
            onClick={() => setFilter('streaks')}
          />
        </div>
      </div>

      {/* Feed Container */}
      <div className="bg-[#1a1a1a] border border-white/[0.06] rounded-xl overflow-hidden">
        <div className="max-h-[400px] overflow-y-auto">
          {filteredActivities.map((activity, index) => (
            <ActivityFeedItem
              key={activity.id}
              activity={activity}
              isFirst={index === 0}
            />
          ))}
          {filteredActivities.length === 0 && (
            <div className="p-8 text-center text-white/40">
              No recent activity matching filter
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 bg-white/[0.02] border-t border-white/[0.06] flex items-center justify-center">
          <span className="text-[10px] text-white/40 flex items-center gap-2">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-success"></span>
            </span>
            Auto-updating • {eventsLastHour} events in last hour
          </span>
        </div>
      </div>
    </section>
  );
}

function FilterButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors ${
        active
          ? 'bg-white/10 text-white'
          : 'text-white/40 hover:text-white/60'
      }`}
    >
      {label}
    </button>
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
      className={`flex items-center gap-3 px-4 py-3 border-b border-white/[0.04] last:border-b-0 ${
        isFirst ? 'animate-slideIn bg-white/[0.02]' : ''
      } hover:bg-white/[0.02] transition-colors`}
    >
      {/* Icon */}
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${bgColor}`}>
        <span className={iconColor}>{icon}</span>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-white/90 text-sm">{activity.user.username}</span>
          <span className="text-white/40 text-sm">{getActionText(activity.type)}</span>
          {activity.amount !== undefined && (
            <span className={`font-bold text-sm ${activity.type === 'big_win' || activity.type === 'victory' ? 'text-warning' : 'text-success'}`}>
              +{activity.amount.toFixed(2)} SOL
            </span>
          )}
          {activity.type === 'streak' && activity.context && (
            <span className="text-fire font-bold text-sm">{activity.context}</span>
          )}
          <span className="text-white/50 text-sm">in {activity.game}</span>
          {activity.type === 'elimination' && activity.context && (
            <span className="text-white/40 text-xs">({activity.context})</span>
          )}
        </div>
      </div>

      {/* Time */}
      <div className="text-[10px] text-white/30 whitespace-nowrap">{timeAgo}</div>
    </div>
  );
}

function getActivityStyle(type: ActivityItem['type']) {
  switch (type) {
    case 'win':
      return {
        icon: <Coins className="w-4 h-4" />,
        iconColor: 'text-success',
        bgColor: 'bg-success/10',
      };
    case 'big_win':
      return {
        icon: <Flame className="w-4 h-4" />,
        iconColor: 'text-warning',
        bgColor: 'bg-warning/10',
      };
    case 'join':
      return {
        icon: <Rocket className="w-4 h-4" />,
        iconColor: 'text-sky-400',
        bgColor: 'bg-sky-400/10',
      };
    case 'elimination':
      return {
        icon: <Skull className="w-4 h-4" />,
        iconColor: 'text-danger',
        bgColor: 'bg-danger/10',
      };
    case 'streak':
      return {
        icon: <Flame className="w-4 h-4" />,
        iconColor: 'text-fire',
        bgColor: 'bg-fire/10',
      };
    case 'victory':
      return {
        icon: <Crown className="w-4 h-4" />,
        iconColor: 'text-warning',
        bgColor: 'bg-warning/10',
      };
    default:
      return {
        icon: <Trophy className="w-4 h-4" />,
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
      return 'crushed it with';
    case 'join':
      return 'joined';
    case 'elimination':
      return 'eliminated from';
    case 'streak':
      return 'is on a';
    case 'victory':
      return 'won';
    default:
      return '';
  }
}

function getTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  return `${Math.floor(minutes / 60)}h ago`;
}
