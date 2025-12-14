import { Memecoin, upsertMemecoins, getMemecoinPool } from '../db/draftDatabase';

const CMC_API_BASE = 'https://pro-api.coinmarketcap.com/v1';

interface CMCListing {
  id: number;
  name: string;
  symbol: string;
  cmc_rank: number;
  quote: {
    USD: {
      price: number;
      percent_change_24h: number;
    };
  };
}

interface CMCListingsResponse {
  data: CMCListing[];
}

interface CMCQuotesResponse {
  data: Record<string, {
    id: number;
    name: string;
    symbol: string;
    quote: {
      USD: {
        price: number;
        percent_change_24h: number;
      };
    };
  }>;
}

// Known memecoin symbols to filter from CMC data
const MEMECOIN_SYMBOLS = new Set([
  // Top memecoins
  'DOGE', 'SHIB', 'PEPE', 'BONK', 'WIF', 'FLOKI', 'MEME', 'BRETT', 'POPCAT', 'MEW',
  'BOME', 'TURBO', 'COQ', 'MYRO', 'SLERF', 'TOSHI', 'MOCHI', 'PONKE', 'WEN', 'SAMO',
  // Solana memecoins
  'PNUT', 'GOAT', 'GIGA', 'MOG', 'SPX', 'MOODENG', 'CHILLGUY', 'ACT', 'FARTCOIN',
  'ZEREBRO', 'AI16Z', 'PENGU', 'DOG', 'NEIRO', 'BABYDOGE', 'ELON', 'KISHU', 'AKITA',
  // More popular ones
  'WOJAK', 'LADYS', 'BITCOIN', 'HarryPotterObamaSonic10Inu', 'PEPE2', 'BOB', 'ANDY',
  'SNEK', 'AIDOGE', 'LEASH', 'BONE', 'PAW', 'VOLT', 'PIT', 'HOGE', 'DOGELON',
  'CATE', 'DEGEN', 'TAMA', 'PUSSY', 'JESUS', 'MONG', 'SIMPSON', 'SMURFCAT',
  // AI meme coins
  'AIMEME', 'TAOCAT', 'SHOGGOTH', 'OPUS', 'PIPPIN', 'AVA', 'ELIZA', 'LUNA',
  // Recent trending
  'PORK', 'MEMECOIN', 'BEER', 'DADDY', 'MOTHER', 'MFER', 'REKT', 'WAGMI', 'COPE',
]);

class CoinMarketCapService {
  private apiKey: string;
  private memecoinCache: Map<string, Memecoin> = new Map();
  private lastFetch: number = 0;
  private updateInterval: NodeJS.Timeout | null = null;
  private listeners: Set<(prices: Record<string, number>) => void> = new Set();

  // Cache TTL: 60 seconds (to stay within rate limits)
  private readonly CACHE_TTL = 60 * 1000;
  // Update interval: 5 minutes (to stay well within 300 calls/day limit)
  private readonly UPDATE_INTERVAL = 5 * 60 * 1000;

  constructor() {
    this.apiKey = process.env.CMC_API_KEY || '';
    if (!this.apiKey) {
      console.warn('CMC_API_KEY not set - using mock memecoin data');
    }
  }

  async start(): Promise<void> {
    // Fetch immediately
    await this.fetchTopMemecoins();

    // Then set up interval
    this.updateInterval = setInterval(() => {
      this.fetchTopMemecoins();
    }, this.UPDATE_INTERVAL);

    console.log(`CoinMarketCap service started, updating every ${this.UPDATE_INTERVAL / 1000}s`);
  }

  stop(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
    console.log('CoinMarketCap service stopped');
  }

