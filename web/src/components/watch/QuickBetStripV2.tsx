'use client';

import { useState, useCallback, useMemo } from 'react';
import { useSwipeable } from 'react-swipeable';
import { LiveBattle, BattleOdds } from '@/types';
import { useBetState } from '@/hooks/useBetState';
import { BetConfirmOverlay } from './BetConfirmOverlay';
import { cn } from '@/lib/utils';

interface QuickBetStripV2Props {
  battle: LiveBattle;
  odds: BattleOdds | null;
  walletAddress?: string;
  onBetPlaced?: () => void;
  className?: string;
}

// Preset bet amounts from MOB-07: [0.01, 0.05, 0.1, 0.5] SOL
const PRESET_AMOUNTS = [0.01, 0.05, 0.1, 0.5];

// Minimum touch target height (project standard)
const MIN_TOUCH_HEIGHT = 44;

/**
 * QuickBetStripV2 - Thumb-zone betting strip with swipe-to-bet interaction
 *
 * Features:
 * - Fixed at bottom of screen in thumb zone
 * - Preset bet amounts [0.01, 0.05, 0.1, 0.5] SOL
 * - Swipe left = bet on Fighter 1 (player1)
 * - Swipe right = bet on Fighter 2 (player2)
 * - Two-tap confirmation: swipe shows confirm, confirm button completes
 *
 * @example
 * <QuickBetStripV2
 *   battle={currentBattle}
 *   odds={battleOdds}
 *   walletAddress={publicKey}
 *   onBetPlaced={() => refetchBets()}
 * />
 */
