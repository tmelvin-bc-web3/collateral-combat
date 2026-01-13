'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

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
  minimal?: boolean; // Simple line chart with no controls
}

export function TradingViewChart({ symbol, height = 400, minimal = false }: TradingViewChartProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetRef = useRef<any>(null);
  const [selectedIndicators, setSelectedIndicators] = useState<Indicator[]>(['VOLUME']);
  const [containerSize, setContainerSize] = useState<{ width: number; height: number } | null>(null);
  // Note: TradingView free widget minimum is 1 minute ('1').
  // For sub-minute, would need TradingView Pro or custom charting library.
  const [interval, setInterval] = useState('1');

  const tvSymbol = SYMBOL_MAP[symbol] || 'BINANCE:SOLUSDT';
  const isFullHeight = height === '100%';

  // Measure container size
  useEffect(() => {
    if (!isFullHeight || !wrapperRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          setContainerSize({ width: Math.floor(width), height: Math.floor(height) });
        }
      }
    });

    resizeObserver.observe(wrapperRef.current);
    return () => resizeObserver.disconnect();
  }, [isFullHeight]);

  // Create TradingView widget
  const createWidget = useCallback(() => {
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

    // Determine dimensions
    let widgetWidth: number | undefined;
    let widgetHeight: number | undefined;
    let useAutosize = true;

    if (isFullHeight && containerSize) {
      widgetWidth = containerSize.width;
      widgetHeight = containerSize.height;
      useAutosize = false;
    } else if (typeof height === 'number') {
      widgetHeight = height;
    }

    // Create TradingView widget
    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/tv.js';
    script.async = true;
    script.onload = () => {
      if (typeof (window as any).TradingView !== 'undefined' && containerRef.current) {
        widgetRef.current = new (window as any).TradingView.widget({
          autosize: useAutosize,
          width: widgetWidth,
          height: widgetHeight,
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
  }, [tvSymbol, interval, selectedIndicators, minimal, isFullHeight, containerSize, height]);

  // Initialize widget when ready
  useEffect(() => {
    // For full height mode, wait until we have container dimensions
    if (isFullHeight && !containerSize) return;

    return createWidget();
  }, [createWidget, isFullHeight, containerSize]);

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

  const heightStyle = typeof height === 'string' ? height : `${height}px`;

  // For minimal mode, just return the chart
  if (minimal) {
    return (
      <div
        id={`tradingview_${symbol}_minimal`}
        ref={containerRef}
        style={{ height: heightStyle }}
        className="w-full h-full"
      />
    );
  }

  // Full height mode: use flex layout with measured dimensions
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

        {/* Chart Wrapper - measures available space */}
        <div ref={wrapperRef} className="flex-1 min-h-0 relative">
          {/* Chart Container - gets explicit dimensions */}
          <div
            id={`tradingview_${symbol}`}
            ref={containerRef}
            className="absolute inset-0"
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

      {/* Chart Container */}
      <div
        id={`tradingview_${symbol}`}
        ref={containerRef}
        style={{ height: heightStyle }}
        className="rounded-lg overflow-hidden border border-white/5"
      />
    </div>
  );
}
