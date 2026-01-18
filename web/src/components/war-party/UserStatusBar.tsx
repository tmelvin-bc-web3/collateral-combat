'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { UserEnrollment } from './types';

interface UserStatusBarProps {
  enrollment: UserEnrollment;
}

export function UserStatusBar({ enrollment }: UserStatusBarProps) {
  const {
    tier,
    entryId,
    position,
    totalInTier,
    performance,
    estimatedPayout,
    isInMoney,
  } = enrollment;

  return (
    <div className="bg-gradient-to-r from-warning/10 to-warning/5 border border-warning/30 rounded-xl p-4 mb-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Position */}
        <div className="text-center">
          <div className="text-[11px] text-white/40 uppercase tracking-wider mb-0.5">
            Your Position
          </div>
          <div className="text-xl font-bold text-warning">
            #{position}{' '}
            <span className="text-sm text-white/50 font-normal">of {totalInTier}</span>
          </div>
        </div>

        {/* Performance */}
        <div className="text-center">
          <div className="text-[11px] text-white/40 uppercase tracking-wider mb-0.5">
            Portfolio
          </div>
          <div
            className={`text-xl font-bold ${
              performance >= 0 ? 'text-success' : 'text-danger'
            }`}
          >
            {performance >= 0 ? '+' : ''}
            {performance.toFixed(1)}%
          </div>
        </div>

        {/* Tier Badge */}
        <div className="text-center">
          <div className="px-3 py-1.5 bg-white/5 rounded-lg">
            <span className="text-sm font-semibold text-warning">{tier}</span>
          </div>
        </div>

        {/* Estimated Payout */}
        <div className="text-center">
          <div className="text-[11px] text-white/40 uppercase tracking-wider mb-0.5">
            Est. Payout
          </div>
          <div
            className={`text-base font-semibold ${
              isInMoney ? 'text-success' : 'text-white/50'
            }`}
          >
            {isInMoney ? `~${estimatedPayout.toFixed(2)} SOL` : 'Outside top 10%'}
          </div>
        </div>

        {/* View Squad Button */}
        <Link
          href={`/draft/entry/${entryId}`}
          className="flex items-center gap-2 px-5 py-2.5 bg-warning text-black rounded-lg font-semibold text-sm hover:bg-warning/90 transition-colors"
        >
          View My Squad
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
