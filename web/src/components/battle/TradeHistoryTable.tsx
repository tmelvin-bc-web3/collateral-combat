'use client';

import { TradeRecord } from '@/types';
import { AssetIcon } from '../AssetIcon';

interface TradeHistoryTableProps {
  trades: TradeRecord[];
}

export function TradeHistoryTable({ trades }: TradeHistoryTableProps) {
  if (trades.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-text-tertiary">
        <svg className="w-12 h-12 mb-3 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-sm">No trades yet</p>
        <p className="text-xs mt-1">Your trade history will appear here</p>
      </div>
    );
  }

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  // Show trades in reverse order (most recent first)
  const sortedTrades = [...trades].reverse();

  return (
    <div className="overflow-x-auto max-h-[200px] overflow-y-auto">
      <table className="w-full">
        <thead className="sticky top-0 bg-bg-secondary">
          <tr className="text-xs text-text-tertiary uppercase tracking-wider border-b border-border-primary">
            <th className="text-left py-2 px-3 font-medium">Time</th>
            <th className="text-left py-2 px-3 font-medium">Asset</th>
            <th className="text-left py-2 px-3 font-medium">Type</th>
            <th className="text-left py-2 px-3 font-medium">Side</th>
            <th className="text-right py-2 px-3 font-medium">Size</th>
            <th className="text-right py-2 px-3 font-medium">Price</th>
            <th className="text-right py-2 px-3 font-medium">P&L</th>
          </tr>
        </thead>
        <tbody>
          {sortedTrades.map((trade) => {
            const isLong = trade.side === 'long';
            const isClose = trade.type === 'close';
            const hasPnl = trade.pnl !== undefined;
            const isProfit = (trade.pnl || 0) >= 0;

            return (
              <tr
                key={trade.id}
                className="border-b border-border-primary/50 hover:bg-bg-hover transition-colors text-sm"
              >
                {/* Time */}
                <td className="py-2 px-3 text-text-tertiary font-mono text-xs">
                  {formatTime(trade.timestamp)}
                </td>

                {/* Asset */}
                <td className="py-2 px-3">
                  <div className="flex items-center gap-2">
                    <AssetIcon symbol={trade.asset} size="sm" />
                    <span className="font-medium text-sm">{trade.asset}</span>
                  </div>
                </td>

                {/* Type */}
                <td className="py-2 px-3">
                  <span className={`text-xs font-medium uppercase ${
                    isClose ? 'text-text-secondary' : 'text-accent'
                  }`}>
                    {trade.type}
                  </span>
                </td>

                {/* Side */}
                <td className="py-2 px-3">
                  <span className={`text-xs font-bold uppercase ${
                    isLong ? 'text-success' : 'text-danger'
                  }`}>
                    {trade.leverage}x {trade.side}
                  </span>
                </td>

                {/* Size */}
                <td className="py-2 px-3 text-right font-mono text-sm">
                  ${trade.size.toFixed(0)}
                </td>

                {/* Price */}
                <td className="py-2 px-3 text-right font-mono text-sm text-text-secondary">
                  ${(trade.exitPrice || trade.entryPrice).toFixed(2)}
                </td>

                {/* P&L */}
                <td className="py-2 px-3 text-right">
                  {hasPnl ? (
                    <span className={`font-mono font-bold text-sm ${isProfit ? 'text-success' : 'text-danger'}`}>
                      {isProfit ? '+' : ''}${trade.pnl?.toFixed(2)}
                    </span>
                  ) : (
                    <span className="text-text-tertiary">-</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
