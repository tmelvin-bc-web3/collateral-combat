'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';
import { useBattleContext } from '@/contexts/BattleContext';

// Format duration in seconds to human readable
function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  return `${minutes} min`;
}

export function MatchFoundModal() {
  const {
    readyCheck,
    readyCheckStatus,
    acceptMatch,
    declineMatch,
  } = useBattleContext();

  const [isVisible, setIsVisible] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(30);
  const [hasAccepted, setHasAccepted] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Play sound when match found
  useEffect(() => {
    if (readyCheck && !audioRef.current) {
      try {
        audioRef.current = new Audio('/sounds/match-found.mp3');
        audioRef.current.volume = 0.5;
        audioRef.current.play().catch(err => {
          console.log('[MatchFoundModal] Audio play failed:', err);
        });
      } catch {
        console.log('[MatchFoundModal] Audio not available');
      }
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [readyCheck]);

  // Show modal with animation
  useEffect(() => {
    if (readyCheck) {
      setHasAccepted(false);
      setTimeout(() => setIsVisible(true), 50);
    } else {
      setIsVisible(false);
    }
  }, [readyCheck]);

  // Countdown timer
  useEffect(() => {
    if (!readyCheck) {
      setTimeRemaining(30);
      return;
    }

    const updateTimer = () => {
      const remaining = Math.max(0, Math.ceil((readyCheck.expiresAt - Date.now()) / 1000));
      setTimeRemaining(remaining);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 100);

    return () => clearInterval(interval);
  }, [readyCheck]);

  // Track if current player has accepted
  useEffect(() => {
    if (readyCheckStatus) {
      // We can't tell directly which player we are, so we track via local state
    }
  }, [readyCheckStatus]);

  const handleAccept = useCallback(() => {
    setHasAccepted(true);
    acceptMatch();
  }, [acceptMatch]);

  const handleDecline = useCallback(() => {
    declineMatch();
  }, [declineMatch]);

  if (!mounted || !readyCheck) return null;

  const prizePool = readyCheck.config.entryFee * 2;
  const isLowTime = timeRemaining <= 10;
  const isCriticalTime = timeRemaining <= 5;

  // Determine ready states from status update
  const opponentReady = readyCheckStatus
    ? (readyCheckStatus.player1Ready || readyCheckStatus.player2Ready)
    : false;

  const modal = (
    <div
      className={cn(
        'fixed inset-0 z-50 flex items-center justify-center transition-all duration-300 p-4',
        isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
      )}
    >
      {/* Backdrop with pulse effect */}
      <div
        className={cn(
          'absolute inset-0 bg-black/90 backdrop-blur-md transition-all',
          isLowTime && 'animate-pulse'
        )}
      />

      {/* Modal content */}
      <div
        className={cn(
          'relative bg-[#0d0b09] border-2 rounded-2xl max-w-md w-full transform transition-all duration-300 shadow-2xl overflow-hidden',
          isVisible ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4',
          isCriticalTime
            ? 'border-[#cc2200] shadow-[#cc2200]/30'
            : isLowTime
            ? 'border-[#ff5500] shadow-[#ff5500]/20'
            : 'border-[#7fba00] shadow-[#7fba00]/20'
        )}
      >
        {/* Animated glow */}
        <div className={cn(
          'absolute -inset-1 rounded-2xl blur-xl opacity-60 -z-10 animate-pulse',
          isCriticalTime
            ? 'bg-[#cc2200]/40'
            : isLowTime
            ? 'bg-[#ff5500]/30'
            : 'bg-[#7fba00]/20'
        )} />

        {/* Header */}
        <div className={cn(
          'text-center py-6 border-b border-white/10',
          isCriticalTime
            ? 'bg-gradient-to-r from-[#cc2200]/30 via-[#cc2200]/10 to-[#cc2200]/30'
            : isLowTime
            ? 'bg-gradient-to-r from-[#ff5500]/20 via-[#ff5500]/10 to-[#ff5500]/20'
            : 'bg-gradient-to-r from-[#7fba00]/20 via-[#7fba00]/10 to-[#7fba00]/20'
        )}>
          {/* Match Found Badge */}
          <div className={cn(
            'inline-flex items-center gap-2 px-4 py-2 rounded-full mb-3 border',
            isCriticalTime
              ? 'bg-[#cc2200]/20 border-[#cc2200]/40'
              : isLowTime
              ? 'bg-[#ff5500]/20 border-[#ff5500]/40'
              : 'bg-[#7fba00]/20 border-[#7fba00]/40'
          )}>
            <div className={cn(
              'w-3 h-3 rounded-full animate-pulse',
              isCriticalTime ? 'bg-[#cc2200]' : isLowTime ? 'bg-[#ff5500]' : 'bg-[#7fba00]'
            )} />
            <span className={cn(
              'text-sm font-bold uppercase tracking-wider',
              isCriticalTime ? 'text-[#cc2200]' : isLowTime ? 'text-[#ff5500]' : 'text-[#7fba00]'
            )}>
              Match Found!
            </span>
          </div>

          <h2 className="text-2xl font-black text-white">READY CHECK</h2>
        </div>

        {/* Timer */}
        <div className="py-4 text-center">
          <div className={cn(
            'inline-flex items-center justify-center w-20 h-20 rounded-full border-4 transition-all',
            isCriticalTime
              ? 'border-[#cc2200] bg-[#cc2200]/10 animate-pulse'
              : isLowTime
              ? 'border-[#ff5500] bg-[#ff5500]/10'
              : 'border-[#7fba00]/50 bg-[#7fba00]/5'
          )}>
            <span className={cn(
              'text-3xl font-black',
              isCriticalTime ? 'text-[#cc2200]' : isLowTime ? 'text-[#ff5500]' : 'text-white'
            )}>
              {timeRemaining}
            </span>
          </div>
          <p className="text-white/40 text-sm mt-2">seconds remaining</p>
        </div>

        {/* Player Cards */}
        <div className="px-6 pb-4">
          <div className="flex items-center justify-center gap-4">
            {/* You */}
            <div className={cn(
              'flex-1 p-4 rounded-xl border transition-all text-center',
              hasAccepted
                ? 'border-[#7fba00]/50 bg-[#7fba00]/10'
                : 'border-white/10 bg-white/5'
            )}>
              <div className="text-xs text-white/40 uppercase tracking-wider mb-1">You</div>
              <div className={cn(
                'text-sm font-bold',
                hasAccepted ? 'text-[#7fba00]' : 'text-white/60'
              )}>
                {hasAccepted ? 'READY' : 'WAITING'}
              </div>
              {hasAccepted && (
                <svg className="w-5 h-5 text-[#7fba00] mx-auto mt-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>

            {/* VS */}
            <div className="text-2xl font-black text-[#ff5500]">VS</div>

            {/* Opponent */}
            <div className={cn(
              'flex-1 p-4 rounded-xl border transition-all text-center',
              opponentReady && hasAccepted
                ? 'border-[#7fba00]/50 bg-[#7fba00]/10'
                : 'border-white/10 bg-white/5'
            )}>
              <div className="text-xs text-white/40 uppercase tracking-wider mb-1">Opponent</div>
              <div className={cn(
                'text-sm font-bold',
                opponentReady && hasAccepted ? 'text-[#7fba00]' : 'text-white/60'
              )}>
                {opponentReady && hasAccepted ? 'READY' : '???'}
              </div>
              {opponentReady && hasAccepted && (
                <svg className="w-5 h-5 text-[#7fba00] mx-auto mt-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
          </div>
        </div>

        {/* Battle Info */}
        <div className="px-6 pb-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white/5 rounded-lg p-3 text-center">
              <p className="text-white/40 text-xs mb-1">Entry</p>
              <p className="font-bold text-white">{readyCheck.config.entryFee} SOL</p>
            </div>
            <div className="bg-white/5 rounded-lg p-3 text-center">
              <p className="text-white/40 text-xs mb-1">Duration</p>
              <p className="font-bold text-white">{formatDuration(readyCheck.config.duration)}</p>
            </div>
            <div className="bg-[#ff5500]/10 border border-[#ff5500]/20 rounded-lg p-3 text-center">
              <p className="text-white/40 text-xs mb-1">Prize</p>
              <p className="font-bold text-[#ff5500]">{prizePool.toFixed(2)} SOL</p>
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div className="px-6 pb-6">
          {!hasAccepted ? (
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handleDecline}
                className="py-3 px-6 bg-white/10 hover:bg-white/20 text-white font-medium rounded-xl transition-all"
              >
                Decline
              </button>
              <button
                onClick={handleAccept}
                className={cn(
                  'py-3 px-6 font-bold rounded-xl transition-all text-black',
                  isCriticalTime
                    ? 'bg-[#cc2200] hover:bg-[#cc2200]/80 animate-pulse'
                    : isLowTime
                    ? 'bg-[#ff5500] hover:bg-[#ff5500]/80'
                    : 'bg-[#7fba00] hover:bg-[#7fba00]/80'
                )}
              >
                ACCEPT
              </button>
            </div>
          ) : (
            <div className="text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#7fba00]/20 border border-[#7fba00]/30">
                <svg className="w-5 h-5 text-[#7fba00] animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span className="text-[#7fba00] font-medium">Waiting for opponent...</span>
              </div>
              <button
                onClick={handleDecline}
                className="mt-3 text-white/40 hover:text-white/60 text-sm transition-colors"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