  async fetchTopMemecoins(): Promise<Memecoin[]> {
    const now = Date.now();

    // Return cached data if still fresh
    if (this.memecoinCache.size > 0 && now - this.lastFetch < this.CACHE_TTL) {
      return Array.from(this.memecoinCache.values());
    }

    // If no API key, use mock data
    if (!this.apiKey) {
      return this.getMockMemecoins();
    }

    try {
      // Fetch top memecoins - use listings endpoint without tag filter first
      // Then we'll get a broader set of coins (the free tier doesn't support tag filtering well)
      const response = await fetch(
        `${CMC_API_BASE}/cryptocurrency/listings/latest?start=1&limit=500&convert=USD`,
        {
          headers: {
            'X-CMC_PRO_API_KEY': this.apiKey,
            'Accept': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`CMC API error: ${response.status}`);
      }

      const data = await response.json() as CMCListingsResponse;
      const memecoins = this.mapListingsToMemecoins(data.data);

      // Update cache
      this.memecoinCache.clear();
      for (const coin of memecoins) {
        this.memecoinCache.set(coin.id, coin);
      }

      // Persist to database
      upsertMemecoins(memecoins);

      this.lastFetch = now;

      // Notify listeners
      this.notifyPriceUpdate();

      console.log(`Fetched ${memecoins.length} memecoins from CMC`);

      return memecoins;
    } catch (error) {
      console.error('Failed to fetch memecoins from CMC:', error);

      // Fall back to database cache
      const dbCache = getMemecoinPool();
      if (dbCache.length > 0) {
        for (const coin of dbCache) {
          this.memecoinCache.set(coin.id, coin);
        }
        return dbCache;
      }

      // Last resort: mock data
      return this.getMockMemecoins();
    }
  }

  async updatePrices(): Promise<void> {
    if (!this.apiKey || this.memecoinCache.size === 0) {
      return;
    }

    try {
      const ids = Array.from(this.memecoinCache.keys()).join(',');
      const response = await fetch(
        `${CMC_API_BASE}/cryptocurrency/quotes/latest?id=${ids}&convert=USD`,
        {
          headers: {
            'X-CMC_PRO_API_KEY': this.apiKey,
            'Accept': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`CMC API error: ${response.status}`);
      }

      const data = await response.json() as CMCQuotesResponse;
      const now = Date.now();

      for (const [id, coinData] of Object.entries(data.data)) {
        const existing = this.memecoinCache.get(id);
        if (existing) {
          existing.currentPrice = coinData.quote.USD.price;
          existing.priceChange24h = coinData.quote.USD.percent_change_24h;
          existing.lastUpdated = now;
        }
      }

      // Update database
      upsertMemecoins(Array.from(this.memecoinCache.values()));

      // Notify listeners
      this.notifyPriceUpdate();
    } catch (error) {
      console.error('Failed to update memecoin prices:', error);
    }
  }

  private mapListingsToMemecoins(listings: CMCListing[]): Memecoin[] {
    const now = Date.now();

    // Filter to only include known memecoins
    const memecoins = listings.filter(listing =>
      MEMECOIN_SYMBOLS.has(listing.symbol.toUpperCase())
    );

    console.log(`Filtered ${memecoins.length} memecoins from ${listings.length} total coins`);

    return memecoins.map((listing, index) => ({
      id: listing.id.toString(),
      symbol: listing.symbol,
      name: listing.name,
      marketCapRank: index + 1, // Use index as rank within memecoins
      currentPrice: listing.quote.USD.price,
      priceChange24h: listing.quote.USD.percent_change_24h,
      logoUrl: `https://s2.coinmarketcap.com/static/img/coins/64x64/${listing.id}.png`,
      lastUpdated: now,
    }));
  }

  private getMockMemecoins(): Memecoin[] {
    const now = Date.now();
    const mockCoins: Memecoin[] = [
      { id: '5994', symbol: 'SHIB', name: 'Shiba Inu', marketCapRank: 1, currentPrice: 0.0000225, priceChange24h: 2.5, logoUrl: 'https://s2.coinmarketcap.com/static/img/coins/64x64/5994.png', lastUpdated: now },
      { id: '74', symbol: 'DOGE', name: 'Dogecoin', marketCapRank: 2, currentPrice: 0.38, priceChange24h: -1.2, logoUrl: 'https://s2.coinmarketcap.com/static/img/coins/64x64/74.png', lastUpdated: now },
      { id: '24478', symbol: 'PEPE', name: 'Pepe', marketCapRank: 3, currentPrice: 0.0000185, priceChange24h: 5.3, logoUrl: 'https://s2.coinmarketcap.com/static/img/coins/64x64/24478.png', lastUpdated: now },
      { id: '23095', symbol: 'BONK', name: 'Bonk', marketCapRank: 4, currentPrice: 0.0000285, priceChange24h: -3.1, logoUrl: 'https://s2.coinmarketcap.com/static/img/coins/64x64/23095.png', lastUpdated: now },
      { id: '28301', symbol: 'WIF', name: 'dogwifhat', marketCapRank: 5, currentPrice: 2.45, priceChange24h: 8.2, logoUrl: 'https://s2.coinmarketcap.com/static/img/coins/64x64/28301.png', lastUpdated: now },
      { id: '4030', symbol: 'FLOKI', name: 'FLOKI', marketCapRank: 6, currentPrice: 0.000175, priceChange24h: 1.8, logoUrl: 'https://s2.coinmarketcap.com/static/img/coins/64x64/4030.png', lastUpdated: now },
      { id: '29420', symbol: 'POPCAT', name: 'Popcat', marketCapRank: 7, currentPrice: 1.15, priceChange24h: -2.5, logoUrl: 'https://s2.coinmarketcap.com/static/img/coins/64x64/29420.png', lastUpdated: now },
      { id: '28752', symbol: 'MEW', name: 'cat in a dogs world', marketCapRank: 8, currentPrice: 0.0095, priceChange24h: 4.1, logoUrl: 'https://s2.coinmarketcap.com/static/img/coins/64x64/28752.png', lastUpdated: now },
      { id: '32287', symbol: 'PNUT', name: 'Peanut the Squirrel', marketCapRank: 9, currentPrice: 0.72, priceChange24h: 12.5, logoUrl: 'https://s2.coinmarketcap.com/static/img/coins/64x64/32287.png', lastUpdated: now },
      { id: '28850', symbol: 'BOME', name: 'BOOK OF MEME', marketCapRank: 10, currentPrice: 0.0085, priceChange24h: -1.9, logoUrl: 'https://s2.coinmarketcap.com/static/img/coins/64x64/28850.png', lastUpdated: now },
      { id: '31432', symbol: 'GOAT', name: 'Goatseus Maximus', marketCapRank: 11, currentPrice: 0.65, priceChange24h: 6.7, logoUrl: 'https://s2.coinmarketcap.com/static/img/coins/64x64/31432.png', lastUpdated: now },
      { id: '30171', symbol: 'BRETT', name: 'Brett', marketCapRank: 12, currentPrice: 0.15, priceChange24h: -0.8, logoUrl: 'https://s2.coinmarketcap.com/static/img/coins/64x64/30171.png', lastUpdated: now },
      { id: '28683', symbol: 'MOG', name: 'Mog Coin', marketCapRank: 13, currentPrice: 0.0000019, priceChange24h: 3.2, logoUrl: 'https://s2.coinmarketcap.com/static/img/coins/64x64/28683.png', lastUpdated: now },
      { id: '30126', symbol: 'GIGA', name: 'GIGACHAD', marketCapRank: 14, currentPrice: 0.058, priceChange24h: -4.5, logoUrl: 'https://s2.coinmarketcap.com/static/img/coins/64x64/30126.png', lastUpdated: now },
      { id: '29270', symbol: 'SLERF', name: 'Slerf', marketCapRank: 15, currentPrice: 0.32, priceChange24h: 2.1, logoUrl: 'https://s2.coinmarketcap.com/static/img/coins/64x64/29270.png', lastUpdated: now },
      { id: '31234', symbol: 'SPX', name: 'SPX6900', marketCapRank: 16, currentPrice: 1.28, priceChange24h: 9.3, logoUrl: 'https://s2.coinmarketcap.com/static/img/coins/64x64/31234.png', lastUpdated: now },
      { id: '32195', symbol: 'MOODENG', name: 'Moo Deng', marketCapRank: 17, currentPrice: 0.28, priceChange24h: -5.2, logoUrl: 'https://s2.coinmarketcap.com/static/img/coins/64x64/32195.png', lastUpdated: now },
      { id: '32521', symbol: 'CHILLGUY', name: 'Just a chill guy', marketCapRank: 18, currentPrice: 0.42, priceChange24h: 7.8, logoUrl: 'https://s2.coinmarketcap.com/static/img/coins/64x64/32521.png', lastUpdated: now },
      { id: '29587', symbol: 'MYRO', name: 'Myro', marketCapRank: 19, currentPrice: 0.095, priceChange24h: -2.3, logoUrl: 'https://s2.coinmarketcap.com/static/img/coins/64x64/29587.png', lastUpdated: now },
      { id: '28298', symbol: 'SAMO', name: 'Samoyedcoin', marketCapRank: 20, currentPrice: 0.018, priceChange24h: 1.5, logoUrl: 'https://s2.coinmarketcap.com/static/img/coins/64x64/28298.png', lastUpdated: now },
      // Add more mock coins to reach ~50-100
      { id: '31510', symbol: 'ACT', name: 'Act I The AI Prophecy', marketCapRank: 21, currentPrice: 0.38, priceChange24h: 15.2, logoUrl: 'https://s2.coinmarketcap.com/static/img/coins/64x64/31510.png', lastUpdated: now },
      { id: '32356', symbol: 'FARTCOIN', name: 'Fartcoin', marketCapRank: 22, currentPrice: 1.05, priceChange24h: 22.5, logoUrl: 'https://s2.coinmarketcap.com/static/img/coins/64x64/32356.png', lastUpdated: now },
      { id: '28177', symbol: 'TNSR', name: 'Tensor', marketCapRank: 23, currentPrice: 0.52, priceChange24h: -1.1, logoUrl: 'https://s2.coinmarketcap.com/static/img/coins/64x64/28177.png', lastUpdated: now },
      { id: '32284', symbol: 'AI16Z', name: 'ai16z', marketCapRank: 24, currentPrice: 1.85, priceChange24h: 18.7, logoUrl: 'https://s2.coinmarketcap.com/static/img/coins/64x64/32284.png', lastUpdated: now },
      { id: '28541', symbol: 'TOSHI', name: 'Toshi', marketCapRank: 25, currentPrice: 0.00085, priceChange24h: 3.4, logoUrl: 'https://s2.coinmarketcap.com/static/img/coins/64x64/28541.png', lastUpdated: now },
      { id: '28905', symbol: 'DOG', name: 'Dog (Bitcoin)', marketCapRank: 26, currentPrice: 0.0072, priceChange24h: -0.5, logoUrl: 'https://s2.coinmarketcap.com/static/img/coins/64x64/28905.png', lastUpdated: now },
      { id: '31468', symbol: 'PENGU', name: 'Pudgy Penguins', marketCapRank: 27, currentPrice: 0.035, priceChange24h: 5.8, logoUrl: 'https://s2.coinmarketcap.com/static/img/coins/64x64/31468.png', lastUpdated: now },
      { id: '28299', symbol: 'WEN', name: 'Wen', marketCapRank: 28, currentPrice: 0.00012, priceChange24h: -2.8, logoUrl: 'https://s2.coinmarketcap.com/static/img/coins/64x64/28299.png', lastUpdated: now },
      { id: '31971', symbol: 'ZEREBRO', name: 'Zerebro', marketCapRank: 29, currentPrice: 0.58, priceChange24h: 11.2, logoUrl: 'https://s2.coinmarketcap.com/static/img/coins/64x64/31971.png', lastUpdated: now },
      { id: '29814', symbol: 'PONKE', name: 'Ponke', marketCapRank: 30, currentPrice: 0.42, priceChange24h: -3.7, logoUrl: 'https://s2.coinmarketcap.com/static/img/coins/64x64/29814.png', lastUpdated: now },
    ];

    // Update cache and database
    this.memecoinCache.clear();
    for (const coin of mockCoins) {
      this.memecoinCache.set(coin.id, coin);
    }
    upsertMemecoins(mockCoins);
    this.lastFetch = now;

    return mockCoins;
  }

  getPrice(coinId: string): number {
    return this.memecoinCache.get(coinId)?.currentPrice || 0;
  }

  getAllPrices(): Record<string, number> {
    const result: Record<string, number> = {};
    this.memecoinCache.forEach((coin) => {
      result[coin.id] = coin.currentPrice;
    });
    return result;
  }

  getMemecoin(coinId: string): Memecoin | undefined {
    return this.memecoinCache.get(coinId);
  }

  getAllMemecoins(): Memecoin[] {
    return Array.from(this.memecoinCache.values());
  }

  subscribe(listener: (prices: Record<string, number>) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyPriceUpdate(): void {
    const prices = this.getAllPrices();
    this.listeners.forEach(listener => listener(prices));
  }
}

// Singleton instance
export const coinMarketCapService = new CoinMarketCapService();
