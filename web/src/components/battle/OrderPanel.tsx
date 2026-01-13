'use client';

import { useState } from 'react';
import { PositionSide, Leverage } from '@/types';

interface OrderPanelProps {
  selectedAsset: string;
  availableBalance: number;
  hasExistingPosition: boolean;
  onOpenPosition: (side: PositionSide, leverage: Leverage, size: number) => void;
}

const LEVERAGE_OPTIONS: Leverage[] = [2, 5, 10, 20];

export function OrderPanel({
  selectedAsset,
  availableBalance,
  hasExistingPosition,
  onOpenPosition,
}: OrderPanelProps) {
  const [side, setSide] = useState<PositionSide>('long');
  const [leverage, setLeverage] = useState<Leverage>(5);
  const [margin, setMargin] = useState('100');

  const marginValue = parseFloat(margin) || 0;
  const positionSize = marginValue * leverage;
  const isValid = marginValue >= 10 && marginValue <= availableBalance && !hasExistingPosition;

  const handleSubmit = () => {
    if (!isValid) return;
    onOpenPosition(side, leverage, positionSize);
    setMargin('100');
  };

  const handleQuickSize = (percent: number) => {
    const amount = Math.floor((availableBalance * percent) / 100);
    setMargin(amount.toString());
  };

  return (
    <div className="w-[280px] flex-shrink-0 bg-bg-secondary border-l border-border-primary flex flex-col h-full">
      {/* Long/Short Tabs */}
      <div className="grid grid-cols-2">
        <button
          onClick={() => setSide('long')}
          className={`py-3 text-sm font-bold uppercase transition-all ${
            side === 'long'
              ? 'bg-success text-white'
              : 'bg-bg-tertiary text-text-tertiary hover:text-text-secondary'
          }`}
        >
          Long
        </button>
        <button
          onClick={() => setSide('short')}
          className={`py-3 text-sm font-bold uppercase transition-all ${
            side === 'short'
              ? 'bg-danger text-white'
              : 'bg-bg-tertiary text-text-tertiary hover:text-text-secondary'
          }`}
        >
          Short
        </button>
      </div>

      <div className="flex-1 p-4 space-y-4 overflow-y-auto">
        {/* Order Type - Market only for battles */}
        <div>
          <label className="text-xs text-text-tertiary uppercase tracking-wider">Order Type</label>
          <div className="mt-1.5 px-3 py-2 rounded bg-bg-tertiary text-sm text-text-secondary">
            Market
          </div>
        </div>

        {/* Leverage */}
        <div>
          <div className="flex justify-between items-center mb-1.5">
            <label className="text-xs text-text-tertiary uppercase tracking-wider">Leverage</label>
            <span className="text-sm font-mono font-bold text-accent">{leverage}x</span>
          </div>
          <div className="grid grid-cols-4 gap-1">
            {LEVERAGE_OPTIONS.map((lev) => (
              <button
                key={lev}
                onClick={() => setLeverage(lev)}
                className={`py-2 text-xs font-bold rounded transition-all ${
                  leverage === lev
                    ? 'bg-accent text-bg-primary'
                    : 'bg-bg-tertiary text-text-secondary hover:bg-bg-hover'
                }`}
              >
                {lev}x
              </button>
            ))}
          </div>
        </div>

        {/* Size Input */}
        <div>
          <div className="flex justify-between items-center mb-1.5">
            <label className="text-xs text-text-tertiary uppercase tracking-wider">Margin</label>
            <span className="text-xs text-text-tertiary">
              Avail: <span className="font-mono text-text-secondary">${availableBalance.toFixed(0)}</span>
            </span>
          </div>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary">$</span>
            <input
              type="number"
              value={margin}
              onChange={(e) => setMargin(e.target.value)}
              placeholder="0.00"
              className="w-full py-2.5 pl-7 pr-3 rounded bg-bg-tertiary border border-border-primary focus:border-accent focus:outline-none font-mono text-right"
            />
          </div>
          {/* Quick size buttons */}
          <div className="grid grid-cols-4 gap-1 mt-2">
            {[25, 50, 75, 100].map((percent) => (
              <button
                key={percent}
                onClick={() => handleQuickSize(percent)}
                className="py-1.5 text-xs font-medium rounded bg-bg-tertiary text-text-tertiary hover:bg-bg-hover hover:text-text-secondary transition-all"
              >
                {percent === 100 ? 'MAX' : `${percent}%`}
              </button>
            ))}
          </div>
        </div>

        {/* Position Size Display */}
        <div className="p-3 rounded bg-bg-tertiary">
          <div className="flex justify-between items-center text-sm">
            <span className="text-text-tertiary">Position Size</span>
            <span className="font-mono font-bold">${positionSize.toFixed(0)}</span>
          </div>
        </div>

        {/* Warning if has existing position */}
        {hasExistingPosition && (
          <div className="p-3 rounded bg-warning/10 border border-warning/30">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-warning flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span className="text-warning text-xs">Already have {selectedAsset} position</span>
            </div>
          </div>
        )}
      </div>

      {/* Submit Button */}
      <div className="p-4 border-t border-border-primary">
        <button
          onClick={handleSubmit}
          disabled={!isValid}
          className={`w-full py-3.5 rounded font-bold text-sm uppercase tracking-wide transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
            side === 'long'
              ? 'bg-success hover:bg-success/90 text-white'
              : 'bg-danger hover:bg-danger/90 text-white'
          }`}
        >
          {side === 'long' ? 'Long' : 'Short'} {selectedAsset}
        </button>
      </div>
    </div>
  );
}
