'use client';

import { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useWallet } from '@solana/wallet-adapter-react';
import { cn } from '@/lib/utils';
import { BACKEND_URL } from '@/config/api';

interface CreateChallengeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onChallengeCreated: (challenge: CreatedChallenge) => void;
}

export interface CreatedChallenge {
  challengeId: string;
  challengeCode: string;
  shareUrl: string;
  shareLinks: {
    twitter: string;
    telegram: string;
  };
  expiresAt: number;
  entryFee: number;
  leverage: number;
  duration: number;
}

// Config matching backend CHALLENGE_CONFIG
const ENTRY_FEE_OPTIONS = [
  { value: 0.01, label: '0.01 SOL', tier: 'Scout' },
  { value: 0.05, label: '0.05 SOL', tier: 'Raider' },
  { value: 0.1, label: '0.1 SOL', tier: 'Warrior' },
  { value: 0.5, label: '0.5 SOL', tier: 'Warlord' },
  { value: 1, label: '1 SOL', tier: 'Champion' },
];

const LEVERAGE_OPTIONS = [
  { value: 2, label: '2x', risk: 'Low' },
  { value: 5, label: '5x', risk: 'Medium' },
  { value: 10, label: '10x', risk: 'High' },
  { value: 20, label: '20x', risk: 'Extreme' },
];

const DURATION_OPTIONS = [
  { value: 60, label: '1 min', description: 'Quick' },
  { value: 120, label: '2 min', description: 'Standard' },
  { value: 180, label: '3 min', description: 'Extended' },
  { value: 300, label: '5 min', description: 'Marathon' },
];

