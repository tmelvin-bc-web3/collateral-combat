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

// Generate a referral code from wallet address (fallback)
function generateReferralCodeFromWallet(walletAddress: string): string {
  // Use last 4 characters of wallet, converted to uppercase
  const suffix = walletAddress.slice(-4).toUpperCase();
  return `DEGEN${suffix}`;
}

export function useWinShare() {
  const [pendingWin, setPendingWin] = useState<WinData | null>(null);
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

  // Show the win share modal
  const showWinShare = useCallback((winData: WinData) => {
    setPendingWin(winData);
    setSharedPlatforms(new Set()); // Reset shared platforms for new win
  }, []);

  // Track share and award XP
  const trackShare = useCallback(
    async (platform: 'twitter' | 'copy' | 'download'): Promise<TrackShareResponse> => {
      if (!pendingWin || !publicKey) {
        return { success: false, xpEarned: 0 };
      }

      try {
        const res = await fetch(`${BACKEND_URL}/api/shares/track`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            walletAddress: publicKey.toBase58(),
            gameMode: pendingWin.gameMode,
            winAmountLamports: Math.floor(pendingWin.winAmount * LAMPORTS_PER_SOL),
            roundId: pendingWin.roundId,
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
    [pendingWin, publicKey]
  );

  // Check if already shared on a platform
  const hasSharedOn = useCallback(
    (platform: string): boolean => {
      return sharedPlatforms.has(platform);
    },
    [sharedPlatforms]
  );

  // Dismiss the win share modal
  const dismissWin = useCallback(() => {
    setPendingWin(null);
  }, []);

  return {
    pendingWin,
    showWinShare,
    trackShare,
    hasSharedOn,
    dismissWin,
    referralCode,
  };
}
