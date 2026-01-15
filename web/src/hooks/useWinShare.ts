'use client';

import { useState, useCallback, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import { BACKEND_URL } from '@/config/api';
import { GameMode } from '@/lib/shareImageGenerator';

export interface WinData {
  winAmount: number; // In SOL
  gameMode: GameMode;
  roundId: string;
}

interface TrackShareResponse {
  success: boolean;
  xpEarned: number;
  message?: string;
}

// Threshold for showing full modal vs toast (in SOL)
// Wins >= this amount show full modal, smaller wins show toast
export const BIG_WIN_THRESHOLD_SOL = 0.5;

// Generate a referral code from wallet address (fallback)
function generateReferralCodeFromWallet(walletAddress: string): string {
  // Use last 4 characters of wallet, converted to uppercase
  const suffix = walletAddress.slice(-4).toUpperCase();
  return `DEGEN${suffix}`;
}

export function useWinShare() {
  const [pendingWin, setPendingWin] = useState<WinData | null>(null);
  const [toastWin, setToastWin] = useState<WinData | null>(null);
  const [sharedPlatforms, setSharedPlatforms] = useState<Set<string>>(new Set());
  const [referralCode, setReferralCode] = useState<string>('');
  const { publicKey } = useWallet();

  // Fetch or generate referral code
  useEffect(() => {
    if (!publicKey) {
      setReferralCode('');
      return;
    }

    const walletAddress = publicKey.toBase58();

    // Try to get from localStorage first (saved from waitlist signup)
    const savedEmail = localStorage.getItem('waitlist_email');
    if (savedEmail) {
      // Fetch from waitlist API
      fetch(`${BACKEND_URL}/api/waitlist/status/${encodeURIComponent(savedEmail)}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.referralCode) {
            setReferralCode(data.referralCode);
          } else {
            setReferralCode(generateReferralCodeFromWallet(walletAddress));
          }
        })
        .catch(() => {
          setReferralCode(generateReferralCodeFromWallet(walletAddress));
        });
    } else {
      // Generate from wallet address
      setReferralCode(generateReferralCodeFromWallet(walletAddress));
    }
  }, [publicKey]);

  // Show win notification - decides toast vs modal based on amount
  const showWinShare = useCallback((winData: WinData) => {
    setSharedPlatforms(new Set()); // Reset shared platforms for new win

    if (winData.winAmount >= BIG_WIN_THRESHOLD_SOL) {
      // Big win - show full modal
      setPendingWin(winData);
      setToastWin(null);
    } else {
      // Small win - show toast
      setToastWin(winData);
      setPendingWin(null);
    }
  }, []);

  // Force show full modal (e.g., when user clicks toast)
  const expandToModal = useCallback(() => {
    if (toastWin) {
      setPendingWin(toastWin);
      setToastWin(null);
    }
  }, [toastWin]);

  // Track share and award XP
  const trackShare = useCallback(
    async (platform: 'twitter' | 'copy' | 'download'): Promise<TrackShareResponse> => {
      const activeWin = pendingWin || toastWin;
      if (!activeWin || !publicKey) {
        return { success: false, xpEarned: 0 };
      }

      try {
        const res = await fetch(`${BACKEND_URL}/api/shares/track`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            walletAddress: publicKey.toBase58(),
            gameMode: activeWin.gameMode,
            winAmountLamports: Math.floor(activeWin.winAmount * LAMPORTS_PER_SOL),
            roundId: activeWin.roundId,
            platform,
          }),
        });

        const data = await res.json();

        if (data.success && data.xpEarned > 0) {
          // Mark this platform as shared
          setSharedPlatforms((prev) => new Set([...prev, platform]));
        }

        return data;
      } catch (error) {
        console.error('[useWinShare] Error tracking share:', error);
        return { success: false, xpEarned: 0 };
      }
    },
    [pendingWin, toastWin, publicKey]
  );

  // Check if already shared on a platform
  const hasSharedOn = useCallback(
    (platform: string): boolean => {
      return sharedPlatforms.has(platform);
    },
    [sharedPlatforms]
  );

  // Dismiss the full win share modal
  const dismissWin = useCallback(() => {
    setPendingWin(null);
  }, []);

  // Dismiss the toast
  const dismissToast = useCallback(() => {
    setToastWin(null);
  }, []);

  return {
    // Full modal state
    pendingWin,
    dismissWin,
    // Toast state
    toastWin,
    dismissToast,
    expandToModal,
    // Common
    showWinShare,
    trackShare,
    hasSharedOn,
    referralCode,
  };
}
