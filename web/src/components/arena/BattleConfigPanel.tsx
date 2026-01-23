'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Zap, Clock, Coins, User, Users, UserPlus, ChevronDown, ChevronUp, Info } from 'lucide-react';
import { BattleConfig, BattleDuration } from '@/types';
import { QueueData } from './types';

const DURATION_OPTIONS: { value: BattleDuration; label: string }[] = [
  { value: 1800, label: '30 min' },
  { value: 3600, label: '1 hour' },
];

const ENTRY_FEE_OPTIONS = [
  { value: 0.1, label: '0.1 SOL', tier: 'Scavenger' },
  { value: 0.5, label: '0.5 SOL', tier: 'Raider' },
  { value: 1, label: '1 SOL', tier: 'Warlord' },
  { value: 5, label: '5 SOL', tier: 'Immortan' },
];

const STEPS = [
  {
    title: 'Enter the Cage',
    description: 'Find a challenger with the same blood price. Both start with $1,000 war chest.',
  },
  {
    title: 'Fight',
    description: 'Long or short with 20x leverage. Real prices. No mercy.',
  },
  {
    title: 'Claim the Spoils',
    description: 'Best P&L when the bell rings takes the entire loot pile.',
  },
];

interface BattleConfigPanelProps {
  onFindMatch: (config: BattleConfig) => void;
  onChallengeClick: () => void;
  isLoading?: boolean;
  error?: string | null;
  queueData?: QueueData;
}

