'use client';

import { useState, useEffect } from 'react';
import { Wallet, ArrowDownToLine, Target, Trophy, X, ChevronDown, ChevronUp } from 'lucide-react';

const GUIDE_DISMISSED_KEY = 'degendome_guide_dismissed';

interface FirstMatchGuideProps {
  onDismiss?: () => void;
  className?: string;
}

export function FirstMatchGuide({ onDismiss, className = '' }: FirstMatchGuideProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const handleDismiss = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(GUIDE_DISMISSED_KEY, 'true');
    }
    onDismiss?.();
  };

  return (
    <div
      className={`bg-black/60 backdrop-blur border border-white/10 rounded-xl overflow-hidden ${className}`}
    >
      {/* Header - always visible */}
      <div className="flex items-center justify-between p-3 sm:p-4">
        <div className="flex items-center gap-2">
          <Target className="w-5 h-5 text-warning" />
          <h3 className="text-sm sm:text-base font-bold text-white">Your First Prediction</h3>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="min-w-[32px] min-h-[32px] p-1 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors touch-manipulation"
            aria-label={isCollapsed ? 'Expand guide' : 'Collapse guide'}
          >
            {isCollapsed ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
          </button>
          <button
            onClick={handleDismiss}
            className="min-w-[32px] min-h-[32px] p-1 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors touch-manipulation"
            aria-label="Dismiss guide"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Content - collapsible */}
      {!isCollapsed && (
        <div className="px-3 sm:px-4 pb-3 sm:pb-4 space-y-3">
          {/* Steps */}
          <div className="space-y-2">
            <Step
              number={1}
              icon={<Wallet className="w-4 h-4" />}
              title="Connect your Solana wallet"
              description="Phantom, Solflare, or any Solana wallet"
            />
            <Step
              number={2}
              icon={<ArrowDownToLine className="w-4 h-4" />}
              title="Deposit SOL to your game balance"
              highlight="Minimum 0.01 SOL"
            />
            <Step
              number={3}
              icon={<Target className="w-4 h-4" />}
              title="Pick UP or DOWN before time runs out"
              description="Predict if SOL price goes up or down"
            />
            <Step
              number={4}
              icon={<Trophy className="w-4 h-4" />}
              title="Win? Get your share of the losing pool!"
              description="Winners split the pot (minus 5% fee)"
            />
          </div>

          {/* Tip */}
          <div className="bg-warning/10 border border-warning/30 rounded-lg p-2 sm:p-3">
            <p className="text-xs sm:text-sm text-warning flex items-start gap-2">
              <span className="text-warning/80 font-bold shrink-0">Tip:</span>
              <span className="text-white/80">
                Start small with <span className="text-warning font-bold">0.01 SOL</span> while you learn
              </span>
            </p>
          </div>

          {/* Got it button */}
          <button
            onClick={handleDismiss}
            className="w-full min-h-[44px] py-2 bg-warning/20 hover:bg-warning/30 border border-warning/40 rounded-lg text-warning font-medium text-sm transition-colors touch-manipulation"
          >
            Got it!
          </button>
        </div>
      )}
    </div>
  );
}

interface StepProps {
  number: number;
  icon: React.ReactNode;
  title: string;
  description?: string;
  highlight?: string;
}

function Step({ number, icon, title, description, highlight }: StepProps) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-warning/20 text-warning flex items-center justify-center text-xs font-bold">
        {number}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 text-sm text-white">
          <span className="text-warning/80">{icon}</span>
          <span className="font-medium">{title}</span>
        </div>
        {description && (
          <p className="text-xs text-white/50 mt-0.5">{description}</p>
        )}
        {highlight && (
          <p className="text-xs text-warning font-medium mt-0.5">{highlight}</p>
        )}
      </div>
    </div>
  );
}

// Helper to check if guide should be shown
export function shouldShowGuide(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(GUIDE_DISMISSED_KEY) !== 'true';
}
