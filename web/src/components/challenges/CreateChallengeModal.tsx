'use client';

import { useState } from 'react';
import { X, Zap, Clock, Coins, Target } from 'lucide-react';

interface CreateChallengeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (params: {
    entryFee: number;
    leverage: number;
    duration: number;
    targetWallet?: string;
  }) => Promise<void>;
}

const ENTRY_FEES = [0.01, 0.05, 0.1, 0.5, 1];
const LEVERAGES = [2, 5, 10, 20];
const DURATIONS = [60, 180, 300]; // seconds

export function CreateChallengeModal({ isOpen, onClose, onCreate }: CreateChallengeModalProps) {
  const [entryFee, setEntryFee] = useState(0.1);
  const [leverage, setLeverage] = useState(5);
  const [duration, setDuration] = useState(180);
  const [targetWallet, setTargetWallet] = useState('');
  const [isDirectChallenge, setIsDirectChallenge] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleCreate = async () => {
    setLoading(true);
    setError('');
    try {
      await onCreate({
        entryFee,
        leverage,
        duration,
        targetWallet: isDirectChallenge && targetWallet ? targetWallet : undefined,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create challenge');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur">
      <div className="w-full max-w-md bg-[#0d0d0d] border border-white/10 rounded-2xl p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-black text-white">Create Challenge</h3>
          <button onClick={onClose} className="text-white/40 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Entry Fee */}
        <div className="mb-4">
          <label className="flex items-center gap-2 text-sm text-white/60 mb-2">
            <Coins className="w-4 h-4" /> Entry Fee (SOL)
          </label>
          <div className="flex gap-2">
            {ENTRY_FEES.map(fee => (
              <button
                key={fee}
                onClick={() => setEntryFee(fee)}
                className={`flex-1 py-2 rounded-lg text-sm font-bold transition-colors ${
                  entryFee === fee
                    ? 'bg-warning text-black'
                    : 'bg-white/10 text-white hover:bg-white/20'
                }`}
              >
                {fee}
              </button>
            ))}
          </div>
        </div>

        {/* Leverage */}
        <div className="mb-4">
          <label className="flex items-center gap-2 text-sm text-white/60 mb-2">
            <Zap className="w-4 h-4" /> Leverage
          </label>
          <div className="flex gap-2">
            {LEVERAGES.map(lev => (
              <button
                key={lev}
                onClick={() => setLeverage(lev)}
                className={`flex-1 py-2 rounded-lg text-sm font-bold transition-colors ${
                  leverage === lev
                    ? 'bg-purple-500 text-white'
                    : 'bg-white/10 text-white hover:bg-white/20'
                }`}
              >
                {lev}x
              </button>
            ))}
          </div>
        </div>

        {/* Duration */}
        <div className="mb-4">
          <label className="flex items-center gap-2 text-sm text-white/60 mb-2">
            <Clock className="w-4 h-4" /> Duration
          </label>
          <div className="flex gap-2">
            {DURATIONS.map(dur => (
              <button
                key={dur}
                onClick={() => setDuration(dur)}
                className={`flex-1 py-2 rounded-lg text-sm font-bold transition-colors ${
                  duration === dur
                    ? 'bg-blue-500 text-white'
                    : 'bg-white/10 text-white hover:bg-white/20'
                }`}
              >
                {dur / 60}m
              </button>
            ))}
          </div>
        </div>

        {/* Direct Challenge Toggle */}
        <div className="mb-4">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={isDirectChallenge}
              onChange={e => setIsDirectChallenge(e.target.checked)}
              className="w-4 h-4 rounded border-white/20"
            />
            <span className="text-sm text-white/60">Direct challenge specific wallet</span>
          </label>
        </div>

        {/* Target Wallet Input */}
        {isDirectChallenge && (
          <div className="mb-4">
            <label className="flex items-center gap-2 text-sm text-white/60 mb-2">
              <Target className="w-4 h-4" /> Target Wallet Address
            </label>
            <input
              type="text"
              value={targetWallet}
              onChange={e => setTargetWallet(e.target.value)}
              placeholder="Enter wallet address..."
              className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/30 focus:border-warning focus:outline-none"
            />
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mb-4 p-3 bg-danger/20 border border-danger/40 rounded-lg text-danger text-sm">
            {error}
          </div>
        )}

        {/* Create Button */}
        <button
          onClick={handleCreate}
          disabled={loading}
          className="w-full py-3 bg-warning text-black font-bold rounded-lg hover:bg-warning/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Creating...' : 'Create Challenge'}
        </button>
      </div>
    </div>
  );
}
