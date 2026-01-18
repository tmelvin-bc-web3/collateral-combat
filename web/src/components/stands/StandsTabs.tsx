'use client';

import { Radio, Clock, Target, Trophy, BarChart3 } from 'lucide-react';
import { StandsTab } from './types';

interface StandsTabsProps {
  activeTab: StandsTab;
  onTabChange: (tab: StandsTab) => void;
  liveBattlesCount: number;
  upcomingCount: number;
  activeBetsCount: number;
}

const TAB_CONFIG: Record<StandsTab, {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}> = {
  live: { icon: Radio, label: 'Live Now' },
  upcoming: { icon: Clock, label: 'Upcoming' },
  mybets: { icon: Target, label: 'My Bets' },
  results: { icon: Trophy, label: 'Results' },
  leaderboard: { icon: BarChart3, label: 'Top Bettors' },
};

export function StandsTabs({
  activeTab,
  onTabChange,
  liveBattlesCount,
  upcomingCount,
  activeBetsCount,
}: StandsTabsProps) {
  const getBadgeCount = (tab: StandsTab): number | null => {
    switch (tab) {
      case 'live':
        return liveBattlesCount > 0 ? liveBattlesCount : null;
      case 'upcoming':
        return upcomingCount > 0 ? upcomingCount : null;
      case 'mybets':
        return activeBetsCount > 0 ? activeBetsCount : null;
      default:
        return null;
    }
  };

  return (
    <div className="flex gap-2 mb-4 pb-4 border-b border-white/[0.06] overflow-x-auto">
      {(Object.keys(TAB_CONFIG) as StandsTab[]).map((tab) => {
        const { icon: Icon, label } = TAB_CONFIG[tab];
        const badge = getBadgeCount(tab);
        const isActive = activeTab === tab;

        return (
          <button
            key={tab}
            onClick={() => onTabChange(tab)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold whitespace-nowrap transition-all ${
              isActive
                ? 'bg-warning text-black'
                : 'bg-white/5 border border-white/[0.06] text-white/50 hover:text-white hover:border-white/20'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
            {badge !== null && (
              <span
                className={`px-1.5 py-0.5 rounded-full text-[11px] font-bold ${
                  isActive ? 'bg-black/20' : 'bg-white/10'
                }`}
              >
                {badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
