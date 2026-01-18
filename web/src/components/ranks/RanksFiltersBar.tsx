'use client';

import { Search, X, Swords, Target, Skull, Castle, Eye } from 'lucide-react';
import {
  TimeFilter,
  GameMode,
  RankCategory,
  GAME_MODE_OPTIONS,
  CATEGORY_OPTIONS,
  TIME_FILTER_OPTIONS,
} from './types';

interface RanksFiltersBarProps {
  gameMode: GameMode;
  timeFilter: TimeFilter;
  category: RankCategory;
  searchQuery: string;
  onGameModeChange: (mode: GameMode) => void;
  onTimeFilterChange: (filter: TimeFilter) => void;
  onCategoryChange: (category: RankCategory) => void;
  onSearchChange: (query: string) => void;
}

function getGameModeIcon(mode: GameMode) {
  switch (mode) {
    case 'arena': return <Swords className="w-4 h-4" />;
    case 'token-wars': return <Target className="w-4 h-4" />;
    case 'lds': return <Skull className="w-4 h-4" />;
    case 'war-party': return <Castle className="w-4 h-4" />;
    case 'spectate': return <Eye className="w-4 h-4" />;
    default: return null;
  }
}

export function RanksFiltersBar({
  gameMode,
  timeFilter,
  category,
  searchQuery,
  onGameModeChange,
  onTimeFilterChange,
  onCategoryChange,
  onSearchChange,
}: RanksFiltersBarProps) {
  return (
    <div className="flex flex-wrap items-end gap-4 mb-6">
      {/* Game Mode Filter */}
      <div className="flex flex-col gap-1">
        <label className="text-[11px] text-white/40 uppercase tracking-wider">Game Mode</label>
        <select
          value={gameMode}
          onChange={(e) => onGameModeChange(e.target.value as GameMode)}
          className="px-3 py-2 pr-8 bg-[#1a1a1a] border border-white/[0.06] rounded-lg text-sm text-white cursor-pointer focus:outline-none focus:border-warning/50 appearance-none"
          style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23666'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.5rem center', backgroundSize: '1.25rem' }}
        >
          {GAME_MODE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {/* Time Period Tabs */}
      <div className="flex gap-1 p-1 bg-[#1a1a1a] border border-white/[0.06] rounded-lg">
        {TIME_FILTER_OPTIONS.map((option) => (
          <button
            key={option.value}
            onClick={() => onTimeFilterChange(option.value)}
            className={`px-3.5 py-1.5 rounded-md text-[13px] font-medium transition-all ${
              timeFilter === option.value
                ? 'bg-warning text-black'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {/* Category Filter */}
      <div className="flex flex-col gap-1">
        <label className="text-[11px] text-white/40 uppercase tracking-wider">Ranked By</label>
        <select
          value={category}
          onChange={(e) => onCategoryChange(e.target.value as RankCategory)}
          className="px-3 py-2 pr-8 bg-[#1a1a1a] border border-white/[0.06] rounded-lg text-sm text-white cursor-pointer focus:outline-none focus:border-warning/50 appearance-none"
          style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23666'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.5rem center', backgroundSize: '1.25rem' }}
        >
          {CATEGORY_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {/* Search */}
      <div className="flex-1 min-w-[200px]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search by username or wallet..."
            className="w-full pl-10 pr-10 py-2 bg-[#1a1a1a] border border-white/[0.06] rounded-lg text-sm text-white placeholder-white/40 focus:outline-none focus:border-warning/50"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/60 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
