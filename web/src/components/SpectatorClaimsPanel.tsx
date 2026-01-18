'use client';

import { useState, useEffect, useCallback } from 'react';
import { SpectatorBet } from '@/types';
import { getSocket } from '@/lib/socket';
import { Card } from './ui/Card';

interface SpectatorClaimsPanelProps {
  walletAddress: string;
  onClaimWinnings?: (battleId: string, onChainBattleId: number) => Promise<string>;
}

export function SpectatorClaimsPanel({ walletAddress, onClaimWinnings }: SpectatorClaimsPanelProps) {
  const [unclaimedBets, setUnclaimedBets] = useState<SpectatorBet[]>([]);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch unclaimed bets on mount
  useEffect(() => {
    const socket = getSocket();

    socket.emit('get_unclaimed_bets', walletAddress);

    socket.on('unclaimed_bets', (bets: SpectatorBet[]) => {
      setUnclaimedBets(bets);
      setLoading(false);
    });

    socket.on('claim_verified', (data: { betId: string }) => {
      setUnclaimedBets(prev => prev.filter(b => b.id !== data.betId));
      setClaimingId(null);
    });

    return () => {
      socket.off('unclaimed_bets');
      socket.off('claim_verified');
    };
  }, [walletAddress]);

  const handleClaim = useCallback(async (bet: SpectatorBet) => {
    if (!onClaimWinnings) {
      setError('Claiming not available - connect wallet');
      return;
    }

    setClaimingId(bet.id);
    setError(null);

    try {
      // The battleId might need to be mapped to onChainBattleId
      // For now, we'll pass it as is and handle the mapping elsewhere
      const txSignature = await onClaimWinnings(bet.battleId, 0);

      // Verify with backend
      const socket = getSocket();
      socket.emit('verify_claim', {
        betId: bet.id,
        txSignature,
        walletAddress,
      });
    } catch (err: any) {
      setError(err.message || 'Failed to claim winnings');
      setClaimingId(null);
    }
  }, [onClaimWinnings, walletAddress]);

  const formatWallet = (addr: string) => `${addr.slice(0, 4)}...${addr.slice(-4)}`;
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const totalUnclaimed = unclaimedBets.reduce((sum, bet) => sum + bet.potentialPayout, 0);

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold">Unclaimed Winnings</h2>
          <p className="text-sm text-text-secondary mt-1">
            Claim your winning wagers from completed battles
          </p>
        </div>
        {totalUnclaimed > 0 && (
          <div className="text-right">
            <div className="text-xs text-text-tertiary">Total Unclaimed</div>
            <div className="font-mono font-bold text-xl text-success">{totalUnclaimed.toFixed(2)} SOL</div>
          </div>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-danger/10 border border-danger/20 text-danger text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-3 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      ) : unclaimedBets.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-bg-tertiary flex items-center justify-center">
            <svg className="w-8 h-8 text-text-tertiary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="font-semibold text-lg mb-1">All Caught Up!</h3>
          <p className="text-sm text-text-secondary">
            No unclaimed winnings. Place some wagers to get started!
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {unclaimedBets.map((bet) => (
            <div
              key={bet.id}
              className="p-4 rounded-xl bg-bg-tertiary border border-border-primary hover:border-success/30 transition-colors"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2 py-0.5 rounded-full bg-success/20 text-success text-xs font-semibold">
                      WON
                    </span>
                    <span className="text-xs text-text-tertiary">
                      Battle #{bet.battleId.slice(0, 8)}
                    </span>
                  </div>
                  <div className="text-sm text-text-secondary">
                    Backed <span className="font-mono font-medium text-text-primary">{formatWallet(bet.backedPlayer)}</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-text-tertiary mb-1">{formatTime(bet.settledAt || bet.placedAt)}</div>
                  <div className="font-mono font-bold text-lg text-success">
                    +{bet.potentialPayout.toFixed(2)} SOL
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-border-primary">
                <div className="flex items-center gap-4 text-xs text-text-tertiary">
                  <span>Staked: <span className="font-mono text-text-secondary">{bet.amount} SOL</span></span>
                  <span>Odds: <span className="font-mono text-text-secondary">{bet.odds.toFixed(2)}x</span></span>
                </div>
                <button
                  onClick={() => handleClaim(bet)}
                  disabled={claimingId === bet.id}
                  className="px-4 py-2 rounded-lg font-semibold text-sm bg-success hover:bg-success/90 text-white transition-colors disabled:opacity-50"
                >
                  {claimingId === bet.id ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Claiming...</span>
                    </div>
                  ) : (
                    'Claim'
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Claim All Button */}
      {unclaimedBets.length > 1 && (
        <div className="mt-6 pt-6 border-t border-border-primary">
          <button
            disabled={claimingId !== null}
            className="w-full py-3 rounded-xl font-bold bg-gradient-to-r from-success to-emerald-400 text-white hover:shadow-lg transition-all disabled:opacity-50"
          >
            <div className="flex items-center justify-center gap-2">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Claim All ({totalUnclaimed.toFixed(2)} SOL)</span>
            </div>
          </button>
          <p className="text-xs text-text-tertiary text-center mt-2">
            Note: Each claim requires a separate transaction
          </p>
        </div>
      )}
    </Card>
  );
}
