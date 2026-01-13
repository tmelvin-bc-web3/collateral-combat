'use client';

import { useState, useEffect, useCallback } from 'react';
import { LiveBattle, BattleOdds, SpectatorBet } from '@/types';
import { getSocket } from '@/lib/socket';
import { Card } from './ui/Card';

interface BettingPanelProps {
  battle: LiveBattle;
  walletAddress?: string;
  onChainBattleId?: number; // For on-chain betting
  onPlaceBet?: (backedPlayer: 'creator' | 'opponent', amount: number) => Promise<string>; // Returns tx signature
}

const BET_AMOUNTS = [0.1, 0.25, 0.5, 1];

interface OddsLock {
  lockId: string;
  battleId: string;
  backedPlayer: string;
  lockedOdds: number;
  amount: number;
  potentialPayout: number;
  expiresAt: number;
}

export function BettingPanel({ battle, walletAddress, onChainBattleId, onPlaceBet }: BettingPanelProps) {
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);
  const [betAmount, setBetAmount] = useState(0.1);
  const [customAmount, setCustomAmount] = useState('');
  const [isPlacing, setIsPlacing] = useState(false);
  const [isRequestingLock, setIsRequestingLock] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recentBets, setRecentBets] = useState<SpectatorBet[]>([]);
  const [odds, setOdds] = useState<BattleOdds | null>(battle.odds || null);

  // Odds lock state for on-chain betting
  const [oddsLock, setOddsLock] = useState<OddsLock | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [lockCountdown, setLockCountdown] = useState(0);

  const player1 = battle.players[0];
  const player2 = battle.players[1];

  useEffect(() => {
    const socket = getSocket();

    socket.on('odds_update', (newOdds) => {
      if (newOdds.battleId === battle.id) {
        setOdds(newOdds);
      }
    });

    socket.on('bet_placed', (bet) => {
      if (bet.battleId === battle.id) {
        setRecentBets(prev => [bet, ...prev].slice(0, 5));
      }
    });

    socket.on('odds_lock', (lock: OddsLock) => {
      setOddsLock(lock);
      setShowConfirmModal(true);
      setIsRequestingLock(false);
    });

    socket.on('bet_verified', () => {
      setIsPlacing(false);
      setShowConfirmModal(false);
      setOddsLock(null);
      setSelectedPlayer(null);
      setCustomAmount('');
    });

    return () => {
      socket.off('odds_update');
      socket.off('bet_placed');
      socket.off('odds_lock');
      socket.off('bet_verified');
    };
  }, [battle.id]);

  // Countdown timer for odds lock
  useEffect(() => {
    if (!oddsLock) {
      setLockCountdown(0);
      return;
    }

    const updateCountdown = () => {
      const remaining = Math.max(0, Math.floor((oddsLock.expiresAt - Date.now()) / 1000));
      setLockCountdown(remaining);
      if (remaining === 0) {
        setShowConfirmModal(false);
        setOddsLock(null);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [oddsLock]);

  // Request odds lock (first step)
  const handleRequestBet = useCallback(() => {
    if (!walletAddress) {
      setError('Connect wallet to place wagers');
      return;
    }
    if (!selectedPlayer) {
      setError('Select a player to back');
      return;
    }

    const amount = customAmount ? parseFloat(customAmount) : betAmount;
    if (isNaN(amount) || amount <= 0) {
      setError('Enter a valid wager amount');
      return;
    }

    setIsRequestingLock(true);
    setError(null);

    const socket = getSocket();
    socket.emit('request_odds_lock', {
      battleId: battle.id,
      backedPlayer: selectedPlayer,
      amount,
      walletAddress,
    });
  }, [walletAddress, selectedPlayer, customAmount, betAmount, battle.id]);

  // Confirm and place on-chain bet (second step)
  const handleConfirmBet = useCallback(async () => {
    if (!oddsLock || !walletAddress || !onPlaceBet) return;

    setIsPlacing(true);
    setError(null);

    try {
      // Determine if backing creator or opponent
      const backedSide: 'creator' | 'opponent' =
        player1?.walletAddress === oddsLock.backedPlayer ? 'creator' : 'opponent';

      // Place on-chain bet
      const txSignature = await onPlaceBet(backedSide, oddsLock.amount);

      // Verify with backend
      const socket = getSocket();
      socket.emit('verify_bet', {
        lockId: oddsLock.lockId,
        txSignature,
        walletAddress,
      });
    } catch (err: any) {
      setError(err.message || 'Failed to place bet');
      setIsPlacing(false);
    }
  }, [oddsLock, walletAddress, onPlaceBet, player1]);

  // Legacy bet (off-chain only)
  const handlePlaceBetLegacy = async () => {
    if (!walletAddress) {
      setError('Connect wallet to place wagers');
      return;
    }
    if (!selectedPlayer) {
      setError('Select a player to back');
      return;
    }

    const amount = customAmount ? parseFloat(customAmount) : betAmount;
    if (isNaN(amount) || amount <= 0) {
      setError('Enter a valid wager amount');
      return;
    }

    setIsPlacing(true);
    setError(null);

    const socket = getSocket();
    socket.emit('place_bet', battle.id, selectedPlayer, amount, walletAddress);

    // Wait for confirmation
    setTimeout(() => {
      setIsPlacing(false);
      setSelectedPlayer(null);
      setCustomAmount('');
    }, 1000);
  };

  // Use on-chain flow if available, otherwise legacy
  const handlePlaceBet = onPlaceBet && onChainBattleId ? handleRequestBet : handlePlaceBetLegacy;

  const getOddsForPlayer = (playerWallet: string) => {
    if (!odds) return 2.0; // Default even odds
    if (odds.player1.wallet === playerWallet) return odds.player1.odds;
    if (odds.player2.wallet === playerWallet) return odds.player2.odds;
    return 2.0;
  };

  const getPotentialPayout = () => {
    if (!selectedPlayer) return 0;
    const amount = customAmount ? parseFloat(customAmount) : betAmount;
    if (isNaN(amount)) return 0;
    const playerOdds = getOddsForPlayer(selectedPlayer);
    return amount * playerOdds;
  };

  const formatWallet = (addr: string) => `${addr.slice(0, 4)}...${addr.slice(-4)}`;

  const player1Leading = player1 && player2 && player1.account.totalPnlPercent > player2.account.totalPnlPercent;
  const player2Leading = player1 && player2 && player2.account.totalPnlPercent > player1.account.totalPnlPercent;

  return (
    <Card className="sticky top-24 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/20">
          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div>
          <h2 className="font-bold text-lg">Place Your Wager</h2>
          <p className="text-text-tertiary text-xs">Back your champion</p>
        </div>
      </div>

      {error && (
        <div className="mb-5 p-4 rounded-xl bg-danger/10 border border-danger/30 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-danger/20 flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 text-danger" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <span className="text-danger text-sm">{error}</span>
        </div>
      )}

      {/* Player Selection */}
      <div className="mb-5">
        <label className="flex items-center gap-2 text-sm font-medium text-text-secondary mb-3">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          Choose Fighter
        </label>
        <div className="space-y-3">
          {player1 && (
            <button
              onClick={() => setSelectedPlayer(player1.walletAddress)}
              className={`relative w-full p-4 rounded-xl border-2 transition-all ${
                selectedPlayer === player1.walletAddress
                  ? 'border-accent bg-accent/5 shadow-[0_0_20px_rgba(0,212,170,0.15)]'
                  : 'border-border-primary bg-bg-tertiary hover:border-border-secondary'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${
                    player1Leading ? 'bg-success/20 text-success' : 'bg-bg-hover text-text-secondary'
                  }`}>
                    P1
                  </div>
                  <div className="text-left">
                    <div className="font-mono font-semibold text-sm">{formatWallet(player1.walletAddress)}</div>
                    <div className={`text-xs font-medium ${player1.account.totalPnlPercent >= 0 ? 'text-success' : 'text-danger'}`}>
                      {player1.account.totalPnlPercent >= 0 ? '+' : ''}{player1.account.totalPnlPercent.toFixed(2)}% PnL
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xl font-black text-accent">{getOddsForPlayer(player1.walletAddress).toFixed(2)}x</div>
                  <div className="text-[10px] text-text-tertiary uppercase tracking-wider">Odds</div>
                </div>
              </div>
              {player1Leading && (
                <div className="absolute -top-2 -left-2 px-2 py-0.5 rounded-full bg-success text-[10px] font-bold text-white uppercase tracking-wider">
                  Leading
                </div>
              )}
              {selectedPlayer === player1.walletAddress && (
                <div className="absolute top-2 right-2">
                  <div className="w-5 h-5 rounded-full bg-accent flex items-center justify-center">
                    <svg className="w-3 h-3 text-bg-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
              )}
            </button>
          )}

          <div className="text-center">
            <span className="text-xs text-text-tertiary font-bold uppercase tracking-wider">VS</span>
          </div>

          {player2 && (
            <button
              onClick={() => setSelectedPlayer(player2.walletAddress)}
              className={`relative w-full p-4 rounded-xl border-2 transition-all ${
                selectedPlayer === player2.walletAddress
                  ? 'border-accent bg-accent/5 shadow-[0_0_20px_rgba(0,212,170,0.15)]'
                  : 'border-border-primary bg-bg-tertiary hover:border-border-secondary'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${
                    player2Leading ? 'bg-success/20 text-success' : 'bg-bg-hover text-text-secondary'
                  }`}>
                    P2
                  </div>
                  <div className="text-left">
                    <div className="font-mono font-semibold text-sm">{formatWallet(player2.walletAddress)}</div>
                    <div className={`text-xs font-medium ${player2.account.totalPnlPercent >= 0 ? 'text-success' : 'text-danger'}`}>
                      {player2.account.totalPnlPercent >= 0 ? '+' : ''}{player2.account.totalPnlPercent.toFixed(2)}% PnL
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xl font-black text-accent">{getOddsForPlayer(player2.walletAddress).toFixed(2)}x</div>
                  <div className="text-[10px] text-text-tertiary uppercase tracking-wider">Odds</div>
                </div>
              </div>
              {player2Leading && (
                <div className="absolute -top-2 -left-2 px-2 py-0.5 rounded-full bg-success text-[10px] font-bold text-white uppercase tracking-wider">
                  Leading
                </div>
              )}
              {selectedPlayer === player2.walletAddress && (
                <div className="absolute top-2 right-2">
                  <div className="w-5 h-5 rounded-full bg-accent flex items-center justify-center">
                    <svg className="w-3 h-3 text-bg-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Wager Amount */}
      <div className="mb-5">
        <label className="flex items-center gap-2 text-sm font-medium text-text-secondary mb-3">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Wager Amount (SOL)
        </label>
        <div className="grid grid-cols-4 gap-2 mb-3">
          {BET_AMOUNTS.map((amount) => (
            <button
              key={amount}
              onClick={() => {
                setBetAmount(amount);
                setCustomAmount('');
              }}
              className={`py-2.5 rounded-xl text-sm font-bold transition-all ${
                betAmount === amount && !customAmount
                  ? 'bg-accent text-bg-primary shadow-lg shadow-accent/20'
                  : 'bg-bg-tertiary text-text-secondary hover:bg-bg-hover hover:text-text-primary'
              }`}
            >
              {amount}
            </button>
          ))}
        </div>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-tertiary font-medium text-sm">SOL</span>
          <input
            type="number"
            value={customAmount}
            onChange={(e) => setCustomAmount(e.target.value)}
            placeholder="Custom amount"
            className="w-full py-3 pl-14 pr-4 rounded-xl bg-bg-tertiary border border-border-primary focus:border-accent focus:ring-1 focus:ring-accent/50 text-sm font-mono transition-all outline-none"
          />
        </div>
      </div>

      {/* Potential Payout */}
      {selectedPlayer && (
        <div className="relative mb-5 p-4 rounded-xl bg-gradient-to-br from-accent/10 via-bg-tertiary to-purple-500/10 border border-accent/20 overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-accent/10 rounded-full blur-2xl" />
          <div className="relative flex items-center justify-between">
            <div>
              <div className="text-xs text-text-tertiary uppercase tracking-wider mb-1">Potential Win</div>
              <div className="text-2xl font-black text-accent">{getPotentialPayout().toFixed(2)} SOL</div>
              <div className="text-xs text-text-tertiary mt-1">at {getOddsForPlayer(selectedPlayer).toFixed(2)}x odds</div>
            </div>
            <div className="w-12 h-12 rounded-xl bg-accent/20 flex items-center justify-center">
              <svg className="w-6 h-6 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
              </svg>
            </div>
          </div>
        </div>
      )}

      {/* Place Bet Button */}
      <button
        onClick={handlePlaceBet}
        disabled={!selectedPlayer || isPlacing || isRequestingLock || !walletAddress}
        className="w-full py-4 rounded-xl font-bold text-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:shadow-[0_0_30px_rgba(168,85,247,0.4)]"
      >
        <div className="flex items-center justify-center gap-2">
          {!walletAddress ? (
            <>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 9m18 0V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v3" />
              </svg>
              Connect Wallet
            </>
          ) : isRequestingLock ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Locking Odds...
            </>
          ) : isPlacing ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Placing Bet...
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Place Bet
            </>
          )}
        </div>
      </button>

      {/* Bet Pool Info */}
      {odds && odds.totalPool > 0 && (
        <div className="mt-5 pt-5 border-t border-border-primary">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-text-secondary">Total Bet Pool</span>
            <span className="font-mono font-bold text-lg">{odds.totalPool.toFixed(2)} SOL</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-bg-tertiary text-center">
              <div className="text-xs text-text-tertiary mb-1">Backing P1</div>
              <div className="font-mono font-semibold">{odds.player1.totalBacked.toFixed(2)} SOL</div>
            </div>
            <div className="p-3 rounded-xl bg-bg-tertiary text-center">
              <div className="text-xs text-text-tertiary mb-1">Backing P2</div>
              <div className="font-mono font-semibold">{odds.player2.totalBacked.toFixed(2)} SOL</div>
            </div>
          </div>
        </div>
      )}

      {/* Recent Bets */}
      {recentBets.length > 0 && (
        <div className="mt-5 pt-5 border-t border-border-primary">
          <div className="flex items-center gap-2 mb-3">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-accent"></span>
            </span>
            <span className="text-sm font-medium text-text-secondary">Recent Bets</span>
          </div>
          <div className="space-y-2">
            {recentBets.map((bet) => (
              <div key={bet.id} className="flex items-center justify-between p-2 rounded-lg bg-bg-tertiary text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md bg-bg-hover flex items-center justify-center text-[10px] font-bold text-text-tertiary">
                    {formatWallet(bet.bettor).slice(0, 2)}
                  </div>
                  <span className="text-text-secondary">backed <span className="font-mono font-medium text-text-primary">{formatWallet(bet.backedPlayer)}</span></span>
                </div>
                <span className="font-mono font-bold">{bet.amount} SOL</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Odds Explanation */}
      <div className="mt-5 pt-5 border-t border-border-primary">
        <div className="flex items-center gap-2 mb-2">
          <svg className="w-4 h-4 text-text-tertiary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-xs font-medium text-text-tertiary">How odds work</span>
        </div>
        <p className="text-xs text-text-secondary leading-relaxed">
          Odds update based on current P&L and betting activity. Higher odds means higher risk, but higher reward. If no one bets against you, your bet is returned.
        </p>
      </div>

      {/* Odds Confirmation Modal */}
      {showConfirmModal && oddsLock && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-bg-secondary rounded-2xl p-6 max-w-sm w-full border border-border-primary shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg">Confirm Your Wager</h3>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${lockCountdown > 10 ? 'bg-success' : lockCountdown > 5 ? 'bg-warning' : 'bg-danger'} animate-pulse`} />
                <span className="text-sm font-mono text-text-secondary">{lockCountdown}s</span>
              </div>
            </div>

            <div className="space-y-4 mb-6">
              <div className="p-4 rounded-xl bg-bg-tertiary">
                <div className="flex justify-between mb-2">
                  <span className="text-sm text-text-secondary">Backing</span>
                  <span className="font-mono font-semibold">{formatWallet(oddsLock.backedPlayer)}</span>
                </div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm text-text-secondary">Amount</span>
                  <span className="font-mono font-bold">{oddsLock.amount.toFixed(2)} SOL</span>
                </div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm text-text-secondary">Locked Odds</span>
                  <span className="font-mono font-bold text-accent">{oddsLock.lockedOdds.toFixed(2)}x</span>
                </div>
                <div className="h-px bg-border-primary my-3" />
                <div className="flex justify-between">
                  <span className="text-sm text-text-secondary">Potential Win</span>
                  <span className="font-mono font-bold text-success">{oddsLock.potentialPayout.toFixed(2)} SOL</span>
                </div>
              </div>

              <p className="text-xs text-text-tertiary text-center">
                Your odds are locked for {lockCountdown} seconds. This transaction will transfer {oddsLock.amount.toFixed(2)} SOL to the battle escrow.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowConfirmModal(false);
                  setOddsLock(null);
                }}
                disabled={isPlacing}
                className="flex-1 py-3 rounded-xl font-semibold bg-bg-tertiary hover:bg-bg-hover transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmBet}
                disabled={isPlacing || lockCountdown === 0}
                className="flex-1 py-3 rounded-xl font-semibold bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:shadow-lg transition-all disabled:opacity-50"
              >
                {isPlacing ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Signing...</span>
                  </div>
                ) : (
                  'Confirm Wager'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
