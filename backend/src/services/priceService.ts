// Use CoinMarketCap API (replacing CoinGecko due to rate limits)
const CMC_API = 'https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest';

// Tokens to fetch prices for
const TRACKED_SYMBOLS = ['SOL', 'BTC', 'ETH', 'WIF', 'BONK', 'JUP', 'RAY', 'JTO'];

interface CMCQuote {
  price: number;
  percent_change_24h: number;
}

interface CMCCoinData {
  id: number;
  symbol: string;
  quote: {
    USD: CMCQuote;
  };
}

interface CMCResponse {
  data: Record<string, CMCCoinData>;
  status: {
    error_code: number;
    error_message: string | null;
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
  private apiKey: string;

  private readonly HISTORY_DURATION = 2 * 60 * 1000; // Keep 2 minutes of history

  constructor() {
    this.apiKey = process.env.CMC_API_KEY || '';
    if (!this.apiKey) {
      console.warn('[PriceService] CMC_API_KEY not set - using fallback prices only');
    }

    // Initialize with default prices (will be overwritten on fetch)
    // Updated Jan 2026 - realistic fallback prices
    this.prices.set('SOL', 141);
    this.prices.set('BTC', 94000);
    this.prices.set('ETH', 3300);
    this.prices.set('WIF', 0.38);
    this.prices.set('BONK', 0.000003);
    this.prices.set('JUP', 0.85);
    this.prices.set('RAY', 4.5);
    this.prices.set('JTO', 2.8);

    // Copy to base prices
    this.prices.forEach((price, symbol) => {
      this.basePrices.set(symbol, price);
    });
  }

  async start(intervalMs: number = 30000) {
    // Fetch immediately
    await this.fetchPrices();

    // Update interval - CMC has better rate limits, can fetch more frequently
    // With pro tier: 10,000 calls/day = ~7 calls/minute
    // We'll fetch every 30s to be safe (2880 calls/day)
    this.updateInterval = setInterval(() => {
      this.fetchPrices();
    }, intervalMs);

    // 1-second tick for real-time price simulation
    this.tickInterval = setInterval(() => {
      this.simulateTick();
    }, 1000);

    console.log(`Price service started (CMC), updating every ${intervalMs}ms with 1s ticks`);
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
    if (!this.apiKey) {
      // No API key - use fallback prices
      return;
    }

    try {
      const symbols = TRACKED_SYMBOLS.join(',');
      const response = await fetch(`${CMC_API}?symbol=${symbols}`, {
        headers: {
          'X-CMC_PRO_API_KEY': this.apiKey,
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`CMC API error: ${response.status}`);
      }

      const data = await response.json() as CMCResponse;

      if (data.status.error_code !== 0) {
        throw new Error(`CMC API error: ${data.status.error_message}`);
      }

      // Update prices
      for (const symbol of TRACKED_SYMBOLS) {
        const coinData = data.data[symbol];
        if (coinData?.quote?.USD?.price) {
          this.prices.set(symbol, coinData.quote.USD.price);
          this.basePrices.set(symbol, coinData.quote.USD.price);
        }
      }

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
