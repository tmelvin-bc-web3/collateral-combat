'use client';

import { BattlePlayer, PerpPosition } from '@/types';
import { LiquidationIndicator } from '@/components/battle/LiquidationIndicator';

interface FighterPositionCardProps {
  fighter: BattlePlayer;
  label: string; // "Fighter 1" or "Fighter 2"
  isLeading: boolean;
  compact?: boolean; // For mobile view
}

function formatWallet(addr: string): string {
  return `${addr.slice(0, 4)}...${addr.slice(-4)}`;
}

function PositionCard({ position, compact }: { position: PerpPosition; compact?: boolean }) {
  const pnlColor = position.unrealizedPnl >= 0 ? 'text-success' : 'text-danger';
  const pnlBgColor = position.unrealizedPnl >= 0 ? 'bg-success/5 border-success/20' : 'bg-danger/5 border-danger/20';
  const sideBgColor = position.side === 'long' ? 'bg-success/20 text-success' : 'bg-danger/20 text-danger';

  return (
    <div className={`p-3 rounded-lg border transition-all ${pnlBgColor}`}>
      {/* Header: Asset, Side, Leverage */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="font-semibold">{position.asset}</span>
          <span className={`text-xs px-2 py-0.5 rounded font-semibold ${sideBgColor}`}>
            {position.side.toUpperCase()}
          </span>
          <span className="text-xs px-1.5 py-0.5 rounded bg-white/10 text-text-secondary font-medium">
            {position.leverage}x
          </span>
        </div>
        <div className={`font-mono font-bold ${pnlColor}`}>
          {position.unrealizedPnl >= 0 ? '+' : ''}{position.unrealizedPnlPercent.toFixed(2)}%
        </div>
      </div>

      {/* Position Details */}
      {!compact && (
        <div className="flex items-center justify-between text-xs text-text-tertiary mb-2">
          <span>Entry: ${position.entryPrice.toFixed(2)}</span>
          <span>Size: ${position.size.toFixed(0)}</span>
          <span className={pnlColor}>
            {position.unrealizedPnl >= 0 ? '+' : ''}${position.unrealizedPnl.toFixed(2)}
          </span>
        </div>
      )}

      {/* Compact mode: Condensed details */}
      {compact && (
        <div className="flex items-center justify-between text-xs text-text-tertiary mb-2">
          <span>${position.entryPrice.toFixed(2)} / ${position.size.toFixed(0)}</span>
          <span className={pnlColor}>
            ${position.unrealizedPnl.toFixed(2)}
          </span>
        </div>
      )}

      {/* Liquidation Indicator */}
      <div className="mt-2">
        <LiquidationIndicator
          distance={position.liquidationDistance}
          side={position.side}
        />
      </div>
    </div>
  );
}

export function FighterPositionCard({ fighter, label, isLeading, compact }: FighterPositionCardProps) {
  // Calculate total capital = balance + positions margin + unrealized PnL
  const totalPositionValue = fighter.account.positions.reduce(
    (sum, p) => sum + p.size + p.unrealizedPnl,
    0
  );
  const totalCapital = fighter.account.balance + totalPositionValue;
  const overallPnl = fighter.account.totalPnlPercent;

  return (
    <div className={`rounded-xl overflow-hidden transition-all ${
      isLeading
        ? 'bg-success/5 border-2 border-success/30 shadow-[0_0_20px_rgba(34,197,94,0.1)]'
        : 'bg-black/40 backdrop-blur border border-white/10'
    }`}>
      {/* Header */}
      <div className={`px-4 py-3 border-b ${
        isLeading ? 'border-success/20 bg-success/10' : 'border-white/5 bg-white/5'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Leading indicator */}
            {isLeading && (
              <div className="w-6 h-6 rounded-full bg-success flex items-center justify-center">
                <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
                </svg>
              </div>
            )}
            <div>
              <div className="text-xs text-text-tertiary uppercase tracking-wider">{label}</div>
              <div className="font-mono font-semibold text-sm">
                {formatWallet(fighter.walletAddress)}
              </div>
            </div>
          </div>
          {/* Overall PnL */}
          <div className={`text-right ${overallPnl >= 0 ? 'text-success' : 'text-danger'}`}>
            <div className="text-2xl font-black tabular-nums">
              {overallPnl >= 0 ? '+' : ''}{overallPnl.toFixed(2)}%
            </div>
          </div>
        </div>
      </div>

      {/* Positions List */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs text-text-tertiary uppercase tracking-wider">Positions</span>
          <span className="text-xs px-2 py-1 rounded-full bg-white/5 text-text-secondary">
            {fighter.account.positions.length} open
          </span>
        </div>

        <div className="space-y-2 max-h-[280px] overflow-y-auto">
          {fighter.account.positions.length > 0 ? (
            fighter.account.positions.map((position) => (
              <PositionCard
                key={position.id}
                position={position}
                compact={compact}
              />
            ))
          ) : (
            <div className="text-center py-6 text-text-tertiary text-sm">
              No open positions
            </div>
          )}
        </div>

        {/* Account Summary */}
        <div className={`mt-4 pt-3 border-t ${isLeading ? 'border-success/20' : 'border-white/10'}`}>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <div className="text-xs text-text-tertiary mb-0.5">Balance</div>
              <div className="font-mono text-sm font-semibold">
                ${fighter.account.balance.toFixed(0)}
              </div>
            </div>
            <div>
              <div className="text-xs text-text-tertiary mb-0.5">In Positions</div>
              <div className="font-mono text-sm font-semibold">
                ${totalPositionValue.toFixed(0)}
              </div>
            </div>
            <div>
              <div className="text-xs text-text-tertiary mb-0.5">Total</div>
              <div className={`font-mono text-sm font-bold ${
                totalCapital >= fighter.account.startingBalance ? 'text-success' : 'text-danger'
              }`}>
                ${totalCapital.toFixed(0)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
