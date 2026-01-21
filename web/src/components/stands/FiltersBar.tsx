'use client';

import { ChevronDown } from 'lucide-react';
import { GameType, TierFilter, SortOption, GAME_OPTIONS, TIER_OPTIONS, SORT_OPTIONS } from './types';

interface FiltersBarProps {
  gameFilter: string;
  tierFilter: TierFilter;
  sortBy: SortOption;
  onGameFilterChange: (value: string) => void;
  onTierFilterChange: (value: TierFilter) => void;
  onSortChange: (value: SortOption) => void;
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1 flex-1 sm:flex-none min-w-[100px]">
      <label className="text-[10px] sm:text-[11px] text-white/40 uppercase tracking-wider">{label}</label>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="appearance-none w-full min-h-[44px] px-3 py-2 pr-8 bg-white/5 border border-white/10 rounded-lg text-sm text-base text-white cursor-pointer hover:border-warning/50 focus:border-warning focus:outline-none transition-colors touch-manipulation"
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} className="bg-[#1a1a1a]">
              {opt.label}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 pointer-events-none" />
      </div>
    </div>
  );
}

export function FiltersBar({
  gameFilter,
  tierFilter,
  sortBy,
  onGameFilterChange,
  onTierFilterChange,
  onSortChange,
}: FiltersBarProps) {
  return (
    <div className="flex gap-2 sm:gap-4 mb-4 sm:mb-6 flex-wrap">
      <FilterSelect
        label="Game Type"
        value={gameFilter}
        options={GAME_OPTIONS}
        onChange={onGameFilterChange}
      />
      <FilterSelect
        label="Tier"
        value={tierFilter}
        options={TIER_OPTIONS}
        onChange={(v) => onTierFilterChange(v as TierFilter)}
      />
      <FilterSelect
        label="Sort By"
        value={sortBy}
        options={SORT_OPTIONS}
        onChange={(v) => onSortChange(v as SortOption)}
      />
    </div>
  );
}
