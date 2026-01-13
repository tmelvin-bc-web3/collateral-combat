'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { getSocket } from '@/lib/socket';

interface RealtimeChartProps {
  symbol: string;
  height?: number | string;
  lockPrice?: number | null;
  timeRemaining?: number;
  isLocked?: boolean;
}

interface PricePoint {
  time: number;
  price: number;
  displayPrice: number;
}

export function RealtimeChart({ symbol, height = 240, lockPrice, timeRemaining, isLocked }: RealtimeChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  const priceHistoryRef = useRef<PricePoint[]>([]);
  const currentPriceRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const lockPriceRef = useRef<number | null | undefined>(lockPrice);
  const historyLoadedRef = useRef(false);
  const lastFrameTimeRef = useRef<number>(0);

  const displayMinRef = useRef<number | null>(null);
  const displayMaxRef = useRef<number | null>(null);

  const VISIBLE_DURATION = 60 * 1000;
  const SMOOTHING_FACTOR = 0.2;
  const AXIS_SMOOTHING = 0.05;
  const CURVE_TENSION = 0.4;
  const TARGET_FPS = 60;
  const FRAME_DURATION = 1000 / TARGET_FPS;
  const UP_COLOR = '#22c55e';
  const DOWN_COLOR = '#ef4444';
  const BG_COLOR = '#09090b';

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = container.getBoundingClientRect();
    // Get effective height - use container height if height is "100%" or similar percentage
    const effectiveHeight = typeof height === 'number' ? height : rect.height || 240;
    canvas.width = rect.width * dpr;
    canvas.height = effectiveHeight * dpr;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = typeof height === 'number' ? `${height}px` : height;
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = effectiveHeight;
    const padding = { top: 12, right: 70, bottom: 12, left: 10 };
    const chartW = w - padding.left - padding.right;
    const chartH = h - padding.top - padding.bottom;

    ctx.fillStyle = BG_COLOR;
    ctx.fillRect(0, 0, w, h);

    const now = Date.now();
    const history = priceHistoryRef.current;
    const visibleStart = now - VISIBLE_DURATION;
    const visiblePoints = history.filter(p => p.time >= visibleStart);

    if (visiblePoints.length === 0) {
      return;
    }

    const currentDisplayPrice = visiblePoints[visiblePoints.length - 1].displayPrice;

    const currentLockPrice = lockPriceRef.current;
    const isUp = currentLockPrice
      ? currentDisplayPrice >= currentLockPrice
      : true;
    const lineColor = isUp ? UP_COLOR : DOWN_COLOR;

    let targetMin = Infinity;
    let targetMax = -Infinity;

    for (const p of visiblePoints) {
      targetMin = Math.min(targetMin, p.displayPrice);
      targetMax = Math.max(targetMax, p.displayPrice);
    }

    const targetRange = targetMax - targetMin || 1;
    targetMin -= targetRange * 0.15;
    targetMax += targetRange * 0.15;

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

    const path: { x: number; y: number }[] = [];
    for (const point of visiblePoints) {
      path.push({ x: timeToX(point.time), y: priceToY(point.displayPrice) });
    }

    if (path.length > 1) {
      // Monotonic cubic spline - prevents overshooting at direction changes
      const drawSmoothLine = (points: { x: number; y: number }[]) => {
        if (points.length < 2) return;

        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);

        if (points.length === 2) {
          ctx.lineTo(points[1].x, points[1].y);
          return;
        }

        for (let i = 0; i < points.length - 1; i++) {
          const p0 = points[i];
          const p1 = points[i + 1];

          // Simple quadratic curve through midpoint - no overshooting
          const midX = (p0.x + p1.x) / 2;
          const midY = (p0.y + p1.y) / 2;

          if (i === 0) {
            ctx.quadraticCurveTo(p0.x, p0.y, midX, midY);
          } else if (i === points.length - 2) {
            ctx.quadraticCurveTo(p1.x, p1.y, p1.x, p1.y);
          } else {
            ctx.quadraticCurveTo(p0.x, p0.y, midX, midY);
          }
        }

        // Connect to final point
        const last = points[points.length - 1];
        ctx.lineTo(last.x, last.y);
      };

      ctx.save();
      ctx.shadowColor = isUp ? 'rgba(34, 197, 94, 0.5)' : 'rgba(239, 68, 68, 0.5)';
      ctx.shadowBlur = 12;
      ctx.strokeStyle = lineColor;
      ctx.lineWidth = 2;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      drawSmoothLine(path);
      ctx.stroke();
      ctx.restore();

      ctx.beginPath();
      ctx.moveTo(path[0].x, padding.top + chartH);
      drawSmoothLine(path);
      ctx.lineTo(path[path.length - 1].x, padding.top + chartH);
      ctx.closePath();

      const gradient = ctx.createLinearGradient(0, padding.top, 0, padding.top + chartH);
      if (isUp) {
        gradient.addColorStop(0, 'rgba(34, 197, 94, 0.12)');
        gradient.addColorStop(0.4, 'rgba(34, 197, 94, 0.06)');
        gradient.addColorStop(1, 'rgba(34, 197, 94, 0)');
      } else {
        gradient.addColorStop(0, 'rgba(239, 68, 68, 0.12)');
        gradient.addColorStop(0.4, 'rgba(239, 68, 68, 0.06)');
        gradient.addColorStop(1, 'rgba(239, 68, 68, 0)');
      }
      ctx.fillStyle = gradient;
      ctx.fill();

      ctx.strokeStyle = lineColor;
      ctx.lineWidth = 2.5;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      drawSmoothLine(path);
      ctx.stroke();

      const last = path[path.length - 1];

      // Simple static dot at current price
      ctx.fillStyle = lineColor;
      ctx.beginPath();
      ctx.arc(last.x, last.y, 4, 0, Math.PI * 2);
      ctx.fill();

      const tagW = 64;
      const tagH = 24;
      const tagX = w - padding.right + 6;
      const tagY = Math.max(padding.top, Math.min(padding.top + chartH - tagH, last.y - tagH / 2));

      ctx.fillStyle = lineColor;
      ctx.beginPath();
      ctx.roundRect(tagX, tagY, tagW, tagH, 6);
      ctx.fill();

      ctx.fillStyle = '#fff';
      ctx.font = '600 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`$${currentDisplayPrice.toFixed(2)}`, tagX + tagW / 2, tagY + tagH / 2 + 4);
    }

    if (currentLockPrice) {
      const lockY = priceToY(currentLockPrice);
      const clampedY = Math.max(padding.top, Math.min(padding.top + chartH, lockY));

      // Glow effect - extend all the way to the right edge
      ctx.save();
      ctx.shadowColor = 'rgba(251, 191, 36, 0.6)';
      ctx.shadowBlur = 8;
      ctx.setLineDash([12, 6]);
      ctx.strokeStyle = 'rgba(251, 191, 36, 0.8)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, clampedY);
      ctx.lineTo(w, clampedY);
      ctx.stroke();
      ctx.restore();
      ctx.setLineDash([]);

      // Lock label on left
      const labelText = 'LOCK';
      ctx.font = 'bold 9px -apple-system, BlinkMacSystemFont, sans-serif';
      const labelW = ctx.measureText(labelText).width + 8;
      const labelH = 14;
      const labelX = padding.left;
      const labelY = clampedY - labelH / 2;

      ctx.fillStyle = 'rgba(251, 191, 36, 0.9)';
      ctx.beginPath();
      ctx.roundRect(labelX, labelY, labelW, labelH, 3);
      ctx.fill();

      ctx.fillStyle = '#000';
      ctx.textAlign = 'left';
      ctx.fillText(labelText, labelX + 4, labelY + 10);

      // Price on right edge
      const priceText = `$${currentLockPrice.toFixed(2)}`;
      ctx.font = 'bold 10px -apple-system, BlinkMacSystemFont, sans-serif';
      const priceW = ctx.measureText(priceText).width + 10;
      const priceX = w - priceW - 4;

      ctx.fillStyle = 'rgba(251, 191, 36, 0.9)';
      ctx.beginPath();
      ctx.roundRect(priceX, labelY, priceW, labelH, 3);
      ctx.fill();

      ctx.fillStyle = '#000';
      ctx.textAlign = 'left';
      ctx.fillText(priceText, priceX + 5, labelY + 10);
    }
  }, [height]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    lockPriceRef.current = lockPrice;
  }, [lockPrice]);

  useEffect(() => {
    if (!mounted) return;

    const fetchHistory = async () => {
      try {
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';
        const response = await fetch(`${backendUrl}/api/prices/history/${symbol}?duration=${VISIBLE_DURATION}`);
        if (response.ok) {
          const history: { time: number; price: number }[] = await response.json();
          if (history.length > 0) {
            const oldestTime = history[0].time;
            const newestTime = history[history.length - 1].time;
            const historySpan = newestTime - oldestTime;
            const now = Date.now();

            priceHistoryRef.current = history.map((p) => {
              const relativeTime = p.time - oldestTime;
              const adjustedTime = now - historySpan + relativeTime;
              return {
                time: adjustedTime,
                price: p.price,
                displayPrice: p.price,
              };
            });
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

    const animate = (timestamp: number) => {
      const elapsed = timestamp - lastFrameTimeRef.current;

      if (elapsed >= FRAME_DURATION) {
        lastFrameTimeRef.current = timestamp - (elapsed % FRAME_DURATION);

        const history = priceHistoryRef.current;

        const smoothingStep = SMOOTHING_FACTOR * (elapsed / FRAME_DURATION);

        for (const point of history) {
          const diff = point.price - point.displayPrice;
          if (Math.abs(diff) > 0.001) {
            point.displayPrice += diff * Math.min(smoothingStep, 0.3);
          } else {
            point.displayPrice = point.price;
          }
        }

        draw();
      }

      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);

    const handlePriceUpdate = (prices: Record<string, number>) => {
      if (!prices[symbol]) return;
      if (!historyLoadedRef.current) return;

      const price = prices[symbol];
      const now = Date.now();

      currentPriceRef.current = price;

      const history = priceHistoryRef.current;
      const lastPoint = history[history.length - 1];

      if (!lastPoint || now - lastPoint.time >= 1000) {
        const startDisplayPrice = lastPoint?.displayPrice ?? price;
        history.push({
          time: now,
          price,
          displayPrice: startDisplayPrice
        });

        const visibleStart = now - VISIBLE_DURATION;
        while (history.length > 0 && history[0].time < visibleStart - 5000) {
          history.shift();
        }
      } else {
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
    return <div className="w-full bg-[#09090b] rounded-lg" style={{ height: typeof height === 'number' ? `${height}px` : height }} />;
  }

  // Format countdown display
  const formatCountdown = (seconds: number): string => {
    return `${seconds}s`;
  };

  return (
    <div
      ref={containerRef}
      className="w-full relative overflow-hidden rounded-lg"
      style={{ height: typeof height === 'number' ? `${height}px` : height, background: 'linear-gradient(180deg, #09090b 0%, #0c0c0f 100%)' }}
    >
      <canvas ref={canvasRef} className="w-full h-full" />
      {/* Countdown overlay - top-left corner, small and unobtrusive */}
      {timeRemaining !== undefined && timeRemaining > 0 && (
        <div className="absolute top-2 left-2 flex items-center gap-1.5 px-2 py-1 rounded bg-bg-primary/80 border border-border-primary/50">
          <span className={`text-xs font-medium uppercase tracking-wider ${isLocked ? 'text-accent' : 'text-text-tertiary'}`}>
            {isLocked ? 'Locked' : 'Wager'}
          </span>
          <span className={`text-sm font-mono font-bold tabular-nums ${isLocked ? 'text-accent' : 'text-warning'}`}>
            {formatCountdown(timeRemaining)}
          </span>
        </div>
      )}
    </div>
  );
}
