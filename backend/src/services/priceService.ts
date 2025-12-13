// Use CoinGecko's free API
const COINGECKO_API = 'https://api.coingecko.com/api/v3/simple/price';

// Map asset symbols to CoinGecko IDs
const COINGECKO_IDS: Record<string, string> = {
  'SOL': 'solana',
  'BTC': 'bitcoin',
  'ETH': 'ethereum',
  'WIF': 'dogwifcoin',
  'BONK': 'bonk',
  'JUP': 'jupiter-exchange-solana',
  'RAY': 'raydium',
  'JTO': 'jito-governance-token',
};

interface CoinGeckoResponse {
  [key: string]: {
    usd: number;
  };
}

interface PriceHistoryPoint {
  time: number;
  price: number;
}

class PriceService {
  private prices: Map<string, number> = new Map();
  private basePrices: Map<string, number> = new Map(); // Prices from API
  private priceHistory: Map<string, PriceHistoryPoint[]> = new Map(); // Historical prices
  private lastUpdate: number = 0;
  private updateInterval: NodeJS.Timeout | null = null;
  private tickInterval: NodeJS.Timeout | null = null;
  private listeners: Set<(prices: Record<string, number>) => void> = new Set();

  private readonly HISTORY_DURATION = 2 * 60 * 1000; // Keep 2 minutes of history

  constructor() {
    // Initialize with default prices (will be overwritten on fetch)
    this.prices.set('SOL', 230);
    this.prices.set('BTC', 100000);
    this.prices.set('ETH', 3900);
    this.prices.set('WIF', 2.5);
    this.prices.set('BONK', 0.00003);
    this.prices.set('JUP', 1.2);
    this.prices.set('RAY', 5);
    this.prices.set('JTO', 3.5);

    // Copy to base prices
    this.prices.forEach((price, symbol) => {
      this.basePrices.set(symbol, price);
    });
  }

  async start(intervalMs: number = 10000) {
    // Fetch immediately
    await this.fetchPrices();

    // Then set up interval (10s to respect rate limits)
    this.updateInterval = setInterval(() => {
      this.fetchPrices();
    }, intervalMs);

    // 1-second tick for real-time price simulation
    this.tickInterval = setInterval(() => {
      this.simulateTick();
    }, 1000);

    console.log(`Price service started, updating every ${intervalMs}ms with 1s ticks`);
  }

  stop() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }
    console.log('Price service stopped');
  }

  // Simulate small price movements between API fetches
  private simulateTick() {
    const now = Date.now();

    this.basePrices.forEach((basePrice, symbol) => {
      // Random walk within ±0.05% per tick (realistic micro movements)
      const volatility = 0.0005;
      const change = (Math.random() - 0.5) * 2 * volatility;
      const currentPrice = this.prices.get(symbol) || basePrice;

      // Mean revert towards base price
      const reversion = (basePrice - currentPrice) * 0.1;

      const newPrice = currentPrice * (1 + change) + reversion;
      this.prices.set(symbol, newPrice);

      // Record to history
      let history = this.priceHistory.get(symbol);
      if (!history) {
        history = [];
        this.priceHistory.set(symbol, history);
      }
      history.push({ time: now, price: newPrice });

      // Clean old history
      const cutoff = now - this.HISTORY_DURATION;
      while (history.length > 0 && history[0].time < cutoff) {
        history.shift();
      }
    });

    // Notify listeners
    const priceObject = this.getAllPrices();
    this.listeners.forEach(listener => listener(priceObject));
  }

  async fetchPrices(): Promise<void> {
    try {
      const ids = Object.values(COINGECKO_IDS).join(',');
      const response = await fetch(`${COINGECKO_API}?ids=${ids}&vs_currencies=usd`);

      if (!response.ok) {
        throw new Error(`CoinGecko API error: ${response.status}`);
      }

      const data = await response.json() as CoinGeckoResponse;

      // Update prices
      Object.entries(COINGECKO_IDS).forEach(([symbol, geckoId]) => {
        if (data[geckoId]?.usd) {
          this.prices.set(symbol, data[geckoId].usd);
          this.basePrices.set(symbol, data[geckoId].usd);
        }
      });

      this.lastUpdate = Date.now();

      // Notify listeners
      const priceObject = this.getAllPrices();
      this.listeners.forEach(listener => listener(priceObject));

      console.log(`Prices updated: SOL=$${this.prices.get('SOL')?.toFixed(2)}`);

    } catch (error) {
      console.error('Failed to fetch prices:', error);
      // Keep using cached prices
    }
  }

  getPrice(symbol: string): number {
    return this.prices.get(symbol) || 0;
  }

  getAllPrices(): Record<string, number> {
    const result: Record<string, number> = {};
    this.prices.forEach((price, symbol) => {
      result[symbol] = price;
    });
    return result;
  }

  getLastUpdate(): number {
    return this.lastUpdate;
  }

  getPriceHistory(symbol: string, durationMs: number = 60000): PriceHistoryPoint[] {
    const history = this.priceHistory.get(symbol) || [];
    const cutoff = Date.now() - durationMs;
    return history.filter(p => p.time >= cutoff);
  }

  // Subscribe to price updates
  subscribe(listener: (prices: Record<string, number>) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  // Calculate value of a token amount in USD
  getValueUsd(symbol: string, amount: number): number {
    const price = this.getPrice(symbol);
    return price * amount;
  }

  // Calculate how much of toToken you get for fromAmount of fromToken
  getSwapAmount(fromSymbol: string, toSymbol: string, fromAmount: number): number {
    const fromPrice = this.getPrice(fromSymbol);
    const toPrice = this.getPrice(toSymbol);

    if (toPrice === 0) return 0;

    const fromValueUsd = fromPrice * fromAmount;
    return fromValueUsd / toPrice;
  }
}

// Singleton instance
export const priceService = new PriceService();
