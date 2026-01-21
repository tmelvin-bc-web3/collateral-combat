'use client';

import { useState, useCallback, useEffect } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import { useSessionBetting } from '@/hooks/useSessionBetting';
import { useTxProgress } from '@/hooks/useTxProgress';
import { TxProgress } from '@/components/TxProgress';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { getFriendlyErrorMessage } from '@/lib/error-messages';

interface WalletBalanceProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabType = 'deposit' | 'withdraw' | 'session';

const QUICK_AMOUNTS = [0.1, 0.25, 0.5, 1, 2, 5];

export function WalletBalance({ isOpen, onClose }: WalletBalanceProps) {
  const { publicKey } = useWallet();
  const { connection } = useConnection();

  const {
    balanceInSol,
    hasValidSession,
    sessionValidUntil,
    isLoading,
    error,
    deposit,
    withdraw,
    createSession,
    revokeSession,
    fetchBalance,
  } = useSessionBetting();

  const [activeTab, setActiveTab] = useState<TabType>('deposit');
  const [amount, setAmount] = useState('');
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [txStatus, setTxStatus] = useState<'idle' | 'pending' | 'success' | 'error'>('idle');
  const [txMessage, setTxMessage] = useState('');

  // Transaction progress tracking for multi-step feedback
  const txProgress = useTxProgress();

  // Fetch wallet SOL balance
  useEffect(() => {
    if (!publicKey || !connection) return;

    const fetchWalletBalance = async () => {
      try {
        const balance = await connection.getBalance(publicKey);
        setWalletBalance(balance / LAMPORTS_PER_SOL);
      } catch (e) {
        console.error('Failed to fetch wallet balance:', e);
      }
    };

    fetchWalletBalance();
    const interval = setInterval(fetchWalletBalance, 10000);
    return () => clearInterval(interval);
  }, [publicKey, connection]);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setAmount('');
      setTxStatus('idle');
      setTxMessage('');
      txProgress.reset();
      fetchBalance();
    }
  }, [isOpen, fetchBalance, txProgress]);

  const handleDeposit = useCallback(async () => {
    const value = parseFloat(amount);
    if (isNaN(value) || value <= 0) {
      setTxStatus('error');
      setTxMessage('Please enter a valid amount');
      txProgress.fail('Please enter a valid amount');
      return;
    }

    if (value > walletBalance) {
      setTxStatus('error');
      setTxMessage('Insufficient wallet balance');
      txProgress.fail('Insufficient wallet balance');
      return;
    }

    setTxStatus('pending');
    setTxMessage('Confirming transaction...');
    txProgress.startSigning();

    try {
      txProgress.startSending();
      await deposit(value);
      txProgress.startConfirming();
      setTxStatus('success');
      setTxMessage(`Successfully deposited ${value} SOL`);
      txProgress.complete();
      setAmount('');
      // Refresh wallet balance
      if (publicKey && connection) {
        const balance = await connection.getBalance(publicKey);
        setWalletBalance(balance / LAMPORTS_PER_SOL);
      }
    } catch (e: unknown) {
      const errorMsg = getFriendlyErrorMessage(e);
      setTxStatus('error');
      setTxMessage(errorMsg);
      txProgress.fail(errorMsg);
    }
  }, [amount, walletBalance, deposit, publicKey, connection, txProgress]);

  const handleWithdraw = useCallback(async () => {
    const value = parseFloat(amount);
    if (isNaN(value) || value <= 0) {
      setTxStatus('error');
      setTxMessage('Please enter a valid amount');
      txProgress.fail('Please enter a valid amount');
      return;
    }

    if (value > balanceInSol) {
      setTxStatus('error');
      setTxMessage('Insufficient balance');
      txProgress.fail('Insufficient balance');
      return;
    }

    setTxStatus('pending');
    setTxMessage('Confirming transaction...');
    txProgress.startSigning();

    try {
      txProgress.startSending();
      await withdraw(value);
      txProgress.startConfirming();
      setTxStatus('success');
      setTxMessage(`Successfully withdrew ${value} SOL`);
      txProgress.complete();
      setAmount('');
      // Refresh wallet balance
      if (publicKey && connection) {
        const balance = await connection.getBalance(publicKey);
        setWalletBalance(balance / LAMPORTS_PER_SOL);
      }
    } catch (e: unknown) {
      const errorMsg = getFriendlyErrorMessage(e);
      setTxStatus('error');
      setTxMessage(errorMsg);
      txProgress.fail(errorMsg);
    }
  }, [amount, balanceInSol, withdraw, publicKey, connection, txProgress]);

  const handleCreateSession = useCallback(async () => {
    setTxStatus('pending');
    setTxMessage('Creating session...');
    txProgress.startSigning();

    try {
      txProgress.startSending();
      await createSession(24); // 24 hours
      txProgress.startConfirming();
      setTxStatus('success');
      setTxMessage('Session created! You can now bet without signing each transaction.');
      txProgress.complete();
    } catch (e: unknown) {
      const errorMsg = getFriendlyErrorMessage(e);
      setTxStatus('error');
      setTxMessage(errorMsg);
      txProgress.fail(errorMsg);
    }
  }, [createSession, txProgress]);

  const handleRevokeSession = useCallback(async () => {
    setTxStatus('pending');
    setTxMessage('Revoking session...');
    txProgress.startSigning();

    try {
      txProgress.startSending();
      await revokeSession();
      txProgress.startConfirming();
      setTxStatus('success');
      setTxMessage('Session revoked successfully');
      txProgress.complete();
    } catch (e: unknown) {
      const errorMsg = getFriendlyErrorMessage(e);
      setTxStatus('error');
      setTxMessage(errorMsg);
      txProgress.fail(errorMsg);
    }
  }, [revokeSession, txProgress]);

  const formatTimeRemaining = (timestamp: number) => {
    const now = Math.floor(Date.now() / 1000);
    const remaining = timestamp - now;

    if (remaining <= 0) return 'Expired';

    const hours = Math.floor(remaining / 3600);
    const minutes = Math.floor((remaining % 3600) / 60);

    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days}d ${hours % 24}h`;
    }
    return `${hours}h ${minutes}m`;
  };

  const maxAmount = activeTab === 'deposit' ? walletBalance : balanceInSol;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-[#0a0908] border border-white/10 text-white w-full max-w-md mx-4 overflow-y-auto max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl font-bold">Wallet Balance</DialogTitle>
          <DialogDescription className="text-sm sm:text-base text-white/60">
            Manage your betting balance and session
          </DialogDescription>
        </DialogHeader>

        {/* Balance Display */}
        <div className="bg-black/40 rounded-xl p-3 sm:p-4 border border-white/10">
          <div className="flex justify-between items-center mb-2 sm:mb-3">
            <span className="text-white/60 text-xs sm:text-sm">Betting Balance</span>
            <span className="text-xl sm:text-2xl font-bold text-warning truncate ml-2">{balanceInSol.toFixed(4)} SOL</span>
          </div>
          <div className="flex justify-between items-center text-xs sm:text-sm">
            <span className="text-white/40">Wallet Balance</span>
            <span className="text-white/60 truncate ml-2">{walletBalance.toFixed(4)} SOL</span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 sm:gap-2 bg-black/40 rounded-lg p-1">
          {(['deposit', 'withdraw', 'session'] as TabType[]).map((tab) => (
            <button
              key={tab}
              onClick={() => {
                setActiveTab(tab);
                setTxStatus('idle');
                setAmount('');
                txProgress.reset();
              }}
              className={`flex-1 min-h-[44px] py-2 px-2 sm:px-3 rounded-md text-xs sm:text-sm font-medium transition-all capitalize touch-manipulation ${
                activeTab === tab
                  ? 'bg-warning text-black'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Deposit/Withdraw Tab Content */}
        {(activeTab === 'deposit' || activeTab === 'withdraw') && (
          <div className="space-y-3 sm:space-y-4">
            {/* Quick Amount Buttons */}
            <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
              {QUICK_AMOUNTS.map((quickAmount) => (
                <button
                  key={quickAmount}
                  onClick={() => setAmount(quickAmount.toString())}
                  disabled={quickAmount > maxAmount}
                  className={`min-h-[44px] py-2 rounded-lg text-xs sm:text-sm font-medium transition-all touch-manipulation ${
                    parseFloat(amount) === quickAmount
                      ? 'bg-warning text-black'
                      : 'bg-white/10 text-white hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed'
                  }`}
                >
                  {quickAmount} SOL
                </button>
              ))}
            </div>

            {/* Custom Amount Input */}
            <div className="relative">
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Enter amount"
                step="0.01"
                min="0"
                max={maxAmount}
                className="w-full min-h-[44px] bg-black/40 border border-white/20 rounded-lg px-4 py-3 text-base text-white placeholder-white/40 focus:outline-none focus:border-warning"
              />
              <button
                onClick={() => setAmount(maxAmount.toFixed(4))}
                className="absolute right-2 top-1/2 -translate-y-1/2 min-w-[44px] min-h-[44px] flex items-center justify-center text-xs text-warning hover:underline touch-manipulation"
              >
                MAX
              </button>
            </div>

            {/* Action Button */}
            <button
              onClick={activeTab === 'deposit' ? handleDeposit : handleWithdraw}
              disabled={isLoading || txProgress.isActive || !amount}
              className={`w-full min-h-[44px] py-3 rounded-lg font-bold text-base sm:text-lg transition-all touch-manipulation ${
                activeTab === 'deposit'
                  ? 'bg-success text-black hover:bg-success/80'
                  : 'bg-danger text-white hover:bg-danger/80'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {txProgress.isActive ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Processing...
                </span>
              ) : activeTab === 'deposit' ? (
                'Deposit SOL'
              ) : (
                'Withdraw SOL'
              )}
            </button>

            {/* Transaction Progress Indicator */}
            <TxProgress status={txProgress.status} errorMessage={txProgress.errorMessage} />
          </div>
        )}

        {/* Session Tab Content */}
        {activeTab === 'session' && (
          <div className="space-y-3 sm:space-y-4">
            <div className="bg-black/40 rounded-xl p-3 sm:p-4 border border-white/10">
              <div className="flex items-center justify-between mb-2">
                <span className="text-white/60 text-xs sm:text-sm">Session Status</span>
                <span
                  className={`px-2 py-1 rounded text-xs font-medium ${
                    hasValidSession
                      ? 'bg-success/20 text-success'
                      : 'bg-white/10 text-white/40'
                  }`}
                >
                  {hasValidSession ? 'Active' : 'No Session'}
                </span>
              </div>

              {hasValidSession && sessionValidUntil && (
                <div className="flex items-center justify-between text-xs sm:text-sm">
                  <span className="text-white/40">Expires in</span>
                  <span className="text-white/60">{formatTimeRemaining(sessionValidUntil)}</span>
                </div>
              )}
            </div>

            <div className="bg-black/20 rounded-lg p-3 border border-white/5">
              <h4 className="text-xs sm:text-sm font-medium text-white/80 mb-2">What is a Session?</h4>
              <p className="text-[11px] sm:text-xs text-white/50 leading-relaxed">
                A session lets you place bets without signing each transaction.
                You sign once to create a session (up to 24 hours), then bet freely.
                <span className="block mt-2 text-warning/80">
                  Withdrawals always require your wallet signature for security.
                </span>
              </p>
            </div>

            {hasValidSession ? (
              <button
                onClick={handleRevokeSession}
                disabled={isLoading || txProgress.isActive}
                className="w-full min-h-[44px] py-3 rounded-lg font-bold text-base sm:text-lg bg-danger text-white hover:bg-danger/80 disabled:opacity-50 disabled:cursor-not-allowed transition-all touch-manipulation"
              >
                {txProgress.isActive ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    Revoking...
                  </span>
                ) : (
                  'Revoke Session'
                )}
              </button>
            ) : (
              <button
                onClick={handleCreateSession}
                disabled={isLoading || txProgress.isActive}
                className="w-full min-h-[44px] py-3 rounded-lg font-bold text-base sm:text-lg bg-warning text-black hover:bg-warning/80 disabled:opacity-50 disabled:cursor-not-allowed transition-all touch-manipulation"
              >
                {txProgress.isActive ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    Creating...
                  </span>
                ) : (
                  'Create Session (24h)'
                )}
              </button>
            )}

            {/* Transaction Progress Indicator */}
            <TxProgress status={txProgress.status} errorMessage={txProgress.errorMessage} />
          </div>
        )}

        {/* Status Message */}
        {txStatus !== 'idle' && txMessage && (
          <div
            className={`p-3 rounded-lg text-xs sm:text-sm ${
              txStatus === 'success'
                ? 'bg-success/20 text-success border border-success/30'
                : txStatus === 'error'
                ? 'bg-danger/20 text-danger border border-danger/30'
                : 'bg-white/10 text-white/60 border border-white/10'
            }`}
          >
            {txMessage}
          </div>
        )}

        {/* Error from hook */}
        {error && txStatus === 'idle' && (
          <div className="p-3 rounded-lg text-xs sm:text-sm bg-danger/20 text-danger border border-danger/30">
            {error}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// Compact balance display component for header
export function WalletBalanceButton({ onClick }: { onClick: () => void }) {
  const { balanceInSol, hasValidSession } = useSessionBetting();
  const { publicKey } = useWallet();

  if (!publicKey) return null;

  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 min-h-[44px] bg-black/40 hover:bg-black/60 border border-white/10 rounded-lg px-3 py-2 transition-all touch-manipulation"
    >
      <span className="text-warning font-bold text-sm sm:text-base">{balanceInSol.toFixed(2)} SOL</span>
      {hasValidSession && (
        <span className="w-2 h-2 rounded-full bg-success animate-pulse" title="Session active" />
      )}
    </button>
  );
}
