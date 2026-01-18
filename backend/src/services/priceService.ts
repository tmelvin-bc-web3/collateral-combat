// Price Service - Pyth Hermes primary, CMC fallback
// Pyth is free and real-time, CMC is backup if Pyth fails

const PYTH_HERMES_URL = 'https://hermes.pyth.network/v2/updates/price/latest';
const CMC_API = 'https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest';

// Pyth feed IDs for all tracked tokens
const PYTH_FEED_IDS: Record<string, string> = {
  // Major tokens
  SOL: 'ef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d',
  BTC: 'e62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43',
  ETH: 'ff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace',
  // Solana ecosystem
  JUP: '0a0408d619e9380abad35060f9192039ed5042fa6f82301d0e48bb52be830996',
  RAY: '91568baa8beb53db23eb3fb7f22c6e8bd303d103919e19733f2bb642d3e7987a',
  JTO: 'b43660a5f790c69354b0729a5ef9d50d68f1df92107540210b9cccba1f947cc2',
  // Token Wars memecoins
  WIF: '4ca4beeca86f0d164160323817a4e42b10010a724c2217c6ee41b54cd4cc61fc',
  BONK: '72b021217ca3fe68922a19aaf990109cb9d84e9ad004b4d2025ad6f529314419',
  PONKE: 'f4cb880742ecf6525885a239968914798c44cd83749856a6dff5c140ba5bf69b',
  PENGU: 'bed3097008b9b5e3c93bec20be79cb43986b85a996475589351a21e67bae9b61',
  TURBO: 'a00e67c6232f2f564932c252c440ed30759d10fee966b601c1613b0ed8692a5c',
  POPCAT: 'b9312a7ee50e189ef045aa3c7842e099b061bd9bdc99ac645956c3b660dc8cce',
  FARTCOIN: '58cd29ef0e714c5affc44f269b2c1899a52da4169d7acc147b9da692e6953608',
  MEW: '514aed52ca5294177f20187ae883cec4a018619772ddce41efcc36a6448f5d5d',
  PNUT: '116da895807f81f6b5c5f01b109376e7f6834dc8b51365ab7cdfa66634340e54',
  GOAT: 'f7731dc812590214d3eb4343bfb13d1b4cfa9b1d4e020644b5d5d8e07d60c66c',
};

// Reverse lookup: feed ID -> symbol
const FEED_ID_TO_SYMBOL: Record<string, string> = {};
for (const [symbol, feedId] of Object.entries(PYTH_FEED_IDS)) {
  FEED_ID_TO_SYMBOL[feedId] = symbol;
}

// Tokens to fetch prices for
const TRACKED_SYMBOLS = Object.keys(PYTH_FEED_IDS);

// Pyth Hermes response types
interface PythPriceData {
  id: string;
  price: {
    price: string;
    conf: string;
    expo: number;
    publish_time: number;
  };
}

interface PythResponse {
  parsed: PythPriceData[];
}