export function BattleConfigPanel({
  onFindMatch,
  onChallengeClick,
  isLoading = false,
  error,
  queueData,
}: BattleConfigPanelProps) {
  const [selectedDuration, setSelectedDuration] = useState<BattleDuration>(1800);
  const [selectedFee, setSelectedFee] = useState(0.5);
  const [showHowItWorks, setShowHowItWorks] = useState(false);
  const [actionInProgress, setActionInProgress] = useState<'solo' | 'match' | null>(null);

  // Reset actionInProgress when loading completes
  useEffect(() => {
    if (!isLoading) {
      setActionInProgress(null);
    }
  }, [isLoading]);

  /**
   * Matchmaking wiring chain (MATCH-05 compliant):
   * 1. User selects entryFee from UI (selectedFee state)
   * 2. handleFindMatch creates config with selected entryFee
   * 3. onFindMatch -> BattleLobby.handleFindMatch -> BattleContext.queueMatchmaking
   * 4. queueMatchmaking emits socket.emit('queue_matchmaking', config, wallet)
   * 5. Backend socket handler calls battleManager.queueForMatchmaking(config, wallet)
   * 6. queueForMatchmaking calls async getMatchmakingKey(config, wallet)
   * 7. getMatchmakingKey uses eloService.shouldProtectPlayer() and eloService.getEloTier()
   * 8. Returns tier-aware key like `0.1-1800-paper-protected` or `0.1-1800-paper-gold`
   * 9. Players with identical keys get matched (same fee + duration + mode + ELO tier)
   */
  const handleFindMatch = () => {
    setActionInProgress('match');
    const config: BattleConfig = {
      entryFee: selectedFee,  // User-selected stake amount flows through entire chain
      duration: selectedDuration,
      mode: 'paper',
      maxPlayers: 2,
    };
    onFindMatch(config);
  };

  // Calculate matching players count
  const matchingPlayers = queueData
    ? (queueData.byTier[String(selectedFee)] || 0)
    : 0;

  return (
    <div className="bg-[#1a1a1a] border border-white/[0.06] rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 bg-gradient-to-r from-[#252525] to-[#1f1f1f] border-b border-white/[0.06]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-warning to-fire flex items-center justify-center">
            <Zap className="w-5 h-5 text-black" />
          </div>
          <div>
            <h2 className="font-bold text-lg">Configure Battle</h2>
            <p className="text-white/40 text-xs">Set your terms and find an opponent</p>
          </div>
        </div>
      </div>

      <div className="p-5">
        {error && (
          <div className="mb-5 p-4 rounded-xl bg-danger/10 border border-danger/30 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-danger/20 flex items-center justify-center flex-shrink-0">
              <Info className="w-4 h-4 text-danger" />
            </div>
            <span className="text-danger text-sm">{error}</span>
          </div>
        )}

        {/* Duration Selection */}
        <div className="mb-5">
          <label className="flex items-center gap-2 text-sm font-medium text-white/60 mb-3">
            <Clock className="w-4 h-4" />
            Battle Duration
          </label>
          <div className="grid grid-cols-2 gap-3">
            {DURATION_OPTIONS.map((option) => {
              const queueCount = queueData?.byDuration[option.value] || 0;
              return (
                <button
                  key={option.value}
                  onClick={() => setSelectedDuration(option.value)}
                  className={`relative p-4 rounded-xl border-2 transition-all ${
                    selectedDuration === option.value
                      ? 'border-warning bg-warning/5 shadow-[0_0_20px_rgba(255,85,0,0.15)]'
                      : 'border-white/[0.06] bg-white/[0.02] hover:border-white/10'
                  }`}
                >
                  <div className="flex items-center justify-center gap-2">
                    {option.value === 1800 ? (
                      <Zap className={`w-5 h-5 ${selectedDuration === option.value ? 'text-warning' : 'text-white/40'}`} />
                    ) : (
                      <Clock className={`w-5 h-5 ${selectedDuration === option.value ? 'text-warning' : 'text-white/40'}`} />
                    )}
                    <span className={`font-bold ${selectedDuration === option.value ? 'text-white' : 'text-white/60'}`}>
                      {option.label}
                    </span>
                  </div>
                  {/* Queue Badge */}
                  {queueCount > 0 && (
                    <span className="absolute -top-2 -right-2 px-2 py-0.5 rounded-full bg-success text-white text-xs font-bold">
                      {queueCount}
                    </span>
                  )}
                  {selectedDuration === option.value && (
                    <div className="absolute top-2 right-2">
                      <div className="w-4 h-4 rounded-full bg-warning flex items-center justify-center">
                        <svg className="w-2.5 h-2.5 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Entry Fee Selection */}
        <div className="mb-5">
          <label className="flex items-center gap-2 text-sm font-medium text-white/60 mb-3">
            <Coins className="w-4 h-4" />
            Entry Fee (Tier)
          </label>
          <div className="grid grid-cols-4 gap-2">
            {ENTRY_FEE_OPTIONS.map((option) => {
              const queueCount = queueData?.byTier[String(option.value)] || 0;
              return (
                <button
                  key={option.value}
                  onClick={() => setSelectedFee(option.value)}
                  className={`relative p-3 rounded-xl border-2 transition-all ${
                    selectedFee === option.value
                      ? 'border-warning bg-warning/5'
                      : 'border-white/[0.06] bg-white/[0.02] hover:border-white/10'
                  }`}
                >
                  <div className="text-center">
                    <div className={`text-[10px] font-medium mb-1 uppercase tracking-wider ${selectedFee === option.value ? 'text-warning' : 'text-white/40'}`}>
                      {option.tier}
                    </div>
                    <div className={`font-bold text-sm ${selectedFee === option.value ? 'text-white' : 'text-white/60'}`}>
                      {option.label}
                    </div>
                  </div>
                  {/* Queue Badge */}
                  {queueCount > 0 && (
                    <span className="absolute -top-2 -right-2 px-1.5 py-0.5 rounded-full bg-success text-white text-[10px] font-bold">
                      {queueCount}
                    </span>
                  )}
                  {selectedFee === option.value && (
                    <div className="absolute top-1.5 right-1.5">
                      <div className="w-3 h-3 rounded-full bg-warning flex items-center justify-center">
                        <svg className="w-2 h-2 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Prize Pool Display */}
        <div className="relative p-5 rounded-xl bg-gradient-to-br from-warning/10 via-[#252525] to-purple-500/10 border border-warning/20 mb-5 overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-warning/10 rounded-full blur-3xl" />
          <div className="relative flex items-center justify-between">
            <div>
              <div className="text-sm text-white/40 mb-1">Winner Takes</div>
              <div className="text-3xl font-black text-warning">
                {(selectedFee * 2 * 0.95).toFixed(2)} SOL
              </div>
              <div className="text-xs text-white/40 mt-1">
                {selectedFee * 2} SOL pool minus 5% fee
              </div>
            </div>
            <div className="w-16 h-16 rounded-2xl bg-warning/20 flex items-center justify-center">
              <svg className="w-8 h-8 text-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Match Preview */}
        {matchingPlayers > 0 && (
          <div className="mb-5 p-3 rounded-lg bg-success/10 border border-success/30 flex items-center gap-3">
            <div className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-success"></span>
            </div>
            <span className="text-sm text-success font-medium">
              {matchingPlayers} warrior{matchingPlayers !== 1 ? 's' : ''} looking for same battle!
            </span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            href="/battle/practice"
            className="flex-1 py-3 px-4 rounded-xl bg-white/5 border border-white/10 text-white/80 font-semibold hover:bg-white/10 hover:text-white hover:border-white/20 transition-all text-center"
          >
            <div className="flex items-center justify-center gap-2">
              <User className="w-4 h-4" />
              Solo Practice
            </div>
          </Link>
          <button
            onClick={handleFindMatch}
            disabled={isLoading}
            className={`flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-warning to-fire text-white font-bold transition-all disabled:opacity-50 active:scale-[0.98] ${
              matchingPlayers > 0 && !isLoading ? 'animate-pulse shadow-[0_0_20px_rgba(255,85,0,0.3)]' : ''
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              {isLoading && actionInProgress === 'match' ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Finding...
                </>
              ) : (
                <>
                  <Users className="w-4 h-4" />
                  Find Match
                </>
              )}
            </div>
          </button>
        </div>

        {/* Challenge a Friend */}
        <div className="mt-4 pt-4 border-t border-white/[0.06]">
          <button
            onClick={onChallengeClick}
            className="w-full py-3 px-4 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-400 font-semibold hover:bg-purple-500/20 hover:border-purple-500/50 transition-all flex items-center justify-center gap-2"
          >
            <UserPlus className="w-5 h-5" />
            Challenge a Friend
          </button>
          <p className="text-center text-white/40 text-xs mt-2">
            Create a shareable 1v1 battle link
          </p>
        </div>

        {/* How it Works (Collapsible) */}
        <div className="mt-4 pt-4 border-t border-white/[0.06]">
          <button
            onClick={() => setShowHowItWorks(!showHowItWorks)}
            className="w-full flex items-center justify-between text-sm font-medium text-white/60 hover:text-white/80 transition-colors"
          >
            <span className="flex items-center gap-2">
              <Info className="w-4 h-4" />
              How it Works
            </span>
            {showHowItWorks ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>

          {showHowItWorks && (
            <div className="mt-4 space-y-3">
              {STEPS.map((step, index) => (
                <div key={step.title} className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-warning/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold text-warning">{index + 1}</span>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-white/80">{step.title}</h4>
                    <p className="text-xs text-white/40 mt-0.5">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
