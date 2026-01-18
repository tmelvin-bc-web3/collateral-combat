'use client';

import { Trophy, TrendingUp, Award, User } from 'lucide-react';
import { RanksTab } from './types';

interface RanksTabsProps {
  activeTab: RanksTab;
  onTabChange: (tab: RanksTab) => void;
  newAchievements?: number;
}

const TABS: { id: RanksTab; label: string; icon: typeof Trophy }[] = [
  { id: 'leaderboard', label: 'Leaderboard', icon: Trophy },
  { id: 'progression', label: 'Progression', icon: TrendingUp },
  { id: 'achievements', label: 'Achievements', icon: Award },
  { id: 'profile', label: 'My Profile', icon: User },
];

export function RanksTabs({ activeTab, onTabChange, newAchievements = 0 }: RanksTabsProps) {
  return (
    <div className="flex items-center gap-1 p-1 bg-[#1a1a1a] border border-white/[0.06] rounded-xl mb-6 overflow-x-auto">
      {TABS.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        const showBadge = tab.id === 'achievements' && newAchievements > 0;

        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`relative flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
              isActive
                ? 'bg-warning text-black'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
          >
            <Icon className="w-4 h-4" />
            <span>{tab.label}</span>
            {showBadge && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-danger text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {newAchievements}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
