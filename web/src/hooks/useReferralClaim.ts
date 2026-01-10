'use client';

import { useEffect, useState, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';
const STORAGE_KEY = 'pending_referral_code';

export function useReferralClaim() {
  const { publicKey } = useWallet();
  const walletAddress = publicKey?.toBase58() || '';
  const [claimStatus, setClaimStatus] = useState<'idle' | 'pending' | 'claimed' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Check URL for referral code on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const url = new URL(window.location.href);
    const refCode = url.searchParams.get('ref');

    if (refCode) {
      // Store the code for later claiming
      localStorage.setItem(STORAGE_KEY, refCode.toUpperCase());

      // Remove the ref param from URL to clean it up
      url.searchParams.delete('ref');
      window.history.replaceState({}, '', url.toString());
    }
  }, []);

  // Auto-claim when wallet connects
  useEffect(() => {
    if (!walletAddress) return;

    const pendingCode = localStorage.getItem(STORAGE_KEY);
    if (!pendingCode) return;

    const claimReferral = async () => {
      setClaimStatus('pending');
      try {
        const res = await fetch(`${BACKEND_URL}/api/referral/claim`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code: pendingCode,
            walletAddress,
          }),
        });

        if (res.ok) {
          localStorage.removeItem(STORAGE_KEY);
          setClaimStatus('claimed');
          console.log('[Referral] Successfully claimed referral code:', pendingCode);
        } else {
          const data = await res.json();
          // Don't treat "already have a referrer" as an error - just clear the code
          if (data.error?.includes('already have a referrer')) {
            localStorage.removeItem(STORAGE_KEY);
            setClaimStatus('idle');
          } else if (data.error?.includes('own referral code')) {
            localStorage.removeItem(STORAGE_KEY);
            setClaimStatus('idle');
          } else {
            setErrorMessage(data.error || 'Failed to claim referral');
            setClaimStatus('error');
          }
        }
      } catch (err) {
        console.error('[Referral] Failed to claim:', err);
        setErrorMessage('Network error while claiming referral');
        setClaimStatus('error');
      }
    };

    claimReferral();
  }, [walletAddress]);

  const clearPendingCode = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setClaimStatus('idle');
    setErrorMessage(null);
  }, []);

  const hasPendingCode = typeof window !== 'undefined' && !!localStorage.getItem(STORAGE_KEY);

  return {
    claimStatus,
    errorMessage,
    hasPendingCode,
    clearPendingCode,
  };
}