export function QuickBetStripV2({
  battle,
  odds,
  walletAddress,
  onBetPlaced,
  className,
}: QuickBetStripV2Props) {
  // Track swipe visual offset for feedback
  const [swipeOffset, setSwipeOffset] = useState(0);

  // Get player info
  const player1 = battle.players[0];
  const player2 = battle.players[1];

  // Odds from props (updated via socket)
  const player1Odds = odds?.player1.odds ?? 2.0;
  const player2Odds = odds?.player2.odds ?? 2.0;

  // Format wallet address for display
  const formatWallet = (addr: string) => `${addr.slice(0, 4)}...${addr.slice(-4)}`;

  // Get fighter names
  const fighter1Name = player1 ? formatWallet(player1.walletAddress) : 'Fighter 1';
  const fighter2Name = player2 ? formatWallet(player2.walletAddress) : 'Fighter 2';

  // Bet state machine
  const {
    state,
    selectedAmount,
    pendingBet,
    error,
    selectAmount,
    initiateSwipeBet,
    confirmBet,
    cancelBet,
    reset,
  } = useBetState({
    battleId: battle.id,
    walletAddress,
    onSuccess: () => {
      onBetPlaced?.();
    },
    onError: (err) => {
      console.error('[QuickBetStripV2] Bet error:', err);
    },
  });

  // Calculate potential payout based on selected amount and fighter odds
  const potentialPayout = useMemo(() => {
    if (!pendingBet) return 0;
    const fighterOdds = pendingBet.fighterWallet === player1?.walletAddress
      ? player1Odds
      : player2Odds;
    return pendingBet.amount * fighterOdds;
  }, [pendingBet, player1, player1Odds, player2Odds]);

  // Swipe handlers
  const handleSwiping = useCallback(
    (eventData: { deltaX: number }) => {
      // Visual feedback: shift amount row slightly in swipe direction
      const maxOffset = 30;
      const offset = Math.max(-maxOffset, Math.min(maxOffset, eventData.deltaX * 0.3));
      setSwipeOffset(offset);
    },
    []
  );

  const handleSwipedLeft = useCallback(() => {
    setSwipeOffset(0);
    if (player1 && state === 'amount_selected') {
      initiateSwipeBet('fighter1', player1.walletAddress, fighter1Name);
    }
  }, [player1, state, initiateSwipeBet, fighter1Name]);

  const handleSwipedRight = useCallback(() => {
    setSwipeOffset(0);
    if (player2 && state === 'amount_selected') {
      initiateSwipeBet('fighter2', player2.walletAddress, fighter2Name);
    }
  }, [player2, state, initiateSwipeBet, fighter2Name]);

  const handleSwipeEnd = useCallback(() => {
    setSwipeOffset(0);
  }, []);

  // Swipeable config
  const swipeHandlers = useSwipeable({
    onSwiping: handleSwiping,
    onSwipedLeft: handleSwipedLeft,
    onSwipedRight: handleSwipedRight,
    onTouchEndOrOnMouseUp: handleSwipeEnd,
    delta: 50,
    preventScrollOnSwipe: true,
    trackMouse: false, // Mobile only
  });

  // Determine if we should show the confirm overlay
  const showConfirmOverlay = state === 'confirming' || state === 'placing';

  // Get fighter odds for confirm overlay
  const confirmFighterOdds = pendingBet
    ? (pendingBet.fighterWallet === player1?.walletAddress ? player1Odds : player2Odds)
    : 0;

  return (
    <>
      {/* Confirm overlay (renders above bet strip when visible) */}
      {showConfirmOverlay && pendingBet && (
        <BetConfirmOverlay
          amount={pendingBet.amount}
          fighter={pendingBet.fighter}
          fighterWallet={pendingBet.fighterWallet}
          odds={confirmFighterOdds}
          potentialPayout={potentialPayout}
          isPlacing={state === 'placing'}
          onConfirm={confirmBet}
          onCancel={cancelBet}
        />
      )}

      {/* Main bet strip */}
      <div
        className={cn(
          'fixed bottom-0 left-0 right-0 z-40',
          className
        )}
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="bg-black/90 backdrop-blur-lg border-t border-white/10">
          <div className="max-w-lg mx-auto px-3 py-3">
            {/* Swipe hint row */}
            <div className="flex items-center justify-between mb-2 text-[10px] text-white/40">
              <span className="flex items-center gap-1">
                <span className="text-success">{'<--'}</span>
                <span>{fighter1Name}</span>
              </span>
              <span className="uppercase tracking-wider">Swipe to bet</span>
              <span className="flex items-center gap-1">
                <span>{fighter2Name}</span>
                <span className="text-danger">{'-->'}</span>
              </span>
            </div>

            {/* Amount buttons with swipe detection */}
            <div
              {...swipeHandlers}
              className="relative touch-pan-y"
              style={{
                transform: `translateX(${swipeOffset}px)`,
                transition: swipeOffset === 0 ? 'transform 0.2s ease-out' : 'none',
              }}
            >
              <div className="flex gap-2 justify-center mb-3">
                {PRESET_AMOUNTS.map((amt) => (
                  <button
                    key={amt}
                    onClick={() => selectAmount(amt)}
                    disabled={state === 'placing'}
                    style={{ minHeight: MIN_TOUCH_HEIGHT }}
                    className={cn(
                      'flex-1 max-w-[72px] py-2 rounded-lg text-sm font-bold transition-all touch-manipulation',
                      selectedAmount === amt && (state === 'amount_selected' || state === 'idle')
                        ? 'bg-warning text-black ring-2 ring-warning/50'
                        : 'bg-white/10 text-white/70 active:bg-white/20',
                      state === 'placing' && 'opacity-50 cursor-not-allowed'
                    )}
                  >
                    {amt}
                  </button>
                ))}
              </div>
            </div>

            {/* Odds display row */}
            <div className="flex justify-between items-center text-xs">
              <div className="flex items-center gap-2">
                <span className="text-success font-mono font-bold">
                  {player1Odds.toFixed(2)}x
                </span>
              </div>
              <div className="text-white/30">|</div>
              <div className="flex items-center gap-2">
                <span className="text-danger font-mono font-bold">
                  {player2Odds.toFixed(2)}x
                </span>
              </div>
            </div>

            {/* Error display */}
            {error && (
              <div className="mt-2 text-center text-xs text-danger">
                {error}
              </div>
            )}

            {/* Success display */}
            {state === 'success' && (
              <div className="mt-2 text-center text-xs text-success font-bold">
                Bet placed successfully!
              </div>
            )}

            {/* Connect wallet prompt */}
            {!walletAddress && (
              <div className="mt-2 text-center text-xs text-white/40">
                Connect wallet to bet
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
