'use client';

import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { Wallet, X } from 'lucide-react';

/**
 * FloatingConnectPill - Gentle nudge to connect wallet for anonymous spectators
 *
 * Features:
 * - Only renders when wallet is NOT connected
 * - Fixed position above QuickBetStrip (bottom-24 to clear betting UI)
 * - Dismissible via X button (state resets on page navigation)
 * - Orange/warning colored to match app accent
 * - Plain language reassurance text
 * - Safe area padding for mobile
 * - Fade-in animation on mount
 *
 * Requirements: ONB-02 (one-click connect), ONB-03 (plain language)
 */
export function FloatingConnectPill() {
  const { connected } = useWallet();
  const { setVisible } = useWalletModal();
  const [dismissed, setDismissed] = useState(false);

  // Don't render if connected or dismissed
  if (connected || dismissed) {
    return null;
  }

  const handleConnect = () => {
    setVisible(true);
  };

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDismissed(true);
  };

  return (
    <div
      className="fixed bottom-24 left-1/2 -translate-x-1/2 z-30 animate-fade-in"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="relative">
        {/* Main connect button */}
        <button
          onClick={handleConnect}
          className="flex flex-col items-center gap-1 px-5 py-3 rounded-2xl bg-warning text-black font-semibold shadow-lg shadow-warning/30 hover:scale-105 active:scale-95 transition-transform touch-manipulation"
        >
          <span className="flex items-center gap-2">
            <Wallet className="w-5 h-5" />
            <span className="text-sm font-bold">Connect to bet</span>
          </span>
          <span className="text-[10px] opacity-70 font-normal">
            Your funds stay in your wallet until you wager
          </span>
        </button>

        {/* Dismiss button */}
        <button
          onClick={handleDismiss}
          className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-bg-primary border border-white/20 text-white/50 hover:text-white hover:bg-white/10 flex items-center justify-center transition-colors touch-manipulation"
          aria-label="Dismiss connect prompt"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
