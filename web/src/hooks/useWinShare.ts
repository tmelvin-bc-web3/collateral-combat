'use client';

import { useState, useCallback, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import bs58 from 'bs58';
import { BACKEND_URL } from '@/config/api';
import { GameMode } from '@/lib/shareImageGenerator';

/**
 * Generate the share verification message
 * Must match backend/src/utils/signatureVerification.ts generateShareMessage
 */
function generateShareMessage(
  walletAddress: string,
  roundId: string,
  timestamp: number
): string {
  return `DegenDome Share Verification\n\nWallet: ${walletAddress}\nRound: ${roundId}\nTimestamp: ${timestamp}`;
}

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

interface CooldownStatus {
  isOnCooldown: boolean;
  cooldownRemainingHours: number;
  bigWinBypassThreshold: number; // In SOL
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
  const [cooldownStatus, setCooldownStatus] = useState<CooldownStatus | null>(null);
  const [lastShareMessage, setLastShareMessage] = useState<string | null>(null);
  const { publicKey, signMessage } = useWallet();

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

  // Fetch cooldown status
  const fetchCooldownStatus = useCallback(async () => {
    if (!publicKey) return;

    try {
      const res = await fetch(`${BACKEND_URL}/api/shares/cooldown/${publicKey.toBase58()}`);
      const data = await res.json();
      setCooldownStatus({
        isOnCooldown: data.isOnCooldown,
        cooldownRemainingHours: data.cooldownRemainingHours,
        bigWinBypassThreshold: data.bigWinBypassThreshold,
      });
    } catch (error) {
      console.error('[useWinShare] Error fetching cooldown:', error);
    }
  }, [publicKey]);

  // Show win notification - decides toast vs modal based on amount
  const showWinShare = useCallback((winData: WinData) => {
    setSharedPlatforms(new Set()); // Reset shared platforms for new win
    setLastShareMessage(null); // Reset last message

    // Fetch cooldown status when showing a win
    fetchCooldownStatus();

    if (winData.winAmount >= BIG_WIN_THRESHOLD_SOL) {
      // Big win - show full modal
      setPendingWin(winData);
      setToastWin(null);
    } else {
      // Small win - show toast
      setToastWin(winData);
      setPendingWin(null);
    }
  }, [fetchCooldownStatus]);

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

      // Check if wallet supports signing
      if (!signMessage) {
        console.error('[useWinShare] Wallet does not support message signing');
        return { success: false, xpEarned: 0, message: 'Wallet does not support signing' };
      }

      try {
        const walletAddress = publicKey.toBase58();
        const timestamp = Date.now();

        // Generate and sign the verification message
        const message = generateShareMessage(walletAddress, activeWin.roundId, timestamp);
        const messageBytes = new TextEncoder().encode(message);

        let signature: string;
        try {
          const signatureBytes = await signMessage(messageBytes);
          signature = bs58.encode(signatureBytes);
        } catch (signError) {
          console.error('[useWinShare] User rejected signing:', signError);
          return { success: false, xpEarned: 0, message: 'Signature required to verify share' };
        }

        const res = await fetch(`${BACKEND_URL}/api/shares/track`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            walletAddress,
            gameMode: activeWin.gameMode,
            winAmountLamports: Math.floor(activeWin.winAmount * LAMPORTS_PER_SOL),
            roundId: activeWin.roundId,
            platform,
            signature,
            timestamp,
          }),
        });

        const data = await res.json();

        if (data.success && data.xpEarned > 0) {
          // Mark this platform as shared
          setSharedPlatforms((prev) => new Set([...prev, platform]));
        }

        // Store the message (could be cooldown info)
        if (data.message) {
          setLastShareMessage(data.message);
        }

        // Refresh cooldown status after sharing
        fetchCooldownStatus();

        return data;
      } catch (error) {
        console.error('[useWinShare] Error tracking share:', error);
        return { success: false, xpEarned: 0 };
      }
    },
    [pendingWin, toastWin, publicKey, signMessage, fetchCooldownStatus]
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

  // Check if this win bypasses cooldown (>= 3 SOL)
  const activeWin = pendingWin || toastWin;
  const winBypassesCooldown = activeWin
    ? activeWin.winAmount >= (cooldownStatus?.bigWinBypassThreshold || 3)
    : false;

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
    // Cooldown
    cooldownStatus,
    lastShareMessage,
    winBypassesCooldown,
  };
}
