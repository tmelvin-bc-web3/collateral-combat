'use client';

import { useEffect, useRef } from 'react';
import { Wallet, X } from 'lucide-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';

interface OnboardingOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

export function OnboardingOverlay({ isOpen, onClose }: OnboardingOverlayProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  // Handle click outside to close
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) {
      onClose();
    }
  };

  // Handle escape key to close
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Prevent body scroll when overlay is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn"
    >
      <div className="bg-[#0a0908] border border-white/10 rounded-xl w-full max-w-sm overflow-hidden animate-slideUp">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-warning/20 flex items-center justify-center">
              <Wallet className="w-5 h-5 text-warning" />
            </div>
            <h2 className="text-lg font-bold text-white">Connect to Play</h2>
          </div>
          <button
            onClick={onClose}
            className="min-w-[44px] min-h-[44px] p-2 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors touch-manipulation"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          <p className="text-sm text-white/60">
            Connect your Solana wallet to place predictions. Your funds stay secure in your wallet until you deposit.
          </p>

          {/* Wallet Button */}
          <div className="flex justify-center wallet-adapter-button-trigger">
            <WalletMultiButton className="!bg-warning !text-black !font-bold !rounded-lg !px-6 !py-3 !text-sm hover:!bg-warning/90 !min-h-[44px] touch-manipulation" />
          </div>

          {/* Features list */}
          <div className="space-y-2 pt-2">
            <Feature text="Instant predictions with 0.01 SOL minimum" />
            <Feature text="Withdraw anytime - your funds, your control" />
            <Feature text="Earn XP and climb the leaderboard" />
          </div>

          {/* Learn more link */}
          <div className="text-center pt-2">
            <a
              href="/docs"
              className="text-xs text-warning/80 hover:text-warning underline transition-colors"
              onClick={(e) => {
                e.stopPropagation();
              }}
            >
              Learn more about how it works
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

function Feature({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-2 text-xs text-white/50">
      <div className="w-1.5 h-1.5 rounded-full bg-warning/60 shrink-0" />
      <span>{text}</span>
    </div>
  );
}
