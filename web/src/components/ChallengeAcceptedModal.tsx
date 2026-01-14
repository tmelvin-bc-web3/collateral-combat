'use client';

import { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { ChallengeAcceptedNotification } from '@/types';
import { Confetti } from './Confetti';

interface ChallengeAcceptedModalProps {
  notification: ChallengeAcceptedNotification | null;
  onClose: () => void;
}

// Format duration in seconds to human readable
function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  return `${minutes} min`;
}

export function ChallengeAcceptedModal({ notification, onClose }: ChallengeAcceptedModalProps) {
  const router = useRouter();
  const [isVisible, setIsVisible] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (notification) {
      setTimeout(() => setIsVisible(true), 50);
      // Show confetti
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3000);
    } else {
      setIsVisible(false);
    }
  }, [notification]);

  const handleClose = useCallback(() => {
    setIsVisible(false);
    setTimeout(onClose, 300);
  }, [onClose]);

  const handleJoinBattle = useCallback(() => {
    if (!notification) return;

    // Navigate to battle page with the battle ID
    handleClose();
    router.push(`/battle?challenge=${notification.battleId}`);
  }, [notification, router, handleClose]);

  if (!mounted || !notification) return null;

  const prizePool = notification.entryFee * 2;

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
          'relative bg-[#0d0b09] border border-[#7fba00]/40 rounded-2xl max-w-md w-full transform transition-all duration-300 shadow-2xl shadow-[#7fba00]/20 overflow-hidden',
          isVisible ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'
        )}
      >
        {/* Glow effect */}
        <div className="absolute -inset-1 bg-gradient-to-r from-[#7fba00]/30 via-[#ff5500]/20 to-[#7fba00]/30 rounded-2xl blur-xl opacity-60 -z-10" />

        {/* Header */}
        <div className="bg-gradient-to-r from-[#7fba00]/30 via-[#7fba00]/10 to-[#7fba00]/30 border-b border-white/10 p-6 text-center">
          {/* Success Icon */}
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#7fba00]/20 border-2 border-[#7fba00] mb-4">
            <svg className="w-8 h-8 text-[#7fba00]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>

          <h2 className="text-2xl font-black text-white mb-2">CHALLENGE ACCEPTED!</h2>
          <p className="text-white/60">Your opponent is ready to battle</p>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Challenge Code */}
          <div className="text-center mb-6">
            <p className="text-white/40 text-xs uppercase tracking-wider mb-2">Challenge Code</p>
            <div className="inline-block px-4 py-2 rounded-xl bg-black/60 border border-white/10">
              <span className="text-xl font-black tracking-wider text-[#ff5500]">
                {notification.challengeCode}
              </span>
            </div>
          </div>

          {/* Battle Details */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="bg-white/5 rounded-lg p-3 text-center">
              <p className="text-white/40 text-xs mb-1">Entry Fee</p>
              <p className="font-bold text-white">{notification.entryFee} SOL</p>
            </div>
            <div className="bg-white/5 rounded-lg p-3 text-center">
              <p className="text-white/40 text-xs mb-1">Duration</p>
              <p className="font-bold text-white">{formatDuration(notification.duration)}</p>
            </div>
          </div>

          {/* Prize Pool */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-[#ff5500]/10 via-black/40 to-[#ff5500]/10 border border-[#ff5500]/20 mb-6 text-center">
            <p className="text-white/40 text-xs mb-1">Prize Pool</p>
            <p className="text-2xl font-bold text-[#ff5500]">{prizePool.toFixed(2)} SOL</p>
          </div>

          {/* Join Battle Button */}
          <button
            onClick={handleJoinBattle}
            className="w-full py-4 px-6 bg-[#7fba00] hover:bg-[#7fba00]/80 text-black font-bold rounded-xl transition-all text-lg shadow-lg shadow-[#7fba00]/30"
          >
            JOIN BATTLE NOW
          </button>

          {/* Dismiss */}
          <button
            onClick={handleClose}
            className="w-full mt-3 py-2 text-white/40 hover:text-white/60 text-sm transition-colors"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
