'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { getSocket } from '@/lib/socket';

interface RealtimeChartProps {
  symbol: string;
  height?: number;
  lockPrice?: number | null;
  timeRemaining?: number;
  isLocked?: boolean;
}

interface PricePoint {
  time: number;
  price: number;
  displayPrice: number;
}

export function RealtimeChart({ symbol, height = 240, lockPrice }: RealtimeChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  const priceHistoryRef = useRef<PricePoint[]>([]);
  const currentPriceRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const frameRef = useRef(0);
  const lockPriceRef = useRef<number | null | undefined>(lockPrice);
  const historyLoadedRef = useRef(false);
  const lastFrameTimeRef = useRef<number>(0);

  const displayMinRef = useRef<number | null>(null);
  const displayMaxRef = useRef<number | null>(null);

  const VISIBLE_DURATION = 60 * 1000;
  const SMOOTHING_FACTOR = 0.12;
  const AXIS_SMOOTHING = 0.04;
  const CURVE_TENSION = 0.25;
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
      const drawSmoothLine = (points: { x: number; y: number }[], tension = CURVE_TENSION) => {
        if (points.length < 2) return;

        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);

        if (points.length === 2) {
          ctx.lineTo(points[1].x, points[1].y);
          return;
        }

        for (let i = 0; i < points.length - 1; i++) {
          const p0 = points[Math.max(0, i - 1)];
          const p1 = points[i];
          const p2 = points[i + 1];
          const p3 = points[Math.min(points.length - 1, i + 2)];

          const cp1x = p1.x + (p2.x - p0.x) * tension;
          const cp1y = p1.y + (p2.y - p0.y) * tension;
          const cp2x = p2.x - (p3.x - p1.x) * tension;
          const cp2y = p2.y - (p3.y - p1.y) * tension;

          ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y);
        }
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
      const time = frameRef.current * 0.05;
      const pulse = (Math.sin(time) + 1) * 0.5;

      const outerOpacity = 0.15 + 0.15 * pulse;
      const outerRadius = 10 + pulse * 4;
      ctx.strokeStyle = isUp ? `rgba(34, 197, 94, ${outerOpacity})` : `rgba(239, 68, 68, ${outerOpacity})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(last.x, last.y, outerRadius, 0, Math.PI * 2);
      ctx.stroke();

      const innerOpacity = 0.3 + 0.2 * pulse;
      ctx.strokeStyle = isUp ? `rgba(34, 197, 94, ${innerOpacity})` : `rgba(239, 68, 68, ${innerOpacity})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(last.x, last.y, 5, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = lineColor;
      ctx.beginPath();
      ctx.arc(last.x, last.y, 3, 0, Math.PI * 2);
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

      ctx.setLineDash([8, 6]);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(padding.left, clampedY);
      ctx.lineTo(w - padding.right, clampedY);
      ctx.stroke();
      ctx.setLineDash([]);

      const labelText = `LOCK $${currentLockPrice.toFixed(2)}`;
      ctx.font = '500 9px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      const labelWidth = ctx.measureText(labelText).width + 14;

      ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.beginPath();
      ctx.roundRect(padding.left, clampedY - 10, labelWidth, 20, 4);
      ctx.fill();

      ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.textAlign = 'left';
      ctx.fillText(labelText, padding.left + 7, clampedY + 4);
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
    return <div className="w-full bg-[#09090b] rounded-lg" style={{ height: `${height}px` }} />;
  }

  return (
    <div
      ref={containerRef}
      className="w-full relative overflow-hidden rounded-lg"
      style={{ height: `${height}px`, background: 'linear-gradient(180deg, #09090b 0%, #0c0c0f 100%)' }}
    >
      <canvas ref={canvasRef} className="w-full h-full" />
    </div>
  );
}
