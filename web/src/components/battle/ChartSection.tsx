'use client';

import { TradingViewChart } from '../TradingViewChart';

interface ChartSectionProps {
  symbol: string;
  height?: number | string;
}

export function ChartSection({ symbol, height = 450 }: ChartSectionProps) {
  return (
    <div className="w-full h-full rounded-xl bg-black/40 backdrop-blur border border-white/10 overflow-hidden p-1">
      <div className="w-full h-full rounded-lg overflow-hidden">
        <TradingViewChart symbol={symbol} height={height} />
      </div>
    </div>
  );
}
