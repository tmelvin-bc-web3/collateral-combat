'use client';

import { useState, useEffect, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { BattleProvider, useBattleContext } from '@/contexts/BattleContext';
import { PracticeArena } from '@/components/practice';
import { PageLoading } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/Card';
import { BattleConfig, BattleDuration } from '@/types';
import Link from 'next/link';

const DURATION_OPTIONS: { value: BattleDuration; label: string }[] = [
  { value: 1800, label: '30 min' },
  { value: 3600, label: '60 min' },
];

function PracticeContent() {
  const { connected } = useWallet();
  const { battle, startSoloPractice, leaveBattle, isLoading } = useBattleContext();
  const [duration, setDuration] = useState<BattleDuration>(1800);
  const [isStarting, setIsStarting] = useState(false);
  const [resetKey, setResetKey] = useState(0);

  const handleReset = useCallback(() => {
    // Leave current battle and start a new one
    leaveBattle();
    setIsStarting(true);
    // Small delay to ensure cleanup, then start fresh
    setTimeout(() => {
      const config: BattleConfig = {
        entryFee: 0,
        duration: 1800,
        mode: 'paper',
        maxPlayers: 1,
      };
      startSoloPractice(config);
      setResetKey(prev => prev + 1);
      setIsStarting(false);
    }, 100);
  }, [leaveBattle, startSoloPractice]);

  // If in an active battle, show the practice arena
  if (battle && battle.status === 'active') {
    return <PracticeArena key={resetKey} battle={battle} onReset={handleReset} />;
  }

  const handleStartPractice = () => {
    setIsStarting(true);
    const config: BattleConfig = {
      entryFee: 0,
      duration,
      mode: 'paper',
      maxPlayers: 1,
    };
    startSoloPractice(config);
  };

  // Not connected
  if (!connected) {
    return (
      <div className="max-w-lg mx-auto mt-16 text-center animate-fadeIn">
        <Card className="p-8">
          <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-warning/20 border border-warning/30 flex items-center justify-center">
            <svg className="w-8 h-8 text-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold mb-3">Connect Wallet</h1>
          <p className="text-white/60 mb-6">
            Connect your wallet to start practicing. No funds required for practice mode.
          </p>
          <button
            className="px-6 py-3 bg-gradient-to-r from-warning to-fire text-black font-bold rounded-xl hover:shadow-lg hover:shadow-warning/30 transition-all"
            onClick={() => {
              const walletBtn = document.querySelector('.wallet-adapter-button') as HTMLButtonElement;
              if (walletBtn) walletBtn.click();
            }}
          >
            Connect Wallet
          </button>
        </Card>
      </div>
    );
  }

  // Practice lobby
  return (
    <div className="max-w-lg mx-auto mt-8 animate-fadeIn">
      {/* Header */}
      <div className="text-center mb-8">
        <Link
          href="/battle"
          className="inline-flex items-center gap-2 text-white/50 hover:text-white/80 transition-colors mb-4"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back to Arena
        </Link>
        <h1 className="text-3xl font-black uppercase tracking-wider" style={{ fontFamily: 'Impact, sans-serif' }}>
          <span className="text-warning">Practice</span> Mode
        </h1>
        <p className="text-white/60 mt-2">
          Hone your skills with no risk. Trade against the market.
        </p>
      </div>

      <Card className="p-6">
        {/* Features */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="p-3 rounded-lg bg-white/5 border border-white/10 text-center">
            <div className="text-success font-bold">$1,000</div>
            <div className="text-xs text-white/40">Starting Balance</div>
          </div>
          <div className="p-3 rounded-lg bg-white/5 border border-white/10 text-center">
            <div className="text-warning font-bold">20x</div>
            <div className="text-xs text-white/40">Max Leverage</div>
          </div>
          <div className="p-3 rounded-lg bg-white/5 border border-white/10 text-center">
            <div className="text-purple-400 font-bold">No Limit</div>
            <div className="text-xs text-white/40">Time</div>
          </div>
          <div className="p-3 rounded-lg bg-white/5 border border-white/10 text-center">
            <div className="text-cyan-400 font-bold">Free</div>
            <div className="text-xs text-white/40">Entry</div>
          </div>
        </div>

        {/* Info */}
        <div className="p-4 rounded-lg bg-warning/5 border border-warning/20 mb-6">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="text-sm text-white/70">
              <p className="font-medium text-white mb-1">Practice Mode</p>
              <p>Trade with simulated funds using real market prices. Perfect for learning the arena before entering real battles.</p>
            </div>
          </div>
        </div>

        {/* Start Button */}
        <button
          onClick={handleStartPractice}
          disabled={isLoading || isStarting}
          className="w-full py-4 rounded-xl bg-gradient-to-r from-warning to-fire text-black font-bold text-lg hover:shadow-lg hover:shadow-warning/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading || isStarting ? (
            <div className="flex items-center justify-center gap-2">
              <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
              Starting...
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Start Practice
            </div>
          )}
        </button>
      </Card>

      {/* Tips */}
      <div className="mt-6">
        <h3 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-3">Quick Tips</h3>
        <div className="space-y-2">
          {[
            'Use leverage wisely - higher leverage means higher risk',
            'Watch the price action before opening positions',
            'Practice closing positions at the right time',
            'Try different assets to find your edge',
          ].map((tip, i) => (
            <div key={i} className="flex items-start gap-2 text-sm text-white/50">
              <span className="text-warning">•</span>
              <span>{tip}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function PracticeWithWallet() {
  const { publicKey, signMessage } = useWallet();
  const walletAddress = publicKey?.toBase58() || null;

  return (
    <BattleProvider walletAddress={walletAddress} signMessage={signMessage}>
      <PracticeContent />
    </BattleProvider>
  );
}

export default function PracticePage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <PageLoading message="Loading Practice Mode..." />;
  }

  return <PracticeWithWallet />;
}
