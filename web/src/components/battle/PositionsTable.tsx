'use client';

import { PerpPosition } from '@/types';
import { AssetIcon } from '../AssetIcon';

interface PositionsTableProps {
  positions: PerpPosition[];
  onClosePosition: (positionId: string) => void;
}

export function PositionsTable({ positions, onClosePosition }: PositionsTableProps) {
  if (positions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-text-tertiary">
        <svg className="w-12 h-12 mb-3 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4M12 4v16" />
        </svg>
        <p className="text-sm">No open positions</p>
        <p className="text-xs mt-1">Open a position to start trading</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="text-xs text-text-tertiary uppercase tracking-wider border-b border-border-primary">
            <th className="text-left py-2 px-3 font-medium">Asset</th>
            <th className="text-left py-2 px-3 font-medium">Side</th>
            <th className="text-right py-2 px-3 font-medium">Size</th>
            <th className="text-right py-2 px-3 font-medium">Entry</th>
            <th className="text-right py-2 px-3 font-medium">Mark</th>
            <th className="text-right py-2 px-3 font-medium">P&L</th>
            <th className="text-right py-2 px-3 font-medium">Liq. Price</th>
            <th className="text-right py-2 px-3 font-medium">Action</th>
          </tr>
        </thead>
        <tbody>
          {positions.map((position) => {
            const isLong = position.side === 'long';
            const isProfit = position.unrealizedPnl >= 0;

            return (
              <tr
                key={position.id}
                className="border-b border-border-primary hover:bg-bg-hover transition-colors"
              >
                {/* Asset */}
                <td className="py-3 px-3">
                  <div className="flex items-center gap-2">
                    <AssetIcon symbol={position.asset} size="sm" />
                    <span className="font-medium">{position.asset}</span>
                  </div>
                </td>

                {/* Side */}
                <td className="py-3 px-3">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold uppercase ${
                    isLong ? 'bg-success/20 text-success' : 'bg-danger/20 text-danger'
                  }`}>
                    {position.leverage}x {position.side}
                  </span>
                </td>

                {/* Size */}
                <td className="py-3 px-3 text-right font-mono">
                  ${position.size.toFixed(0)}
                </td>

                {/* Entry */}
                <td className="py-3 px-3 text-right font-mono text-text-secondary">
                  ${position.entryPrice.toFixed(2)}
                </td>

                {/* Mark */}
                <td className="py-3 px-3 text-right font-mono">
                  ${position.currentPrice.toFixed(2)}
                </td>

                {/* P&L */}
                <td className="py-3 px-3 text-right">
                  <div className={`font-mono font-bold ${isProfit ? 'text-success' : 'text-danger'}`}>
                    {isProfit ? '+' : ''}{position.unrealizedPnlPercent.toFixed(2)}%
                  </div>
                  <div className={`text-xs font-mono ${isProfit ? 'text-success' : 'text-danger'}`}>
                    {isProfit ? '+' : ''}${position.unrealizedPnl.toFixed(2)}
                  </div>
                </td>

                {/* Liq. Price */}
                <td className="py-3 px-3 text-right font-mono text-warning">
                  ${position.liquidationPrice.toFixed(2)}
                </td>

                {/* Action */}
                <td className="py-3 px-3 text-right">
                  <button
                    onClick={() => onClosePosition(position.id)}
                    className="px-3 py-1.5 rounded text-xs font-medium bg-bg-tertiary border border-border-primary text-text-secondary hover:text-text-primary hover:border-border-secondary transition-all"
                  >
                    Close
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
