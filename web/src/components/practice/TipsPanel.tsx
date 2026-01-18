'use client';

import { Lightbulb, RefreshCw } from 'lucide-react';
import { TipsPanelProps } from './types';

export function TipsPanel({ currentTip, onRefresh, category, onCategoryChange }: TipsPanelProps) {
  const categories: Array<{ key: 'basics' | 'strategy' | 'risk'; label: string }> = [
    { key: 'basics', label: 'Basics' },
    { key: 'strategy', label: 'Strategy' },
    { key: 'risk', label: 'Risk Mgmt' },
  ];

  return (
    <div className="bg-[#0d0d0d] border border-white/[0.06] rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
        <div className="flex items-center gap-2">
          <Lightbulb className="w-4 h-4 text-warning" />
          <h3 className="text-sm font-bold text-white/80">Tips & Strategy</h3>
        </div>
        <button
          onClick={onRefresh}
          className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-all"
          title="Get new tip"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Tip Content */}
      <div className="p-4">
        <p className="text-sm text-white/70 leading-relaxed mb-2">
          {currentTip.text}
        </p>
        {currentTip.example && (
          <div className="mt-3 p-3 rounded-lg bg-white/5 border border-white/10">
            <span className="text-[10px] text-white/40 uppercase tracking-wider">Example</span>
            <p className="text-xs text-white/60 mt-1">{currentTip.example}</p>
          </div>
        )}
      </div>

      {/* Category Tabs */}
      <div className="flex border-t border-white/[0.06]">
        {categories.map((cat) => (
          <button
            key={cat.key}
            onClick={() => onCategoryChange(cat.key)}
            className={`flex-1 py-2 text-xs font-medium transition-all ${
              category === cat.key
                ? 'text-warning bg-warning/10'
                : 'text-white/40 hover:text-white/60 hover:bg-white/5'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>
    </div>
  );
}
