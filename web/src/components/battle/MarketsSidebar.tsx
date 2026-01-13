'use client';

import { AssetIcon } from '../AssetIcon';
import { ASSETS } from '@/lib/assets';

interface MarketsSidebarProps {
  selectedAsset: string;
  onSelectAsset: (asset: string) => void;
  prices: Record<string, number>;
  balance: number;
  totalPnl: number;
  availableMargin: number;
}

export function MarketsSidebar({
  selectedAsset,
  onSelectAsset,
  prices,
  balance,
  totalPnl,
  availableMargin,
}: MarketsSidebarProps) {
  return (
    <div className="w-[180px] flex-shrink-0 bg-bg-secondary border-r border-border-primary flex flex-col h-full">
      {/* Markets Header */}
      <div className="px-3 py-2 border-b border-border-primary">
        <span className="text-xs font-medium text-text-tertiary uppercase tracking-wider">Markets</span>
      </div>

      {/* Asset List */}
      <div className="flex-1 overflow-y-auto">
        {ASSETS.map((asset) => {
          const price = prices[asset.symbol] || 0;
          const isSelected = selectedAsset === asset.symbol;
          // Mock 24h change - in production this would come from price data
          const change24h = ((Math.sin(asset.symbol.charCodeAt(0)) * 5) + 1).toFixed(2);
          const isPositive = parseFloat(change24h) >= 0;

          return (
            <button
              key={asset.symbol}
              onClick={() => onSelectAsset(asset.symbol)}
              className={`w-full px-3 py-2.5 flex items-center gap-2 transition-all border-l-2 ${
                isSelected
                  ? 'bg-bg-tertiary border-accent'
                  : 'border-transparent hover:bg-bg-hover'
              }`}
            >
              <AssetIcon symbol={asset.symbol} size="sm" />
              <div className="flex-1 text-left">
                <div className={`text-sm font-medium ${isSelected ? 'text-text-primary' : 'text-text-secondary'}`}>
                  {asset.symbol}
                </div>
                <div className="text-xs text-text-tertiary font-mono">
                  ${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
              <div className={`text-xs font-mono ${isPositive ? 'text-success' : 'text-danger'}`}>
                {isPositive ? '+' : ''}{change24h}%
              </div>
            </button>
          );
        })}
      </div>

      {/* Account Summary */}
      <div className="border-t border-border-primary p-3 space-y-2">
        <div className="text-xs font-medium text-text-tertiary uppercase tracking-wider mb-2">Account</div>

        <div className="flex justify-between items-center">
          <span className="text-xs text-text-tertiary">Balance</span>
          <span className="text-sm font-mono font-medium">${balance.toFixed(0)}</span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-xs text-text-tertiary">Total P&L</span>
          <span className={`text-sm font-mono font-bold ${totalPnl >= 0 ? 'text-success' : 'text-danger'}`}>
            {totalPnl >= 0 ? '+' : ''}{totalPnl.toFixed(2)}%
          </span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-xs text-text-tertiary">Available</span>
          <span className="text-sm font-mono text-text-secondary">${availableMargin.toFixed(0)}</span>
        </div>
      </div>
    </div>
  );
}
