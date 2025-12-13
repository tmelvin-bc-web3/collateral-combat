'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { getSocket } from '@/lib/socket';

interface RealtimeChartProps {
  symbol: string;
  height?: number;
  lockPrice?: number | null;
}

interface PricePoint {
  time: number;
  price: number;
  displayPrice: number; // Smoothed price for display
}

export function RealtimeChart({ symbol, height = 280, lockPrice }: RealtimeChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  const priceHistoryRef = useRef<PricePoint[]>([]);
  const currentPriceRef = useRef<number | null>(null);
  const startPriceRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const frameRef = useRef(0);
  const lockPriceRef = useRef<number | null | undefined>(lockPrice);
  const historyLoadedRef = useRef(false);

  // Smoothed Y-axis bounds to prevent jumpy rescaling
  const displayMinRef = useRef<number | null>(null);
  const displayMaxRef = useRef<number | null>(null);

  const VISIBLE_DURATION = 60 * 1000;
  const SMOOTHING_FACTOR = 0.12; // How fast points animate to target
  const AXIS_SMOOTHING = 0.03; // How fast Y-axis adjusts (slower = more stable)
  const UP_COLOR = '#22c55e';
  const DOWN_COLOR = '#ef4444';
  const GRID_COLOR = '#1a1a1a';
  const BG_COLOR = '#0d0d0d';
  const TEXT_COLOR = '#444';

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    frameRef.current++;

    const dpr = window.devicePixelRatio || 1;
    const rect = container.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = height;
    const padding = { top: 20, right: 70, bottom: 25, left: 10 };
    const chartW = w - padding.left - padding.right;
    const chartH = h - padding.top - padding.bottom;

    ctx.fillStyle = BG_COLOR;
    ctx.fillRect(0, 0, w, h);

    const now = Date.now();
    const history = priceHistoryRef.current;
    const visibleStart = now - VISIBLE_DURATION;
    const visiblePoints = history.filter(p => p.time >= visibleStart);

    if (visiblePoints.length === 0) {
      ctx.fillStyle = TEXT_COLOR;
      ctx.font = '13px -apple-system, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Waiting for data...', w / 2, h / 2);
      return;
    }

    // Update start price reference
    if (visiblePoints.length > 0) {
      startPriceRef.current = visiblePoints[0].displayPrice;
    }

    // Get current displayed price (last point's display price)
    const currentDisplayPrice = visiblePoints[visiblePoints.length - 1].displayPrice;
    const startPrice = startPriceRef.current ?? currentDisplayPrice;
    const priceChange = startPrice > 0 ? ((currentDisplayPrice - startPrice) / startPrice) * 100 : 0;
    const isUp = priceChange >= 0;
    const lineColor = isUp ? UP_COLOR : DOWN_COLOR;

    // Calculate target price range from displayed prices
    let targetMin = Infinity;
    let targetMax = -Infinity;

    for (const p of visiblePoints) {
      targetMin = Math.min(targetMin, p.displayPrice);
      targetMax = Math.max(targetMax, p.displayPrice);
    }

    // Add padding to target range
    const targetRange = targetMax - targetMin || 1;
    targetMin -= targetRange * 0.15;
    targetMax += targetRange * 0.15;

    // Smoothly animate the Y-axis bounds
    if (displayMinRef.current === null || displayMaxRef.current === null) {
      displayMinRef.current = targetMin;
      displayMaxRef.current = targetMax;
    } else {
      displayMinRef.current += (targetMin - displayMinRef.current) * AXIS_SMOOTHING;
      displayMaxRef.current += (targetMax - displayMaxRef.current) * AXIS_SMOOTHING;
    }

    const minPrice = displayMinRef.current;
    const maxPrice = displayMaxRef.current;

    const timeToX = (time: number) => {
      const progress = (time - visibleStart) / VISIBLE_DURATION;
      return padding.left + progress * chartW;
    };

    const priceToY = (price: number) => {
      const progress = (price - minPrice) / (maxPrice - minPrice);
      return padding.top + chartH - progress * chartH;
    };

    // Grid lines
    ctx.strokeStyle = GRID_COLOR;
    ctx.lineWidth = 1;

    for (let i = 0; i <= 4; i++) {
      const y = Math.round(padding.top + (chartH * i) / 4) + 0.5;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(w - padding.right, y);
      ctx.stroke();
    }

    // Price labels
    ctx.fillStyle = TEXT_COLOR;
    ctx.font = '10px -apple-system, system-ui, sans-serif';
    ctx.textAlign = 'left';

    for (let i = 0; i <= 4; i++) {
      const price = maxPrice - ((maxPrice - minPrice) * i) / 4;
      const y = padding.top + (chartH * i) / 4;
      ctx.fillText(`$${price.toFixed(2)}`, w - padding.right + 8, y + 3);
    }

    // Build path from smoothed display prices
    const path: { x: number; y: number }[] = [];
    for (const point of visiblePoints) {
      path.push({ x: timeToX(point.time), y: priceToY(point.displayPrice) });
    }

    if (path.length > 1) {
      // Subtle glow behind line
      ctx.strokeStyle = isUp ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)';
      ctx.lineWidth = 6;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(path[0].x, path[0].y);
      for (let i = 1; i < path.length; i++) {
        ctx.lineTo(path[i].x, path[i].y);
      }
      ctx.stroke();

      // Area fill
      ctx.beginPath();
      ctx.moveTo(path[0].x, padding.top + chartH);
      for (const p of path) {
        ctx.lineTo(p.x, p.y);
      }
      ctx.lineTo(path[path.length - 1].x, padding.top + chartH);
      ctx.closePath();

      const gradient = ctx.createLinearGradient(0, padding.top, 0, padding.top + chartH);
      if (isUp) {
        gradient.addColorStop(0, 'rgba(34, 197, 94, 0.2)');
        gradient.addColorStop(1, 'rgba(34, 197, 94, 0)');
      } else {
        gradient.addColorStop(0, 'rgba(239, 68, 68, 0.2)');
        gradient.addColorStop(1, 'rgba(239, 68, 68, 0)');
      }
      ctx.fillStyle = gradient;
      ctx.fill();

      // Main line
      ctx.strokeStyle = lineColor;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(path[0].x, path[0].y);
      for (let i = 1; i < path.length; i++) {
        ctx.lineTo(path[i].x, path[i].y);
      }
      ctx.stroke();

      // Current price dot with pulse
      const last = path[path.length - 1];
      const pulse = Math.sin(frameRef.current * 0.05) * 0.3 + 0.7;

      // Pulse ring
      ctx.strokeStyle = isUp ? `rgba(34, 197, 94, ${0.4 * pulse})` : `rgba(239, 68, 68, ${0.4 * pulse})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(last.x, last.y, 6 + pulse * 2, 0, Math.PI * 2);
      ctx.stroke();

      // Dot
      ctx.fillStyle = lineColor;
      ctx.beginPath();
      ctx.arc(last.x, last.y, 4, 0, Math.PI * 2);
      ctx.fill();

      // Price tag
      const tagW = 58;
      const tagH = 20;
      const tagX = w - padding.right + 6;
      const tagY = last.y - tagH / 2;

      ctx.fillStyle = lineColor;
      ctx.beginPath();
      ctx.roundRect(tagX, tagY, tagW, tagH, 3);
      ctx.fill();

      ctx.fillStyle = '#000';
      ctx.font = 'bold 11px -apple-system, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`$${currentDisplayPrice.toFixed(2)}`, tagX + tagW / 2, last.y + 4);
    }

    // Price change badge (top right)
    if (startPriceRef.current !== null) {
      const changeText = `${isUp ? '+' : ''}${priceChange.toFixed(2)}%`;

      ctx.font = 'bold 13px -apple-system, system-ui, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillStyle = lineColor;
      ctx.fillText(changeText, w - padding.right + 60, 16);
    }

    // Lock price line (if provided)
    const currentLockPrice = lockPriceRef.current;
    if (currentLockPrice) {
      const lockY = priceToY(currentLockPrice);
      const clampedY = Math.max(padding.top, Math.min(padding.top + chartH, lockY));

      // Dashed line
      ctx.setLineDash([6, 4]);
      ctx.strokeStyle = '#888';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(padding.left, clampedY);
      ctx.lineTo(w - padding.right, clampedY);
      ctx.stroke();
      ctx.setLineDash([]);

      // Label badge on left
      const labelText = `LOCK $${currentLockPrice.toFixed(2)}`;
      ctx.font = 'bold 9px -apple-system, system-ui, sans-serif';
      const labelWidth = ctx.measureText(labelText).width + 8;

      ctx.fillStyle = '#333';
      ctx.beginPath();
      ctx.roundRect(padding.left, clampedY - 10, labelWidth, 14, 3);
      ctx.fill();

      ctx.fillStyle = '#aaa';
      ctx.textAlign = 'left';
      ctx.fillText(labelText, padding.left + 4, clampedY + 1);
    }

    // Time labels
    ctx.fillStyle = TEXT_COLOR;
    ctx.font = '9px -apple-system, system-ui, sans-serif';
    ctx.textAlign = 'center';

    for (const sec of [0, 30, 60]) {
      const time = now - (60 - sec) * 1000;
      const x = timeToX(time);
      ctx.fillText(`${sec}s`, x, h - 8);
    }
  }, [height]);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Keep lockPrice ref in sync
  useEffect(() => {
    lockPriceRef.current = lockPrice;
  }, [lockPrice]);

  // Fetch prior price history on mount
  useEffect(() => {
    if (!mounted) return;

    const fetchHistory = async () => {
      try {
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';
        const response = await fetch(`${backendUrl}/api/prices/history/${symbol}?duration=${VISIBLE_DURATION}`);
        if (response.ok) {
          const history: { time: number; price: number }[] = await response.json();
          if (history.length > 0) {
            // Adjust timestamps to be relative to now
            // This ensures historical data appears correctly on the timeline
            const oldestTime = history[0].time;
            const newestTime = history[history.length - 1].time;
            const historySpan = newestTime - oldestTime;
            const now = Date.now();

            priceHistoryRef.current = history.map((p, i) => {
              // Map old timestamps to recent timeline
              const relativeTime = p.time - oldestTime;
              const adjustedTime = now - historySpan + relativeTime;
              return {
                time: adjustedTime,
                price: p.price,
                displayPrice: p.price,
              };
            });
            startPriceRef.current = history[0].price;
            currentPriceRef.current = history[history.length - 1].price;
          }
        }
        historyLoadedRef.current = true;
      } catch {
        historyLoadedRef.current = true;
      }
    };

    fetchHistory();
  }, [symbol, mounted]);

  useEffect(() => {
    if (!mounted) return;

    const socket = getSocket();
    socket.emit('subscribe_prices', [symbol]);

    const animate = () => {
      const history = priceHistoryRef.current;

      // Smoothly animate ALL points toward their target prices
      for (const point of history) {
        const diff = point.price - point.displayPrice;
        if (Math.abs(diff) > 0.0001) {
          point.displayPrice += diff * SMOOTHING_FACTOR;
        }
      }

      draw();
      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);

    const handlePriceUpdate = (prices: Record<string, number>) => {
      if (!prices[symbol]) return;
      if (!historyLoadedRef.current) return; // Wait for history to load first

      const price = prices[symbol];
      const now = Date.now();
      currentPriceRef.current = price;

      const history = priceHistoryRef.current;
      const lastPoint = history[history.length - 1];

      // Add new point every 1 second
      if (!lastPoint || now - lastPoint.time >= 1000) {
        // New point starts at current display position for smooth transition
        const startDisplayPrice = lastPoint?.displayPrice ?? price;
        history.push({
          time: now,
          price,
          displayPrice: startDisplayPrice // Will animate toward 'price'
        });

        // Clean up old points
        const visibleStart = now - VISIBLE_DURATION;
        while (history.length > 0 && history[0].time < visibleStart - 5000) {
          history.shift();
        }
      } else {
        // Update the last point's target price
        lastPoint.price = price;
      }
    };

    socket.on('price_update', handlePriceUpdate);
    window.addEventListener('resize', draw);

    return () => {
      socket.off('price_update', handlePriceUpdate);
      window.removeEventListener('resize', draw);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [symbol, mounted, draw]);

  if (!mounted) {
    return <div className="w-full bg-[#0d0d0d]" style={{ height: `${height}px` }} />;
  }

  return (
    <div ref={containerRef} className="w-full" style={{ height: `${height}px` }}>
      <canvas ref={canvasRef} className="w-full h-full" />
    </div>
  );
}
