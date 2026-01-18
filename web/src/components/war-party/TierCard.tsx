'use client';

import { Swords, Coins, Users, Check } from 'lucide-react';
import Link from 'next/link';
import { TierData, TIER_CONFIG, WarPartyPhase } from './types';

interface TierCardProps {
  tier: TierData;
  tierKey: string;
  phase: WarPartyPhase;
  userEntryId: string | null;
  isEnrolled: boolean;
  hasOtherEnrollment: boolean;
  onJoin: () => void;
}

export function TierCard({
  tier,
  tierKey,
  phase,
  userEntryId,
  isEnrolled,
  hasOtherEnrollment,
  onJoin,
}: TierCardProps) {
  const config = TIER_CONFIG[tierKey];
  if (!config) return null;

  const { name, tagline, entryFee, color } = config;
  const { warriors, prizePool } = tier;

  // Calculate estimated payout per winner (top 10%)
  const winnersCount = Math.max(1, Math.ceil(warriors * 0.1));
  const estimatedPayout = warriors >= 10
    ? (prizePool * 0.95) / winnersCount
    : 0;

  // Determine CTA state
  const getCTA = () => {
    if (isEnrolled && userEntryId) {
      return (
        <Link
          href={`/draft/entry/${userEntryId}`}
          className={`w-full py-3 rounded-xl font-semibold text-center transition-all border-2 border-${color} text-${color} hover:bg-${color}/10`}
        >
          View My Squad
        </Link>
      );
    }

    if (hasOtherEnrollment) {
      return (
        <button
          disabled
          className="w-full py-3 rounded-xl font-semibold text-center bg-white/5 border border-white/[0.06] text-white/30 cursor-not-allowed"
        >
          Already Enlisted
        </button>
      );
    }

    if (phase !== 'enrollment') {
      return (
        <button
          disabled
          className="w-full py-3 rounded-xl font-semibold text-center bg-white/5 border border-white/[0.06] text-white/30 cursor-not-allowed"
        >
          Enrollment Closed
        </button>
      );
    }

    return (
      <button
        onClick={onJoin}
        className="w-full py-3 rounded-xl font-semibold text-center transition-all flex items-center justify-center gap-2"
        style={{
          background: 'linear-gradient(135deg, #ff6b00 0%, #ff4500 50%, #ff3131 100%)',
          boxShadow: '0 4px 15px rgba(255, 107, 0, 0.3)',
        }}
      >
        <Swords className="w-4 h-4" />
        Join the War
      </button>
    );
  };

  return (
    <div
      className={`relative bg-[#1a1a1a] border-2 rounded-2xl p-5 transition-all hover:translate-y-[-4px] ${
        isEnrolled
          ? `border-${color} bg-gradient-to-br from-${color}/5 to-transparent`
          : 'border-white/[0.06] hover:border-white/10'
      }`}
    >
      {/* Entry Fee Badge */}
      <div
        className={`absolute -top-3 left-1/2 -translate-x-1/2 flex items-baseline gap-1 px-4 py-1.5 bg-[#1a1a1a] border-2 border-${color} rounded-full`}
      >
        <span className={`text-xl font-bold text-${color}`}>{entryFee}</span>
        <span className="text-xs text-white/50">SOL</span>
      </div>

      {/* Enrolled Badge */}
      {isEnrolled && (
        <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-1 bg-success rounded text-[11px] font-bold text-white uppercase">
          <Check className="w-3 h-3" />
          Enlisted
        </div>
      )}

      {/* Header */}
      <div className="text-center mt-4 mb-5">
        <h3 className="text-xl font-bold uppercase tracking-wide">{name}</h3>
        <p className="text-xs text-white/50 mt-1">{tagline}</p>
      </div>

      {/* Stats */}
      <div className="flex justify-around py-4 border-t border-b border-white/[0.06] mb-4">
        <div className="flex items-center gap-2">
          <Users className={`w-5 h-5 text-${color}`} />
          <div className="flex flex-col">
            <span className="text-lg font-bold">{warriors}</span>
            <span className="text-[11px] text-white/40">Warriors</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Coins className="w-5 h-5 text-success" />
          <div className="flex flex-col">
            <span className="text-lg font-bold text-success">{prizePool.toFixed(1)} SOL</span>
            <span className="text-[11px] text-white/40">War Chest</span>
          </div>
        </div>
      </div>

      {/* Payout Preview */}
      <div className="text-center mb-4">
        <div className="text-xs text-white/40 mb-1">Top 10% Split the Chest</div>
        <div className={`text-sm font-semibold text-${color}`}>
          {warriors >= 10
            ? `~${estimatedPayout.toFixed(2)} SOL each`
            : `Need ${10 - warriors} more warriors`}
        </div>
      </div>

      {/* CTA */}
      {getCTA()}
    </div>
  );
}
