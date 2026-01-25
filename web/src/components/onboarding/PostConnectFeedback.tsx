'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useSessionBetting } from '@/hooks/useSessionBetting';
import { Check, ArrowRight, X } from 'lucide-react';

interface PostConnectFeedbackProps {
  /** Whether to show the feedback (controlled by parent) */
  show: boolean;
  /** Callback when feedback is dismissed */
  onDismiss: () => void;
  /** Callback when deposit button is clicked */
  onDepositClick?: () => void;
}

/**
 * PostConnectFeedback - Toast-style balance display after wallet connect
 *
 * Features:
 * - Shows immediately after wallet connects
 * - Displays current balance from useSessionBetting
 * - If balance is 0: Shows prominent deposit prompt
 * - If balance > 0: Shows "Ready to bet" confirmation
 * - Auto-dismisses after 5 seconds OR on deposit button click
 * - Toast-style positioning at top of screen with glass-morphism
 *
 * Requirements: ONB-08 (post-connect balance display with deposit prompt)
 */
export function PostConnectFeedback({
  show,
  onDismiss,
  onDepositClick,
}: PostConnectFeedbackProps) {
  const { connected } = useWallet();
  const { balanceInSol } = useSessionBetting();
  const [isVisible, setIsVisible] = useState(false);

  // Animate in when shown
  useEffect(() => {
    if (show && connected) {
      setIsVisible(true);

      // Auto-dismiss after 5 seconds
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(onDismiss, 300); // Wait for fade-out animation
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [show, connected, onDismiss]);

  // Don't render if not shown or not connected
  if (!show || !connected) {
    return null;
  }

  const hasBalance = balanceInSol > 0;

  const handleDepositClick = () => {
    onDepositClick?.();
    setIsVisible(false);
    onDismiss();
  };

  const handleDismiss = () => {
    setIsVisible(false);
    setTimeout(onDismiss, 300);
  };

  return (
    <div
      className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      <div className={`relative flex items-center gap-3 px-4 py-3 rounded-xl backdrop-blur-lg border shadow-xl ${hasBalance ? 'bg-success/20 border-success/30' : 'bg-warning/20 border-warning/30'}`}>
        {/* Success/Warning icon */}
        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${hasBalance ? 'bg-success/30' : 'bg-warning/30'}`}>
          <Check className={`w-4 h-4 ${hasBalance ? 'text-success' : 'text-warning'}`} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className={`text-sm font-bold ${hasBalance ? 'text-success' : 'text-warning'}`}>
            Connected!
          </div>
          <div className="text-xs text-white/70">
            Balance: {balanceInSol.toFixed(2)} SOL
          </div>
        </div>

        {/* Action button or ready message */}
        {hasBalance ? (
          <div className="text-xs text-success font-medium">
            Ready to bet
          </div>
        ) : (
          <button
            onClick={handleDepositClick}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-warning text-black text-xs font-bold hover:bg-warning/90 transition-colors touch-manipulation"
          >
            Deposit
            <ArrowRight className="w-3 h-3" />
          </button>
        )}

        {/* Dismiss button */}
        <button
          onClick={handleDismiss}
          className="flex-shrink-0 p-1 text-white/40 hover:text-white/70 transition-colors touch-manipulation"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
