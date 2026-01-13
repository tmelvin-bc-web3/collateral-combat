'use client';

import { TradingViewChart } from '../TradingViewChart';

interface ChartSectionProps {
  symbol: string;
  price: number;
}

export function ChartSection({ symbol, price }: ChartSectionProps) {
  return (
    <div className="flex-1 flex flex-col bg-bg-primary min-w-0">
      {/* Chart Header */}
      <div className="flex items-center gap-4 px-4 py-2 border-b border-border-primary bg-bg-secondary">
        <div>
          <span className="text-lg font-bold">{symbol}</span>
          <span className="text-text-tertiary">/USD</span>
        </div>
        <div className="text-xl font-mono font-bold">
          ${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
      </div>

      {/* Chart with built-in controls */}
      <div className="flex-1 p-2">
        <TradingViewChart symbol={symbol} height={450} />
      </div>
    </div>
  );
}
