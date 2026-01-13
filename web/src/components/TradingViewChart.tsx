'use client';

import { useState } from 'react';

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
  height?: number | string;
  minimal?: boolean;
}

export function TradingViewChart({ symbol, height = 400, minimal = false }: TradingViewChartProps) {
  const [selectedIndicators, setSelectedIndicators] = useState<Indicator[]>(['VOLUME']);
  const [interval, setInterval] = useState('1');

  const tvSymbol = SYMBOL_MAP[symbol] || 'BINANCE:SOLUSDT';
  const isFullHeight = height === '100%';

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

  // Build studies string for URL
  const studiesParam = (() => {
    const studies: string[] = [];
    if (!minimal) {
      if (selectedIndicators.includes('MA')) studies.push('MASimple@tv-basicstudies');
      if (selectedIndicators.includes('EMA')) studies.push('MAExp@tv-basicstudies');
      if (selectedIndicators.includes('RSI')) studies.push('RSI@tv-basicstudies');
      if (selectedIndicators.includes('MACD')) studies.push('MACD@tv-basicstudies');
      if (selectedIndicators.includes('BB')) studies.push('BollingerBands@tv-basicstudies');
      if (selectedIndicators.includes('VOLUME')) studies.push('Volume@tv-basicstudies');
    }
    return studies.join('%1F');
  })();

  // Use TradingView's embed iframe URL
  const embedUrl = `https://s.tradingview.com/widgetembed/?frameElementId=tradingview_embed&symbol=${encodeURIComponent(tvSymbol)}&interval=${minimal ? '1' : interval}&hidesidetoolbar=${minimal ? '1' : '0'}&symboledit=${minimal ? '0' : '1'}&saveimage=0&toolbarbg=0d0d0d&studies=${studiesParam}&theme=dark&style=${minimal ? '3' : '1'}&timezone=Etc%2FUTC&withdateranges=${minimal ? '0' : '1'}&showpopupbutton=0&studies_overrides=%7B%7D&overrides=%7B%7D&enabled_features=%5B%5D&disabled_features=%5B%5D&locale=en&utm_source=localhost&utm_medium=widget_new&utm_campaign=chart`;

  const heightStyle = typeof height === 'string' ? height : `${height}px`;

  // For minimal mode, just return the iframe
  if (minimal) {
    return (
      <div style={{ height: heightStyle }} className="w-full">
        <iframe
          src={embedUrl}
          style={{ width: '100%', height: '100%', border: 'none' }}
          allowFullScreen
        />
      </div>
    );
  }

  // Full height mode
  if (isFullHeight) {
    return (
      <div className="flex flex-col h-full">
        {/* Controls */}
        <div className="flex flex-wrap items-center gap-2 px-2 py-2 bg-black/60 border-b border-white/10 flex-shrink-0">
          {/* Timeframe */}
          <div className="flex items-center gap-1 bg-white/5 rounded-lg p-1">
            {intervals.map((int) => (
              <button
                key={int.value}
                onClick={() => setInterval(int.value)}
                className={`px-2 py-1 text-xs rounded transition-all ${
                  interval === int.value
                    ? 'bg-warning text-black font-bold'
                    : 'text-white/50 hover:text-white'
                }`}
              >
                {int.label}
              </button>
            ))}
          </div>

          <div className="h-4 w-px bg-white/20" />

          {/* Indicators */}
          <div className="flex items-center gap-1">
            <span className="text-xs text-white/40 mr-1">Indicators:</span>
            {indicators.map((ind) => (
              <button
                key={ind.id}
                onClick={() => toggleIndicator(ind.id)}
                className={`px-2 py-1 text-xs rounded transition-all ${
                  selectedIndicators.includes(ind.id)
                    ? 'bg-warning/20 text-warning border border-warning/30'
                    : 'bg-white/5 text-white/50 hover:text-white'
                }`}
              >
                {ind.label}
              </button>
            ))}
          </div>
        </div>

        {/* Chart iframe - fills remaining space */}
        <div className="flex-1 min-h-0">
          <iframe
            key={`${tvSymbol}-${interval}-${studiesParam}`}
            src={embedUrl}
            style={{ width: '100%', height: '100%', border: 'none' }}
            allowFullScreen
          />
        </div>
      </div>
    );
  }

  // Fixed height mode
  return (
    <div className="space-y-3">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-2 px-2 py-2 bg-black/60 border-b border-white/10">
        {/* Timeframe */}
        <div className="flex items-center gap-1 bg-white/5 rounded-lg p-1">
          {intervals.map((int) => (
            <button
              key={int.value}
              onClick={() => setInterval(int.value)}
              className={`px-2 py-1 text-xs rounded transition-all ${
                interval === int.value
                  ? 'bg-warning text-black font-bold'
                  : 'text-white/50 hover:text-white'
              }`}
            >
              {int.label}
            </button>
          ))}
        </div>

        <div className="h-4 w-px bg-white/20" />

        {/* Indicators */}
        <div className="flex items-center gap-1">
          <span className="text-xs text-white/40 mr-1">Indicators:</span>
          {indicators.map((ind) => (
            <button
              key={ind.id}
              onClick={() => toggleIndicator(ind.id)}
              className={`px-2 py-1 text-xs rounded transition-all ${
                selectedIndicators.includes(ind.id)
                  ? 'bg-warning/20 text-warning border border-warning/30'
                  : 'bg-white/5 text-white/50 hover:text-white'
              }`}
            >
              {ind.label}
            </button>
          ))}
        </div>
      </div>

      {/* Chart iframe */}
      <div style={{ height: heightStyle }} className="rounded-lg overflow-hidden border border-white/5">
        <iframe
          key={`${tvSymbol}-${interval}-${studiesParam}`}
          src={embedUrl}
          style={{ width: '100%', height: '100%', border: 'none' }}
          allowFullScreen
        />
      </div>
    </div>
  );
}
