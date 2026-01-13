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
      <div className="flex flex-col items-center justify-center h-full py-8 text-white/40">
        <svg className="w-10 h-10 mb-2 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4M12 4v16" />
        </svg>
        <p className="text-sm font-medium">No open positions</p>
        <p className="text-xs mt-1 text-white/30">Select an asset and open a position</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto h-full">
      <table className="w-full">
        <thead className="sticky top-0 bg-black/60 backdrop-blur">
          <tr className="text-[10px] text-white/40 uppercase tracking-wider border-b border-white/10">
            <th className="text-left py-2 px-3 font-medium">Asset</th>
            <th className="text-left py-2 px-3 font-medium">Side</th>
            <th className="text-right py-2 px-3 font-medium">Size</th>
            <th className="text-right py-2 px-3 font-medium">Entry</th>
            <th className="text-right py-2 px-3 font-medium">Mark</th>
            <th className="text-right py-2 px-3 font-medium">P&L</th>
            <th className="text-right py-2 px-3 font-medium">Liq.</th>
            <th className="text-right py-2 px-3 font-medium"></th>
          </tr>
        </thead>
        <tbody>
          {positions.map((position) => {
            const isLong = position.side === 'long';
            const isProfit = position.unrealizedPnl >= 0;

            return (
              <tr
                key={position.id}
                className="border-b border-white/5 hover:bg-white/5 transition-colors"
              >
                {/* Asset */}
                <td className="py-2.5 px-3">
                  <div className="flex items-center gap-2">
                    <AssetIcon symbol={position.asset} size="sm" />
                    <span className="font-medium text-white">{position.asset}</span>
                  </div>
                </td>

                {/* Side */}
                <td className="py-2.5 px-3">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                    isLong ? 'bg-success/20 text-success' : 'bg-danger/20 text-danger'
                  }`}>
                    {position.leverage}x {position.side}
                  </span>
                </td>

                {/* Size */}
                <td className="py-2.5 px-3 text-right font-mono text-sm text-white">
                  ${position.size.toFixed(0)}
                </td>

                {/* Entry */}
                <td className="py-2.5 px-3 text-right font-mono text-sm text-white/60">
                  ${position.entryPrice.toFixed(2)}
                </td>

                {/* Mark */}
                <td className="py-2.5 px-3 text-right font-mono text-sm text-white">
                  ${position.currentPrice.toFixed(2)}
                </td>

                {/* P&L */}
                <td className="py-2.5 px-3 text-right">
                  <div className={`font-mono font-bold text-sm ${isProfit ? 'text-success' : 'text-danger'}`}>
                    {isProfit ? '+' : ''}{position.unrealizedPnlPercent.toFixed(2)}%
                  </div>
                  <div className={`text-[10px] font-mono ${isProfit ? 'text-success/70' : 'text-danger/70'}`}>
                    {isProfit ? '+' : ''}${position.unrealizedPnl.toFixed(2)}
                  </div>
                </td>

                {/* Liq. Price */}
                <td className="py-2.5 px-3 text-right font-mono text-sm text-warning">
                  ${position.liquidationPrice.toFixed(2)}
                </td>

                {/* Action */}
                <td className="py-2.5 px-3 text-right">
                  <button
                    onClick={() => onClosePosition(position.id)}
                    className="px-3 py-1 rounded-lg text-xs font-medium bg-white/10 border border-white/20 text-white/60 hover:text-white hover:bg-white/20 hover:border-white/30 transition-all"
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
