'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useWallet } from '@solana/wallet-adapter-react';
import { cn } from '@/lib/utils';
import { WinData } from '@/hooks/useWinShare';
import {
  generateShareImage,
  downloadShareImage,
  getTwitterShareUrl,
  getReferralLink,
  GameMode,
  WinShareData,
} from '@/lib/shareImageGenerator';
import { Confetti } from '@/components/Confetti';

interface CooldownStatus {
  isOnCooldown: boolean;
  cooldownRemainingHours: number;
  bigWinBypassThreshold: number;
}

interface WinShareModalProps {
  winData: WinData | null;
  onClose: () => void;
  onTrackShare: (platform: 'twitter' | 'copy' | 'download') => Promise<{ xpEarned: number; message?: string }>;
  hasSharedOn: (platform: string) => boolean;
  referralCode: string;
  cooldownStatus?: CooldownStatus | null;
  winBypassesCooldown?: boolean;
}

// Game mode display labels
function getGameModeLabel(gameMode: GameMode): string {
  const labels: Record<GameMode, string> = {
    oracle: 'Oracle Prediction',
    battle: 'Battle Arena',
    draft: 'Memecoin Draft',
    spectator: 'Spectator Bet',
  };
  return labels[gameMode];
}

export function WinShareModal({
  winData,
  onClose,
  onTrackShare,
  hasSharedOn,
  referralCode,
  cooldownStatus,
  winBypassesCooldown,
}: WinShareModalProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const { publicKey } = useWallet();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Generate image preview when modal opens
  useEffect(() => {
    if (winData && publicKey && referralCode) {
      const shareData: WinShareData = {
        winAmount: winData.winAmount,
        gameMode: winData.gameMode,
        walletAddress: publicKey.toBase58(),
        referralCode,
      };

      generateShareImage(shareData).then((blob) => {
        const url = URL.createObjectURL(blob);
        setImagePreview(url);
      });

      // Show confetti
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3000);
    }

    return () => {
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [winData, publicKey, referralCode]);

  useEffect(() => {
    if (winData) {
      setTimeout(() => setIsVisible(true), 50);
    } else {
      setIsVisible(false);
      setImagePreview(null);
    }
  }, [winData]);

  const handleClose = useCallback(() => {
    setIsVisible(false);
    setTimeout(onClose, 300);
  }, [onClose]);

  const handleDownload = useCallback(async () => {
    if (!winData || !publicKey || !referralCode) return;

    const shareData: WinShareData = {
      winAmount: winData.winAmount,
      gameMode: winData.gameMode,
      walletAddress: publicKey.toBase58(),
      referralCode,
    };

    await downloadShareImage(shareData);
  }, [winData, publicKey, referralCode]);

  const handleTwitterShare = useCallback(async () => {
    if (!winData || !publicKey || !referralCode) return;

    const shareData: WinShareData = {
      winAmount: winData.winAmount,
      gameMode: winData.gameMode,
      walletAddress: publicKey.toBase58(),
      referralCode,
    };

    const url = getTwitterShareUrl(shareData);
    window.open(url, '_blank', 'noopener,noreferrer');
    await onTrackShare('twitter');
  }, [winData, publicKey, referralCode, onTrackShare]);

  const handleCopyLink = useCallback(async () => {
    if (!referralCode) return;

    const link = getReferralLink(referralCode);
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [referralCode]);

  if (!mounted || !winData) return null;

  const modal = (
    <div
      className={cn(
        'fixed inset-0 z-50 flex items-center justify-center transition-all duration-300 p-4',
        isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
      )}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Confetti */}
      <Confetti isActive={showConfetti} />

      {/* Modal content */}
      <div
        className={cn(
          'relative bg-[#0d0b09] border border-[#ff5500]/30 rounded-2xl p-6 max-w-lg w-full transform transition-all duration-300 shadow-2xl shadow-[#ff5500]/10',
          isVisible ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'
        )}
      >
        {/* Glow effect */}
        <div className="absolute -inset-1 bg-gradient-to-r from-[#ff5500]/20 via-[#7fba00]/20 to-[#ff5500]/20 rounded-2xl blur-xl opacity-50 -z-10" />

        {/* Content */}
        <div className="relative text-center">
          {/* Header */}
          <div className="mb-4">
            <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#7fba00] via-[#9fda00] to-[#7fba00]">
              YOU WON!
            </h2>
            <p className="text-[#8b4513] text-sm mt-1">{getGameModeLabel(winData.gameMode)}</p>
          </div>

          {/* Win amount */}
          <div className="text-5xl font-bold text-[#7fba00] mb-6 drop-shadow-[0_0_20px_rgba(127,186,0,0.5)]">
            +{winData.winAmount.toFixed(2)} SOL
          </div>

          {/* Image preview */}
          {imagePreview && (
            <div className="mb-6 rounded-lg overflow-hidden border border-white/10">
              <img
                src={imagePreview}
                alt="Share preview"
                className="w-full h-auto"
              />
            </div>
          )}

          {/* Share buttons */}
          <div className="space-y-3 mb-4">
            <p className="text-sm text-[#8b4513] uppercase tracking-wider">Share your win</p>

            <div className="grid grid-cols-3 gap-3">
              {/* Download button */}
              <button
                onClick={handleDownload}
                className="flex flex-col items-center justify-center p-3 rounded-xl transition-all bg-white/5 border border-white/10 hover:border-[#ff5500]/50 hover:bg-white/10"
              >
                <svg className="w-6 h-6 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                <span className="text-xs mt-1 text-white/60">Download</span>
              </button>

              {/* Twitter button */}
              <button
                onClick={handleTwitterShare}
                className={cn(
                  'flex flex-col items-center justify-center p-3 rounded-xl transition-all',
                  hasSharedOn('twitter')
                    ? 'bg-[#7fba00]/20 border border-[#7fba00]/40'
                    : 'bg-white/5 border border-white/10 hover:border-[#ff5500]/50 hover:bg-white/10'
                )}
              >
                {hasSharedOn('twitter') ? (
                  <svg className="w-6 h-6 text-[#7fba00]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6 text-white/60" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                )}
                <span className="text-xs mt-1 text-white/60">Share on X</span>
                {!hasSharedOn('twitter') && (
                  cooldownStatus?.isOnCooldown && !winBypassesCooldown ? (
                    <span className="text-xs text-white/40 mt-0.5">
                      XP cooldown ({cooldownStatus.cooldownRemainingHours}h)
                    </span>
                  ) : (
                    <span className="text-xs text-[#FFD700] mt-0.5">+25 XP</span>
                  )
                )}
              </button>

              {/* Copy link button */}
              <button
                onClick={handleCopyLink}
                className="flex flex-col items-center justify-center p-3 rounded-xl transition-all bg-white/5 border border-white/10 hover:border-[#ff5500]/50 hover:bg-white/10"
              >
                {copied ? (
                  <svg className="w-6 h-6 text-[#7fba00]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                  </svg>
                )}
                <span className="text-xs mt-1 text-white/60">{copied ? 'Copied!' : 'Copy Link'}</span>
              </button>
            </div>
          </div>

          {/* Referral code display */}
          <div className="bg-black/40 rounded-lg p-3 mb-4">
            <p className="text-xs text-white/40 mb-1">Your referral code</p>
            <p className="text-lg font-bold text-[#FFD700]">{referralCode}</p>
          </div>

          {/* Dismiss button */}
          <button
            onClick={handleClose}
            className="w-full py-3 px-6 bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 hover:text-white font-medium rounded-lg transition-all"
          >
            Maybe Later
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
