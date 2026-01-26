'use client';

import { useState } from 'react';
import Image from 'next/image';
import { PRESET_PFPS, getPresetsByCategory } from '@/data/presetPFPs';
import { PresetPFP } from '@/types';

interface ProfilePickerPresetsProps {
  selectedId: string | null;
  onSelect: (preset: PresetPFP) => void;
}

type Category = 'all' | 'solana' | 'crypto' | 'degen';

const CATEGORY_LABELS: Record<Category, string> = {
  all: 'All',
  solana: 'Solana',
  crypto: 'Crypto',
  degen: 'Degen',
};

export function ProfilePickerPresets({
  selectedId,
  onSelect,
}: ProfilePickerPresetsProps) {
  const [category, setCategory] = useState<Category>('all');

  const presets =
    category === 'all'
      ? PRESET_PFPS
      : getPresetsByCategory(category as 'solana' | 'crypto' | 'degen');

  return (
    <div>
      {/* Category filter */}
      <div className="flex gap-2 mb-4">
        {(['all', 'solana', 'crypto', 'degen'] as Category[]).map((cat) => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              category === cat
                ? 'bg-accent text-white'
                : 'bg-bg-tertiary text-text-secondary hover:text-text-primary'
            }`}
          >
            {CATEGORY_LABELS[cat]}
          </button>
        ))}
      </div>

      {/* Presets grid */}
      <div className="grid grid-cols-4 gap-3">
        {presets.map((preset) => (
          <button
            key={preset.id}
            onClick={() => onSelect(preset)}
            className={`relative aspect-square rounded-xl overflow-hidden transition-all ${
              selectedId === preset.id
                ? 'ring-2 ring-accent ring-offset-2 ring-offset-bg-primary'
                : 'hover:ring-2 hover:ring-border-primary'
            }`}
          >
            <Image
              src={preset.image}
              alt={preset.name}
              fill
              className="object-cover"
              unoptimized
            />
            {selectedId === preset.id && (
              <div className="absolute inset-0 bg-accent/20 flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-accent"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={3}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
