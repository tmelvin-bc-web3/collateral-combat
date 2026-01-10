'use client';

import { useEffect, useState } from 'react';
import { useReferralClaim } from '@/hooks/useReferralClaim';

export function ReferralClaimHandler() {
  const { claimStatus, errorMessage } = useReferralClaim();
  const [showNotification, setShowNotification] = useState(false);

  useEffect(() => {
    if (claimStatus === 'claimed') {
      setShowNotification(true);
      const timer = setTimeout(() => setShowNotification(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [claimStatus]);

  if (!showNotification) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 animate-slide-up">
      <div className="bg-success/20 border border-success/40 rounded-lg px-4 py-3 shadow-lg backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <svg className="w-5 h-5 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <div className="text-sm font-medium text-success">Referral Applied!</div>
            <div className="text-xs text-success/70">You have a 9% rake discount for 7 days</div>
          </div>
          <button
            onClick={() => setShowNotification(false)}
            className="text-success/70 hover:text-success transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
