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
      // Smooth curve helper using cardinal spline
      const drawSmoothLine = (points: { x: number; y: number }[], tension = 0.3) => {
        if (points.length < 2) return;

        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);

        if (points.length === 2) {
          ctx.lineTo(points[1].x, points[1].y);
          return;
        }

        for (let i = 0; i < points.length - 1; i++) {
          const p0 = points[i === 0 ? i : i - 1];
          const p1 = points[i];
          const p2 = points[i + 1];
          const p3 = points[i + 2 >= points.length ? i + 1 : i + 2];

          const cp1x = p1.x + (p2.x - p0.x) * tension;
          const cp1y = p1.y + (p2.y - p0.y) * tension;
          const cp2x = p2.x - (p3.x - p1.x) * tension;
          const cp2y = p2.y - (p3.y - p1.y) * tension;

          ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y);
        }
      };

      // Soft glow effect
      ctx.save();
      ctx.filter = 'blur(8px)';
      ctx.strokeStyle = isUp ? 'rgba(16, 185, 129, 0.4)' : 'rgba(244, 63, 94, 0.4)';
      ctx.lineWidth = 4;
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

      // Gradient fill under line - always green with 5-8% opacity fading to transparent
      const gradient = ctx.createLinearGradient(0, padding.top, 0, padding.top + chartH);
      gradient.addColorStop(0, 'rgba(16, 185, 129, 0.08)');
      gradient.addColorStop(0.5, 'rgba(16, 185, 129, 0.04)');
      gradient.addColorStop(1, 'rgba(16, 185, 129, 0)');
      ctx.fillStyle = gradient;
      ctx.fill();

      // Main line - smooth curve
      ctx.strokeStyle = lineColor;
      ctx.lineWidth = 3.5;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      drawSmoothLine(path);
      ctx.stroke();

      // Current price dot with pulse - cleaner animation
      const last = path[path.length - 1];
      const pulse = Math.sin(frameRef.current * 0.06) * 0.5 + 0.5;

      // Outer glow ring
      ctx.strokeStyle = isUp ? `rgba(16, 185, 129, ${0.2 + 0.2 * pulse})` : `rgba(244, 63, 94, ${0.2 + 0.2 * pulse})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(last.x, last.y, 8 + pulse * 4, 0, Math.PI * 2);
      ctx.stroke();

      // Inner ring
      ctx.strokeStyle = isUp ? `rgba(16, 185, 129, ${0.4 + 0.2 * pulse})` : `rgba(244, 63, 94, ${0.4 + 0.2 * pulse})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(last.x, last.y, 5, 0, Math.PI * 2);
      ctx.stroke();

      // Center dot
      ctx.fillStyle = lineColor;
      ctx.beginPath();
      ctx.arc(last.x, last.y, 3, 0, Math.PI * 2);
      ctx.fill();

      // Price tag - cleaner design
      const tagW = 62;
      const tagH = 22;
      const tagX = w - padding.right + 4;
      const tagY = Math.max(padding.top, Math.min(padding.top + chartH - tagH, last.y - tagH / 2));

      // Tag background with slight transparency
      ctx.fillStyle = lineColor;
      ctx.beginPath();
      ctx.roundRect(tagX, tagY, tagW, tagH, 4);
      ctx.fill();

      // Price text
      ctx.fillStyle = '#000';
      ctx.font = '600 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`$${currentDisplayPrice.toFixed(2)}`, tagX + tagW / 2, tagY + tagH / 2 + 4);

      // Last tick direction arrow indicator
      const tickDirection = lastTickDirectionRef.current;
      if (tickDirection) {
        const arrowX = w - padding.right + tagW / 2 + 4;
        const arrowY = tagY + tagH + 8;
        const arrowSize = 8;
        const arrowColor = tickDirection === 'up' ? UP_COLOR : DOWN_COLOR;

        ctx.fillStyle = arrowColor;
        ctx.beginPath();
        if (tickDirection === 'up') {
          // Up arrow (triangle pointing up)
          ctx.moveTo(arrowX, arrowY - arrowSize);
          ctx.lineTo(arrowX - arrowSize * 0.7, arrowY + arrowSize * 0.3);
          ctx.lineTo(arrowX + arrowSize * 0.7, arrowY + arrowSize * 0.3);
        } else {
          // Down arrow (triangle pointing down)
          ctx.moveTo(arrowX, arrowY + arrowSize);
          ctx.lineTo(arrowX - arrowSize * 0.7, arrowY - arrowSize * 0.3);
          ctx.lineTo(arrowX + arrowSize * 0.7, arrowY - arrowSize * 0.3);
        }
        ctx.closePath();
        ctx.fill();
      }
    }

    // Price change badge (top right) - cleaner pill design
    if (startPriceRef.current !== null) {
      const changeText = `${isUp ? '+' : ''}${priceChange.toFixed(2)}%`;
      const badgeW = 65;
      const badgeH = 20;
      const badgeX = w - padding.right + 4;
      const badgeY = 8;

      // Badge background
      ctx.fillStyle = isUp ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)';
      ctx.beginPath();
      ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 10);
      ctx.fill();

      // Badge text
      ctx.font = '600 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = lineColor;
      ctx.fillText(changeText, badgeX + badgeW / 2, badgeY + badgeH / 2 + 4);
    }

    // Lock price line (if provided) - dashed, brighter than grid
    if (currentLockPrice) {
      const lockY = priceToY(currentLockPrice);
      const clampedY = Math.max(padding.top, Math.min(padding.top + chartH, lockY));

      // Dashed line - brighter than grid (grid is 0.04 opacity)
      ctx.setLineDash([6, 4]);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(padding.left, clampedY);
      ctx.lineTo(w - padding.right, clampedY);
      ctx.stroke();
      ctx.setLineDash([]);

      // Label badge on left with "LOCK $XXX.XX" format
      const labelText = `LOCK $${currentLockPrice.toFixed(2)}`;
      ctx.font = '600 9px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      const labelWidth = ctx.measureText(labelText).width + 12;

      ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
      ctx.beginPath();
      ctx.roundRect(padding.left, clampedY - 10, labelWidth, 18, 4);
      ctx.fill();

      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.textAlign = 'left';
      ctx.fillText(labelText, padding.left + 6, clampedY + 3);
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