// CMC types (for fallback)
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
  private basePrices: Map<string, number> = new Map();
  private priceHistory: Map<string, PriceHistoryPoint[]> = new Map();
  private lastUpdate: number = 0;
  private updateInterval: NodeJS.Timeout | null = null;
  private tickInterval: NodeJS.Timeout | null = null;
  private listeners: Set<(prices: Record<string, number>) => void> = new Set();
  private cmcApiKey: string;
  private pythFailCount: number = 0;
  private lastPythSuccess: number = 0;

  private readonly HISTORY_DURATION = 2 * 60 * 1000;
  private readonly MAX_PYTH_FAILS = 3; // Fall back to CMC after 3 consecutive Pyth failures

  constructor() {
    this.cmcApiKey = process.env.CMC_API_KEY || '';

    // Initialize with fallback prices
    this.prices.set('SOL', 141);
    this.prices.set('BTC', 94000);
    this.prices.set('ETH', 3300);
    this.prices.set('WIF', 0.38);
    this.prices.set('BONK', 0.000003);
    this.prices.set('JUP', 0.85);
    this.prices.set('RAY', 4.5);
    this.prices.set('JTO', 2.8);
    this.prices.set('PONKE', 0.42);
    this.prices.set('PENGU', 0.035);
    this.prices.set('TURBO', 0.008);
    this.prices.set('POPCAT', 1.15);
    this.prices.set('FARTCOIN', 1.05);
    this.prices.set('MEW', 0.0095);
    this.prices.set('PNUT', 0.72);
    this.prices.set('GOAT', 0.65);

    // Copy to base prices
    this.prices.forEach((price, symbol) => {
      this.basePrices.set(symbol, price);
    });
  }

  async start(intervalMs: number = 30000) {
    // Fetch immediately
    await this.fetchPrices();

    // Update interval
    this.updateInterval = setInterval(() => {
      this.fetchPrices();
    }, intervalMs);

    // 1-second tick for real-time price simulation
    this.tickInterval = setInterval(() => {
      this.simulateTick();
    }, 1000);

    console.log(`[PriceService] Started with Pyth primary, CMC fallback. Interval: ${intervalMs}ms`);
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
    console.log('[PriceService] Stopped');
  }

  private simulateTick() {
    const now = Date.now();

    this.basePrices.forEach((basePrice, symbol) => {
      const volatility = 0.0005;
      const change = (Math.random() - 0.5) * 2 * volatility;
      const currentPrice = this.prices.get(symbol) || basePrice;
      const reversion = (basePrice - currentPrice) * 0.1;
      const newPrice = currentPrice * (1 + change) + reversion;
      this.prices.set(symbol, newPrice);

      let history = this.priceHistory.get(symbol);
      if (!history) {
        history = [];
        this.priceHistory.set(symbol, history);
      }
      history.push({ time: now, price: newPrice });

      const cutoff = now - this.HISTORY_DURATION;
      while (history.length > 0 && history[0].time < cutoff) {
        history.shift();
      }
    });

    const priceObject = this.getAllPrices();
    this.listeners.forEach(listener => listener(priceObject));
  }

  async fetchPrices(): Promise<void> {
    // Try Pyth first (unless we've had too many consecutive failures)
    if (this.pythFailCount < this.MAX_PYTH_FAILS) {
      const pythSuccess = await this.fetchFromPyth();
      if (pythSuccess) {
        this.pythFailCount = 0;
        this.lastPythSuccess = Date.now();
        return;
      }
      this.pythFailCount++;
      console.warn(`[PriceService] Pyth failed (${this.pythFailCount}/${this.MAX_PYTH_FAILS}), trying CMC...`);
    }

    // Fall back to CMC
    const cmcSuccess = await this.fetchFromCMC();
    if (cmcSuccess) {
      // Reset Pyth fail count after some time to try again
      if (Date.now() - this.lastPythSuccess > 60000) {
        this.pythFailCount = 0; // Try Pyth again after 1 minute
      }
    }
  }

  private async fetchFromPyth(): Promise<boolean> {
    try {
      const feedIds = Object.values(PYTH_FEED_IDS);
      const params = feedIds.map(id => `ids[]=${id}`).join('&');
      const url = `${PYTH_HERMES_URL}?${params}`;

      const response = await fetch(url, {
        headers: { 'Accept': 'application/json' },
      });

      if (!response.ok) {
        throw new Error(`Pyth API error: ${response.status}`);
      }

      const data = await response.json() as PythResponse;

      if (!data.parsed || data.parsed.length === 0) {
        throw new Error('No price data from Pyth');
      }

      let updatedCount = 0;
      for (const priceData of data.parsed) {
        const symbol = FEED_ID_TO_SYMBOL[priceData.id];
        if (symbol && priceData.price) {
          const price = parseFloat(priceData.price.price) * Math.pow(10, priceData.price.expo);
          if (price > 0) {
            this.prices.set(symbol, price);
            this.basePrices.set(symbol, price);
            updatedCount++;
          }
        }
      }

      this.lastUpdate = Date.now();
      const priceObject = this.getAllPrices();
      this.listeners.forEach(listener => listener(priceObject));

      console.log(`[PriceService] Pyth: Updated ${updatedCount} prices. SOL=$${this.prices.get('SOL')?.toFixed(2)}`);
      return true;

    } catch (error) {
      console.error('[PriceService] Pyth fetch failed:', error);
      return false;
    }
  }

  private async fetchFromCMC(): Promise<boolean> {
    if (!this.cmcApiKey) {
      console.warn('[PriceService] No CMC API key - using cached prices');
      return false;
    }

    try {
      const symbols = TRACKED_SYMBOLS.join(',');
      const response = await fetch(`${CMC_API}?symbol=${symbols}`, {
        headers: {
          'X-CMC_PRO_API_KEY': this.cmcApiKey,
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

      let updatedCount = 0;
      for (const symbol of TRACKED_SYMBOLS) {
        const coinData = data.data[symbol];
        if (coinData?.quote?.USD?.price) {
          this.prices.set(symbol, coinData.quote.USD.price);
          this.basePrices.set(symbol, coinData.quote.USD.price);
          updatedCount++;
        }
      }

      this.lastUpdate = Date.now();
      const priceObject = this.getAllPrices();
      this.listeners.forEach(listener => listener(priceObject));

      console.log(`[PriceService] CMC fallback: Updated ${updatedCount} prices. SOL=$${this.prices.get('SOL')?.toFixed(2)}`);
      return true;

    } catch (error) {
      console.error('[PriceService] CMC fetch failed:', error);
      return false;
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

  subscribe(listener: (prices: Record<string, number>) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  getValueUsd(symbol: string, amount: number): number {
    const price = this.getPrice(symbol);
    return price * amount;
  }

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
