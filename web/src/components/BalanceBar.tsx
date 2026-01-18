'use client';

import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useSessionBetting } from '@/hooks/useSessionBetting';

export function BalanceBar() {
  const { publicKey } = useWallet();
  const {
    balanceInSol,
    deposit,
    isLoading: isSessionLoading,
    error: sessionError,
  } = useSessionBetting();

  const [showDepositModal, setShowDepositModal] = useState(false);
  const [depositAmount, setDepositAmount] = useState('0.5');
  const [error, setError] = useState<string | null>(null);

  const handleDeposit = async () => {
    try {
      const amount = parseFloat(depositAmount);
      if (isNaN(amount) || amount <= 0) {
        setError('Invalid deposit amount');
        return;
      }
      await deposit(amount);
      setShowDepositModal(false);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to deposit');
    }
  };

  // Don't render if no wallet connected
  if (!publicKey) return null;

  return (
    <>
      {/* Fixed Balance Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 p-4 bg-[#0a0a0a]/95 backdrop-blur border-t border-white/10">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-white/40 text-sm">Balance:</span>
            <span className="text-white font-bold text-lg">{balanceInSol.toFixed(4)} SOL</span>
          </div>
          <button
            onClick={() => setShowDepositModal(true)}
            className="px-6 py-2 rounded-lg bg-warning/20 text-warning font-bold hover:bg-warning/30 transition-colors"
          >
            Deposit
          </button>
        </div>
      </div>

      {/* Deposit Modal */}
      {showDepositModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#0a0a0a] border border-white/10 rounded-xl p-6 w-full max-w-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">Deposit SOL</h3>
              <button
                onClick={() => setShowDepositModal(false)}
                className="text-white/40 hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mb-4">
              <label className="text-white/40 text-xs uppercase mb-1 block">Amount (SOL)</label>
              <input
                type="number"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                min="0.01"
                step="0.1"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white font-mono focus:border-warning/50 focus:outline-none"
              />
            </div>

            <div className="flex gap-2 mb-4">
              {['0.1', '0.5', '1', '2'].map((amount) => (
                <button
                  key={amount}
                  onClick={() => setDepositAmount(amount)}
                  className={`flex-1 py-2 rounded-lg text-sm font-bold transition-colors ${
                    depositAmount === amount
                      ? 'bg-warning/20 text-warning border border-warning/50'
                      : 'bg-white/5 text-white/60 border border-white/10 hover:bg-white/10'
                  }`}
                >
                  {amount}
                </button>
              ))}
            </div>

            <button
              onClick={handleDeposit}
              disabled={isSessionLoading}
              className="w-full py-3 rounded-xl bg-warning text-black font-bold hover:bg-warning/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSessionLoading ? 'Depositing...' : 'Deposit'}
            </button>

            {(sessionError || error) && (
              <p className="text-danger text-sm mt-2 text-center">{sessionError || error}</p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
