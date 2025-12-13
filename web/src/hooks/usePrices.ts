'use client';

import { useState, useEffect } from 'react';
import { getSocket } from '@/lib/socket';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

export function usePrices() {
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [lastUpdate, setLastUpdate] = useState<number>(0);

  useEffect(() => {
    // Fetch initial prices
    fetch(`${BACKEND_URL}/api/prices`)
      .then((res) => res.json())
      .then((data) => {
        setPrices(data.prices);
        setLastUpdate(data.lastUpdate);
      })
      .catch(console.error);

    // Subscribe to real-time updates
    const socket = getSocket();
    socket.emit('subscribe_prices', []);

    socket.on('price_update', (newPrices) => {
      setPrices(newPrices);
      setLastUpdate(Date.now());
    });

    return () => {
      socket.off('price_update');
    };
  }, []);

  const getPrice = (symbol: string): number => {
    return prices[symbol] || 0;
  };

  const formatPrice = (symbol: string): string => {
    const price = getPrice(symbol);
    if (price >= 1000) return `$${price.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
    if (price >= 1) return `$${price.toFixed(2)}`;
    if (price >= 0.01) return `$${price.toFixed(4)}`;
    return `$${price.toFixed(6)}`;
  };

  return {
    prices,
    lastUpdate,
    getPrice,
    formatPrice,
  };
}
