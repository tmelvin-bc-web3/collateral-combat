'use client';

import { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';
import { CreatedChallenge } from './CreateChallengeModal';
import { Confetti } from './Confetti';

interface ShareChallengeModalProps {
  challenge: CreatedChallenge | null;
  onClose: () => void;
}

// Format duration in seconds to human readable
function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  return `${minutes} min`;
}

// Format time remaining
function formatTimeRemaining(expiresAt: number): string {
  const now = Date.now();
  const remaining = expiresAt - now;

  if (remaining <= 0) return 'Expired';

  const hours = Math.floor(remaining / (1000 * 60 * 60));
  const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

export function ShareChallengeModal({ challenge, onClose }: ShareChallengeModalProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (challenge) {
      setTimeout(() => setIsVisible(true), 50);
      // Show confetti on open
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3000);
    } else {
      setIsVisible(false);
    }
  }, [challenge]);

  const handleClose = useCallback(() => {
    setIsVisible(false);
    setTimeout(onClose, 300);
  }, [onClose]);

  const handleCopyLink = useCallback(async () => {
    if (!challenge) return;

    try {
      await navigator.clipboard.writeText(challenge.shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('[Share] Copy failed:', err);
    }
  }, [challenge]);

  const handleTwitterShare = useCallback(() => {
    if (!challenge) return;
    window.open(challenge.shareLinks.twitter, '_blank', 'noopener,noreferrer');
  }, [challenge]);

  const handleTelegramShare = useCallback(() => {
    if (!challenge) return;
    window.open(challenge.shareLinks.telegram, '_blank', 'noopener,noreferrer');
  }, [challenge]);

  if (!mounted || !challenge) return null;

  const prizePool = challenge.entryFee * 2;

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
          'relative bg-[#0d0b09] border border-[#7fba00]/30 rounded-2xl max-w-md w-full transform transition-all duration-300 shadow-2xl shadow-[#7fba00]/10 overflow-hidden',
          isVisible ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'
        )}
      >
        {/* Glow effect */}
        <div className="absolute -inset-1 bg-gradient-to-r from-[#7fba00]/20 via-[#ff5500]/10 to-[#7fba00]/20 rounded-2xl blur-xl opacity-50 -z-10" />

        {/* Header */}
        <div className="bg-gradient-to-r from-[#7fba00]/20 via-[#7fba00]/10 to-[#7fba00]/20 border-b border-white/10 p-4 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#7fba00]/20 border border-[#7fba00]/30 mb-2">
            <svg className="w-4 h-4 text-[#7fba00]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-sm font-semibold text-[#7fba00]">Challenge Created!</span>
          </div>
          <h2 className="text-xl font-bold text-white">Share Your Challenge</h2>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Challenge Code Display */}
          <div className="text-center mb-6">
            <p className="text-white/40 text-xs uppercase tracking-wider mb-2">Challenge Code</p>
            <div className="inline-block px-6 py-3 rounded-xl bg-black/60 border border-white/10">
              <span className="text-3xl font-black tracking-wider text-[#ff5500]">
                {challenge.challengeCode}
              </span>
            </div>
          </div>

          {/* Challenge Details */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="bg-white/5 rounded-lg p-3 text-center">
              <p className="text-white/40 text-xs mb-1">Entry</p>
              <p className="font-bold text-white">{challenge.entryFee} SOL</p>
            </div>
            <div className="bg-white/5 rounded-lg p-3 text-center">
              <p className="text-white/40 text-xs mb-1">Leverage</p>
              <p className="font-bold text-white">{challenge.leverage}x</p>
            </div>
            <div className="bg-white/5 rounded-lg p-3 text-center">
              <p className="text-white/40 text-xs mb-1">Duration</p>
              <p className="font-bold text-white">{formatDuration(challenge.duration)}</p>
            </div>
          </div>

          {/* Prize Pool */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-[#ff5500]/10 via-black/40 to-[#ff5500]/10 border border-[#ff5500]/20 mb-6 text-center">
            <p className="text-white/40 text-xs mb-1">Prize Pool</p>
            <p className="text-2xl font-bold text-[#ff5500]">{prizePool.toFixed(2)} SOL</p>
          </div>

          {/* Share URL */}
          <div className="mb-4">
            <div className="flex items-center gap-2 p-3 rounded-lg bg-black/40 border border-white/10">
              <input
                type="text"
                readOnly
                value={challenge.shareUrl}
                className="flex-1 bg-transparent text-white/60 text-sm outline-none font-mono"
              />
              <button
                onClick={handleCopyLink}
                className={cn(
                  'px-4 py-2 rounded-lg font-medium text-sm transition-all',
                  copied
                    ? 'bg-[#7fba00]/20 text-[#7fba00] border border-[#7fba00]/30'
                    : 'bg-white/10 text-white hover:bg-white/20'
                )}
              >
                {copied ? (
                  <span className="flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    Copied
                  </span>
                ) : (
                  'Copy'
                )}
              </button>
            </div>
          </div>

          {/* Share Buttons */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            {/* Twitter/X */}
            <button
              onClick={handleTwitterShare}
              className="flex items-center justify-center gap-2 p-3 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 hover:bg-white/10 transition-all"
            >
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
              <span className="font-medium text-white">Share on X</span>
            </button>

            {/* Telegram */}
            <button
              onClick={handleTelegramShare}
              className="flex items-center justify-center gap-2 p-3 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 hover:bg-white/10 transition-all"
            >
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
              </svg>
              <span className="font-medium text-white">Telegram</span>
            </button>
          </div>

          {/* Expiration Notice */}
          <div className="flex items-center justify-center gap-2 text-white/40 text-sm mb-4">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Expires in {formatTimeRemaining(challenge.expiresAt)}</span>
          </div>

          {/* Done Button */}
          <button
            onClick={handleClose}
            className="w-full py-3 px-6 bg-white/10 hover:bg-white/20 text-white font-medium rounded-xl transition-all"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