export function CreateChallengeModal({
  isOpen,
  onClose,
  onChallengeCreated,
}: CreateChallengeModalProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { publicKey } = useWallet();

  // Form state
  const [selectedFee, setSelectedFee] = useState(0.1);
  const [selectedLeverage, setSelectedLeverage] = useState(10);
  const [selectedDuration, setSelectedDuration] = useState(120);

  // Submit state
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => setIsVisible(true), 50);
      setError(null);
    } else {
      setIsVisible(false);
    }
  }, [isOpen]);

  const handleClose = useCallback(() => {
    setIsVisible(false);
    setTimeout(onClose, 300);
  }, [onClose]);

  const handleCreate = useCallback(async () => {
    if (!publicKey) {
      setError('Please connect your wallet');
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      const response = await fetch(`${BACKEND_URL}/api/challenges/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          walletAddress: publicKey.toBase58(),
          entryFee: selectedFee,
          leverage: selectedLeverage,
          duration: selectedDuration,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to create challenge');
        setIsCreating(false);
        return;
      }

      // Success - pass challenge data to parent
      onChallengeCreated({
        challengeId: data.challengeId,
        challengeCode: data.challengeCode,
        shareUrl: data.shareUrl,
        shareLinks: data.shareLinks,
        expiresAt: data.expiresAt,
        entryFee: selectedFee,
        leverage: selectedLeverage,
        duration: selectedDuration,
      });

      handleClose();
    } catch (err) {
      console.error('[CreateChallenge] Error:', err);
      setError('Failed to connect to server');
      setIsCreating(false);
    }
  }, [publicKey, selectedFee, selectedLeverage, selectedDuration, onChallengeCreated, handleClose]);

  const prizePool = selectedFee * 2;

  if (!mounted || !isOpen) return null;

  const modal = (
    <div
      className={cn(
        'fixed inset-0 z-50 flex items-center justify-center transition-all duration-300 p-4',
        isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
      )}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal content */}
      <div
        className={cn(
          'relative bg-[#0d0b09] border border-[#ff5500]/30 rounded-2xl max-w-lg w-full transform transition-all duration-300 shadow-2xl shadow-[#ff5500]/10 overflow-hidden',
          isVisible ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'
        )}
      >
        {/* Glow effect */}
        <div className="absolute -inset-1 bg-gradient-to-r from-[#ff5500]/20 via-transparent to-[#ff5500]/20 rounded-2xl blur-xl opacity-50 -z-10" />

        {/* Header */}
        <div className="bg-gradient-to-r from-[#ff5500]/20 via-[#ff5500]/10 to-[#ff5500]/20 border-b border-white/10 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#ff5500]/20 border border-[#ff5500]/30 flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-[#ff5500]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
                  />
                </svg>
              </div>
              <div>
                <h2 className="font-bold text-lg text-white">Challenge a Friend</h2>
                <p className="text-white/40 text-xs">Create a 1v1 battle link</p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/40 hover:text-white transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-[#cc2200]/20 border border-[#cc2200]/30 text-[#cc2200] text-sm">
              {error}
            </div>
          )}

          {/* Entry Fee */}
          <div className="mb-5">
            <label className="flex items-center gap-2 text-sm font-medium text-white/60 mb-3">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Entry Fee
            </label>
            <div className="grid grid-cols-5 gap-2">
              {ENTRY_FEE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setSelectedFee(option.value)}
                  className={cn(
                    'p-2 rounded-lg border transition-all text-center',
                    selectedFee === option.value
                      ? 'border-[#ff5500] bg-[#ff5500]/10'
                      : 'border-white/10 bg-white/5 hover:border-white/20'
                  )}
                >
                  <div className={cn(
                    'text-xs mb-0.5',
                    selectedFee === option.value ? 'text-[#ff5500]' : 'text-white/40'
                  )}>
                    {option.tier}
                  </div>
                  <div className={cn(
                    'font-bold text-sm',
                    selectedFee === option.value ? 'text-white' : 'text-white/60'
                  )}>
                    {option.value}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Leverage */}
          <div className="mb-5">
            <label className="flex items-center gap-2 text-sm font-medium text-white/60 mb-3">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
              Leverage
            </label>
            <div className="grid grid-cols-4 gap-2">
              {LEVERAGE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setSelectedLeverage(option.value)}
                  className={cn(
                    'p-3 rounded-lg border transition-all text-center',
                    selectedLeverage === option.value
                      ? 'border-[#ff5500] bg-[#ff5500]/10'
                      : 'border-white/10 bg-white/5 hover:border-white/20'
                  )}
                >
                  <div className={cn(
                    'font-bold text-lg',
                    selectedLeverage === option.value ? 'text-white' : 'text-white/60'
                  )}>
                    {option.label}
                  </div>
                  <div className={cn(
                    'text-xs',
                    selectedLeverage === option.value
                      ? option.value >= 10 ? 'text-[#cc2200]' : 'text-[#ff5500]'
                      : 'text-white/40'
                  )}>
                    {option.risk}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Duration */}
          <div className="mb-5">
            <label className="flex items-center gap-2 text-sm font-medium text-white/60 mb-3">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Battle Duration
            </label>
            <div className="grid grid-cols-4 gap-2">
              {DURATION_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setSelectedDuration(option.value)}
                  className={cn(
                    'p-3 rounded-lg border transition-all text-center',
                    selectedDuration === option.value
                      ? 'border-[#ff5500] bg-[#ff5500]/10'
                      : 'border-white/10 bg-white/5 hover:border-white/20'
                  )}
                >
                  <div className={cn(
                    'font-bold',
                    selectedDuration === option.value ? 'text-white' : 'text-white/60'
                  )}>
                    {option.label}
                  </div>
                  <div className={cn(
                    'text-xs',
                    selectedDuration === option.value ? 'text-[#ff5500]' : 'text-white/40'
                  )}>
                    {option.description}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Prize Pool Display */}
          <div className="p-4 rounded-xl bg-gradient-to-br from-[#ff5500]/10 via-black/40 to-[#7fba00]/10 border border-[#ff5500]/20 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-white/40 mb-1">Prize Pool</div>
                <div className="text-2xl font-bold text-[#ff5500]">
                  {prizePool.toFixed(2)} SOL
                </div>
                <div className="text-xs text-white/40 mt-1">
                  {selectedFee} SOL each
                </div>
              </div>
              <div className="w-14 h-14 rounded-xl bg-[#ff5500]/20 border border-[#ff5500]/30 flex items-center justify-center">
                <svg className="w-7 h-7 text-[#ff5500]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Create Button */}
          <button
            onClick={handleCreate}
            disabled={isCreating || !publicKey}
            className={cn(
              'w-full py-4 px-6 rounded-xl font-bold text-lg transition-all',
              isCreating || !publicKey
                ? 'bg-white/10 text-white/40 cursor-not-allowed'
                : 'bg-[#ff5500] hover:bg-[#ff5500]/90 text-black hover:scale-[1.02] active:scale-[0.98]'
            )}
          >
            {isCreating ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Creating Challenge...
              </span>
            ) : !publicKey ? (
              'Connect Wallet to Create'
            ) : (
              'Create Challenge Link'
            )}
          </button>

          <p className="text-center text-white/40 text-xs mt-3">
            Challenge expires in 24 hours
          </p>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
