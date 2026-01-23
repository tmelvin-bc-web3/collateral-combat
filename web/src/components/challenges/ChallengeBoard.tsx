'use client';

import { useState } from 'react';
import { ChallengeCard } from './ChallengeCard';
import { Plus, Filter } from 'lucide-react';

interface Challenge {
  id: string;
  code: string;
  challengerWallet: string;
  challengerUsername?: string;
  entryFee: number;
  duration: number;
  leverage: number;
  expiresAt: number;
}

interface ChallengeBoardProps {
  challenges: Challenge[];
  currentWallet?: string;
  onAccept: (code: string) => void;
  onCreateChallenge: () => void;
  loading?: boolean;
}

const STAKE_FILTERS = [
  { label: 'All', min: undefined, max: undefined },
  { label: '< 0.1 SOL', min: undefined, max: 0.1 },
  { label: '0.1 - 0.5 SOL', min: 0.1, max: 0.5 },
  { label: '0.5 - 1 SOL', min: 0.5, max: 1 },
  { label: '> 1 SOL', min: 1, max: undefined },
];

export function ChallengeBoard({
  challenges,
  currentWallet,
  onAccept,
  onCreateChallenge,
  loading,
}: ChallengeBoardProps) {
  const [stakeFilter, setStakeFilter] = useState(0);

  const filteredChallenges = challenges.filter(c => {
    const filter = STAKE_FILTERS[stakeFilter];
    if (filter.min !== undefined && c.entryFee < filter.min) return false;
    if (filter.max !== undefined && c.entryFee > filter.max) return false;
    return true;
  });

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-black text-white">Challenge Board</h2>
          <p className="text-sm text-white/40">Accept a fight or create your own</p>
        </div>
        <button
          onClick={onCreateChallenge}
          className="flex items-center gap-2 px-4 py-2 bg-warning text-black font-bold rounded-lg hover:bg-warning/80 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Create Challenge
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 mb-4">
        <Filter className="w-4 h-4 text-white/40" />
        <div className="flex gap-2 flex-wrap">
          {STAKE_FILTERS.map((filter, idx) => (
            <button
              key={filter.label}
              onClick={() => setStakeFilter(idx)}
              className={`px-3 py-1 text-xs rounded-full transition-colors ${
                stakeFilter === idx
                  ? 'bg-warning text-black font-bold'
                  : 'bg-white/10 text-white/60 hover:bg-white/20'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="text-center py-12 text-white/40">Loading challenges...</div>
      ) : filteredChallenges.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-white/40 mb-4">No open challenges</p>
          <button
            onClick={onCreateChallenge}
            className="px-4 py-2 bg-white/10 text-white font-medium rounded-lg hover:bg-white/20 transition-colors"
          >
            Be the first to create one
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredChallenges.map(challenge => (
            <ChallengeCard
              key={challenge.id}
              challenge={challenge}
              onAccept={onAccept}
              isOwnChallenge={currentWallet === challenge.challengerWallet}
            />
          ))}
        </div>
      )}
    </div>
  );
}
