'use client';

import { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';
import { WinData } from '@/hooks/useWinShare';
import { GameMode } from '@/lib/shareImageGenerator';

interface WinToastProps {
  winData: WinData | null;
  onExpand: () => void; // Called when user clicks to expand to full modal
  onDismiss: () => void;
  autoDismissMs?: number; // Auto-dismiss after this many ms (default 8000)
}

// Game mode display labels
function getGameModeLabel(gameMode: GameMode): string {
  const labels: Record<GameMode, string> = {
    oracle: 'Oracle',
    battle: 'Battle',
    draft: 'Draft',
    spectator: 'Spectator',
  };
  return labels[gameMode];
}

export function WinToast({
  winData,
  onExpand,
  onDismiss,
  autoDismissMs = 8000,
}: WinToastProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Animate in when winData appears
  useEffect(() => {
    if (winData) {
      setTimeout(() => setIsVisible(true), 50);
      setProgress(100);
    } else {
      setIsVisible(false);
    }
  }, [winData]);

  // Auto-dismiss countdown
  useEffect(() => {
    if (!winData || !isVisible) return;

    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 100 - (elapsed / autoDismissMs) * 100);
      setProgress(remaining);

      if (remaining <= 0) {
        handleDismiss();
      }
    }, 50);

    return () => clearInterval(interval);
  }, [winData, isVisible, autoDismissMs]);

  const handleDismiss = useCallback(() => {
    setIsVisible(false);
    setTimeout(onDismiss, 300);
  }, [onDismiss]);

  const handleExpand = useCallback(() => {
    setIsVisible(false);
    setTimeout(onExpand, 300);
  }, [onExpand]);

  if (!mounted || !winData) return null;

  const toast = (
    <div
      className={cn(
        'fixed bottom-4 right-4 z-40 transition-all duration-300',
        isVisible
          ? 'opacity-100 translate-y-0'
          : 'opacity-0 translate-y-4 pointer-events-none'
      )}
    >
      <div className="relative bg-[#0d0b09]/95 backdrop-blur-sm border border-[#7fba00]/40 rounded-xl shadow-lg shadow-[#7fba00]/20 overflow-hidden max-w-xs">
        {/* Progress bar */}
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-white/10">
          <div
            className="h-full bg-[#7fba00] transition-all duration-100"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Content */}
        <div className="p-4 pt-3">
          <div className="flex items-start gap-3">
            {/* Win icon */}
            <div className="w-10 h-10 rounded-lg bg-[#7fba00]/20 flex items-center justify-center flex-shrink-0">
              <svg
                className="w-5 h-5 text-[#7fba00]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>

            {/* Text */}
            <div className="flex-1 min-w-0">
              <p className="text-xs text-[#8b4513] uppercase tracking-wider">
                {getGameModeLabel(winData.gameMode)} Win
              </p>
              <p className="text-xl font-bold text-[#7fba00]">
                +{winData.winAmount.toFixed(2)} SOL
              </p>
            </div>

            {/* Dismiss button */}
            <button
              onClick={handleDismiss}
              className="text-white/40 hover:text-white/60 transition-colors p-1 -mr-1 -mt-1"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Share button */}
          <button
            onClick={handleExpand}
            className="mt-3 w-full flex items-center justify-center gap-2 py-2 px-3 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-[#ff5500]/30 rounded-lg text-sm text-white/70 hover:text-white transition-all"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
            Share on X for +25 XP
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(toast, document.body);
}
