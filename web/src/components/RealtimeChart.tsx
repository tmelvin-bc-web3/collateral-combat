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
  displayPrice: number; // Smoothed price for display
}

export function RealtimeChart({ symbol, height = 240, lockPrice, timeRemaining, isLocked }: RealtimeChartProps) {
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
  const lastTickDirectionRef = useRef<'up' | 'down' | null>(null);
  const previousTickPriceRef = useRef<number | null>(null);
  const lastFrameTimeRef = useRef<number>(0);

  // Smoothed Y-axis bounds to prevent jumpy rescaling
  const displayMinRef = useRef<number | null>(null);
  const displayMaxRef = useRef<number | null>(null);

  const VISIBLE_DURATION = 60 * 1000;
  const SMOOTHING_FACTOR = 0.12; // Smooth easing for fluid motion
  const AXIS_SMOOTHING = 0.04; // Gentle axis transitions
  const CURVE_TENSION = 0.25; // Bezier curve tension for smooth lines
  const TARGET_FPS = 60;
  const FRAME_DURATION = 1000 / TARGET_FPS;
  const UP_COLOR = '#22c55e'; // Green-500 - vibrant but clean
  const DOWN_COLOR = '#ef4444'; // Red-500 - clear contrast
  const GRID_COLOR = 'rgba(255, 255, 255, 0.03)'; // Very subtle grid
  const BG_COLOR = '#09090b'; // Zinc-950 - deep dark
  const TEXT_COLOR = 'rgba(255, 255, 255, 0.4)'; // Readable labels

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
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.font = '500 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Connecting to price feed...', w / 2, h / 2);
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

    // Color logic: Use lock price if available, otherwise use start of visible window
    const currentLockPrice = lockPriceRef.current;
    const isUp = currentLockPrice
      ? currentDisplayPrice >= currentLockPrice
      : priceChange >= 0;
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

    // Grid lines - horizontal only, subtle
    ctx.strokeStyle = GRID_COLOR;
    ctx.lineWidth = 1;

    for (let i = 0; i <= 4; i++) {
      const y = Math.round(padding.top + (chartH * i) / 4) + 0.5;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(w - padding.right, y);
      ctx.stroke();
    }

    // Price labels - cleaner font
    ctx.fillStyle = TEXT_COLOR;
    ctx.font = '500 10px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'left';

    for (let i = 0; i <= 4; i++) {
      const price = maxPrice - ((maxPrice - minPrice) * i) / 4;
      const y = padding.top + (chartH * i) / 4;
      ctx.fillText(`$${price.toFixed(2)}`, w - padding.right + 8, y + 4);
    }

    // Build path from smoothed display prices
    const path: { x: number; y: number }[] = [];
    for (const point of visiblePoints) {
      path.push({ x: timeToX(point.time), y: priceToY(point.displayPrice) });
    }

    if (path.length > 1) {
      // Catmull-Rom spline for ultra-smooth bezier curves
      const drawSmoothLine = (points: { x: number; y: number }[], tension = CURVE_TENSION) => {
        if (points.length < 2) return;

        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);

        if (points.length === 2) {
          ctx.lineTo(points[1].x, points[1].y);
          return;
        }

        // Use Catmull-Rom to Bezier conversion for smoother curves
        for (let i = 0; i < points.length - 1; i++) {
          const p0 = points[Math.max(0, i - 1)];
          const p1 = points[i];
          const p2 = points[i + 1];
          const p3 = points[Math.min(points.length - 1, i + 2)];

          // Calculate control points using Catmull-Rom formula
          const cp1x = p1.x + (p2.x - p0.x) * tension;
          const cp1y = p1.y + (p2.y - p0.y) * tension;
          const cp2x = p2.x - (p3.x - p1.x) * tension;
          const cp2y = p2.y - (p3.y - p1.y) * tension;

          ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y);
        }
      };

      // Soft ambient glow - using shadow instead of blur filter for performance
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

      // Area fill with smooth gradient
      ctx.beginPath();
      ctx.moveTo(path[0].x, padding.top + chartH);
      drawSmoothLine(path);
      ctx.lineTo(path[path.length - 1].x, padding.top + chartH);
      ctx.closePath();

      // Gradient fill under line - color-matched with subtle opacity
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

      // Main line - smooth curve with anti-aliased rendering
      ctx.strokeStyle = lineColor;
      ctx.lineWidth = 2.5;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      drawSmoothLine(path);
      ctx.stroke();

      // Current price dot with smooth pulse animation
      const last = path[path.length - 1];
      const time = frameRef.current * 0.05;
      const pulse = (Math.sin(time) + 1) * 0.5; // Normalized 0-1 smooth sine wave

      // Outer breathing ring
      const outerOpacity = 0.15 + 0.15 * pulse;
      const outerRadius = 10 + pulse * 4;
      ctx.strokeStyle = isUp ? `rgba(34, 197, 94, ${outerOpacity})` : `rgba(239, 68, 68, ${outerOpacity})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(last.x, last.y, outerRadius, 0, Math.PI * 2);
      ctx.stroke();

      // Inner ring
      const innerOpacity = 0.3 + 0.2 * pulse;
      ctx.strokeStyle = isUp ? `rgba(34, 197, 94, ${innerOpacity})` : `rgba(239, 68, 68, ${innerOpacity})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(last.x, last.y, 5, 0, Math.PI * 2);
      ctx.stroke();

      // Solid center dot
      ctx.fillStyle = lineColor;
      ctx.beginPath();
      ctx.arc(last.x, last.y, 3, 0, Math.PI * 2);
      ctx.fill();

      // Price tag - minimal modern design
      const tagW = 64;
      const tagH = 24;
      const tagX = w - padding.right + 6;
      const tagY = Math.max(padding.top, Math.min(padding.top + chartH - tagH, last.y - tagH / 2));

      // Tag background with rounded corners
      ctx.fillStyle = lineColor;
      ctx.beginPath();
      ctx.roundRect(tagX, tagY, tagW, tagH, 6);
      ctx.fill();

      // Price text - white on colored background
      ctx.fillStyle = '#fff';
      ctx.font = '600 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`$${currentDisplayPrice.toFixed(2)}`, tagX + tagW / 2, tagY + tagH / 2 + 4);

      // Tick direction indicator (small arrow beside price tag)
      const tickDirection = lastTickDirectionRef.current;
      if (tickDirection) {
        const arrowX = tagX + tagW + 6;
        const arrowY = tagY + tagH / 2;
        const arrowSize = 6;

        ctx.fillStyle = tickDirection === 'up' ? UP_COLOR : DOWN_COLOR;
        ctx.beginPath();
        if (tickDirection === 'up') {
          ctx.moveTo(arrowX, arrowY - arrowSize);
          ctx.lineTo(arrowX - arrowSize * 0.6, arrowY + arrowSize * 0.4);
          ctx.lineTo(arrowX + arrowSize * 0.6, arrowY + arrowSize * 0.4);
        } else {
          ctx.moveTo(arrowX, arrowY + arrowSize);
          ctx.lineTo(arrowX - arrowSize * 0.6, arrowY - arrowSize * 0.4);
          ctx.lineTo(arrowX + arrowSize * 0.6, arrowY - arrowSize * 0.4);
        }
        ctx.closePath();
        ctx.fill();
      }
    }

    // Price change badge (top right) - clean pill design
    if (startPriceRef.current !== null) {
      const changeText = `${isUp ? '+' : ''}${priceChange.toFixed(2)}%`;
      const badgeW = 68;
      const badgeH = 22;
      const badgeX = w - padding.right + 6;
      const badgeY = 6;

      // Badge background with subtle border
      ctx.fillStyle = isUp ? 'rgba(34, 197, 94, 0.12)' : 'rgba(239, 68, 68, 0.12)';
      ctx.beginPath();
      ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 11);
      ctx.fill();

      // Badge text
      ctx.font = '600 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = lineColor;
      ctx.fillText(changeText, badgeX + badgeW / 2, badgeY + badgeH / 2 + 4);
    }

    // Lock price line (if provided) - subtle dashed line
    if (currentLockPrice) {
      const lockY = priceToY(currentLockPrice);
      const clampedY = Math.max(padding.top, Math.min(padding.top + chartH, lockY));

      // Dashed line - subtle but visible
      ctx.setLineDash([8, 6]);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(padding.left, clampedY);
      ctx.lineTo(w - padding.right, clampedY);
      ctx.stroke();
      ctx.setLineDash([]);

      // Label badge on left - cleaner design
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

    // Time labels - cleaner
    ctx.fillStyle = TEXT_COLOR;
    ctx.font = '500 9px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'center';

    for (const sec of [0, 30, 60]) {
      const time = now - (60 - sec) * 1000;
      const x = timeToX(time);
      ctx.fillText(`${sec}s`, x, h - 6);
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

    const animate = (timestamp: number) => {
      // Frame rate limiting to prevent jank
      const elapsed = timestamp - lastFrameTimeRef.current;

      if (elapsed >= FRAME_DURATION) {
        lastFrameTimeRef.current = timestamp - (elapsed % FRAME_DURATION);

        const history = priceHistoryRef.current;

        // Smoothly animate ALL points toward their target prices
        // Use delta-based smoothing for consistent animation speed
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
      if (!historyLoadedRef.current) return; // Wait for history to load first

      const price = prices[symbol];
      const now = Date.now();

      // Track tick direction based on price change
      if (previousTickPriceRef.current !== null) {
        if (price > previousTickPriceRef.current) {
          lastTickDirectionRef.current = 'up';
        } else if (price < previousTickPriceRef.current) {
          lastTickDirectionRef.current = 'down';
        }
        // If price is equal, keep the previous direction
      }
      previousTickPriceRef.current = price;
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
    return <div className="w-full bg-[#09090b] rounded-lg" style={{ height: `${height}px` }} />;
  }

  // Determine if we should show the countdown overlay
  const showCountdown = timeRemaining !== undefined && timeRemaining > 0 && !isLocked;

  return (
    <div
      ref={containerRef}
      className="w-full relative overflow-hidden rounded-lg"
      style={{ height: `${height}px`, background: 'linear-gradient(180deg, #09090b 0%, #0c0c0f 100%)' }}
    >
      <canvas ref={canvasRef} className="w-full h-full" />

      {/* Oracle Countdown Overlay */}
      {showCountdown && (
        <div className="absolute top-4 right-4 flex flex-col items-end pointer-events-none">
          <span
            className="font-mono font-black tabular-nums leading-none"
            style={{
              fontSize: 'clamp(2.5rem, 6vw, 4rem)',
              opacity: 0.8,
              color: '#f97316',
              textShadow: '0 0 20px rgba(249, 115, 22, 0.6), 0 0 40px rgba(249, 115, 22, 0.4), 0 0 60px rgba(249, 115, 22, 0.2)',
            }}
          >
            {timeRemaining}
          </span>
          <span
            className="text-xs font-medium mt-1"
            style={{
              opacity: 0.8,
              color: '#f97316',
              textShadow: '0 0 10px rgba(249, 115, 22, 0.5)',
            }}
          >
            Final price decides.
          </span>
        </div>
      )}
    </div>
  );
}
