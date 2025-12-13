'use client';

import { useEffect, useRef, useState } from 'react';

// TradingView symbol mapping
const SYMBOL_MAP: Record<string, string> = {
  'SOL': 'BINANCE:SOLUSDT',
  'BTC': 'BINANCE:BTCUSDT',
  'ETH': 'BINANCE:ETHUSDT',
  'WIF': 'BYBIT:WIFUSDT',
  'BONK': 'BYBIT:BONKUSDT',
  'JUP': 'BYBIT:JUPUSDT',
  'RAY': 'BYBIT:RAYUSDT',
  'JTO': 'BYBIT:JTOUSDT',
};

type Indicator = 'MA' | 'EMA' | 'RSI' | 'MACD' | 'BB' | 'VOLUME';

interface TradingViewChartProps {
  symbol: string;
  height?: number;
  minimal?: boolean; // Simple line chart with no controls
}

export function TradingViewChart({ symbol, height = 400, minimal = false }: TradingViewChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedIndicators, setSelectedIndicators] = useState<Indicator[]>(['VOLUME']);
  // Note: TradingView free widget minimum is 1 minute ('1').
  // For sub-minute, would need TradingView Pro or custom charting library.
  const [interval, setInterval] = useState('1');

  const tvSymbol = SYMBOL_MAP[symbol] || 'BINANCE:SOLUSDT';

  useEffect(() => {
    if (!containerRef.current) return;

    // Clear previous widget
    containerRef.current.innerHTML = '';

    // Build studies array based on selected indicators (none for minimal)
    const studies: string[] = [];
    if (!minimal) {
      if (selectedIndicators.includes('MA')) studies.push('MASimple@tv-basicstudies');
      if (selectedIndicators.includes('EMA')) studies.push('MAExp@tv-basicstudies');
      if (selectedIndicators.includes('RSI')) studies.push('RSI@tv-basicstudies');
      if (selectedIndicators.includes('MACD')) studies.push('MACD@tv-basicstudies');
      if (selectedIndicators.includes('BB')) studies.push('BollingerBands@tv-basicstudies');
      if (selectedIndicators.includes('VOLUME')) studies.push('Volume@tv-basicstudies');
    }

    // Create TradingView widget
    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/tv.js';
    script.async = true;
    script.onload = () => {
      if (typeof (window as any).TradingView !== 'undefined' && containerRef.current) {
        new (window as any).TradingView.widget({
          autosize: true,
          symbol: tvSymbol,
          interval: minimal ? '1' : interval,
          timezone: 'Etc/UTC',
          theme: 'dark',
          style: minimal ? '3' : '1', // 3 = line chart, 1 = candles
          locale: 'en',
          toolbar_bg: '#0d0d0d',
          enable_publishing: false,
          hide_top_toolbar: minimal,
          hide_legend: minimal,
          hide_side_toolbar: minimal,
          save_image: false,
          container_id: containerRef.current.id,
          studies: studies,
          backgroundColor: '#0d0d0d',
          gridColor: '#1a1a1a',
          withdateranges: !minimal,
          allow_symbol_change: !minimal,
        });
      }
    };
    document.head.appendChild(script);

    return () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, [tvSymbol, interval, selectedIndicators, minimal]);

  const toggleIndicator = (indicator: Indicator) => {
    setSelectedIndicators(prev =>
      prev.includes(indicator)
        ? prev.filter(i => i !== indicator)
        : [...prev, indicator]
    );
  };

  const indicators: { id: Indicator; label: string }[] = [
    { id: 'MA', label: 'MA' },
    { id: 'EMA', label: 'EMA' },
    { id: 'RSI', label: 'RSI' },
    { id: 'MACD', label: 'MACD' },
    { id: 'BB', label: 'Bollinger' },
    { id: 'VOLUME', label: 'Volume' },
  ];

  const intervals = [
    { value: '1', label: '1m' },
    { value: '5', label: '5m' },
    { value: '15', label: '15m' },
    { value: '60', label: '1H' },
    { value: '240', label: '4H' },
    { value: 'D', label: '1D' },
  ];

  // For minimal mode, just return the chart
  if (minimal) {
    return (
      <div
        id={`tradingview_${symbol}_minimal`}
        ref={containerRef}
        style={{ height: `${height}px` }}
        className="w-full h-full"
      />
    );
  }

  return (
    <div className="space-y-3">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Timeframe */}
        <div className="flex items-center gap-1 bg-dark-200 rounded-lg p-1">
          {intervals.map((int) => (
            <button
              key={int.value}
              onClick={() => setInterval(int.value)}
              className={`px-2 py-1 text-xs rounded transition-all ${
                interval === int.value
                  ? 'bg-primary text-dark-300 font-bold'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              {int.label}
            </button>
          ))}
        </div>

        <div className="h-4 w-px bg-zinc-700" />

        {/* Indicators */}
        <div className="flex items-center gap-1">
          <span className="text-xs text-zinc-500 mr-1">Indicators:</span>
          {indicators.map((ind) => (
            <button
              key={ind.id}
              onClick={() => toggleIndicator(ind.id)}
              className={`px-2 py-1 text-xs rounded transition-all ${
                selectedIndicators.includes(ind.id)
                  ? 'bg-secondary/20 text-secondary border border-secondary/30'
                  : 'bg-dark-200 text-zinc-400 hover:text-white'
              }`}
            >
              {ind.label}
            </button>
          ))}
        </div>
      </div>

      {/* Chart Container */}
      <div
        id={`tradingview_${symbol}`}
        ref={containerRef}
        style={{ height: `${height}px` }}
        className="rounded-lg overflow-hidden border border-white/5"
      />
    </div>
  );
}
