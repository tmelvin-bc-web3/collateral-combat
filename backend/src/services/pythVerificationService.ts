/**
 * Pyth Verification Service
 *
 * Fetches prices from Pyth Network oracles for audit/verification purposes.
 * Used alongside backend price feeds to provide provable price data.
 *
 * This is the "middle ground" approach:
 * - Backend prices used for game logic (fast, free)
 * - Pyth prices logged for audit trail (verifiable)
 * - Discrepancies flagged for review
 */

import { Connection, PublicKey } from '@solana/web3.js';

// Pyth Hermes API endpoint (free, no auth required)
const PYTH_HERMES_URL = 'https://hermes.pyth.network';

// Pyth price feed IDs (hex strings without 0x prefix)
// These are the canonical feed IDs from Pyth
export const PYTH_FEED_IDS: Record<string, string> = {
  SOL: 'ef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d',
  BTC: 'e62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43',
  ETH: 'ff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace',
  WIF: '4ca4beeca86f0d164160323817a4e42b10010a724c2217c6c26c1d20cc3f5888',
  BONK: '72b021217ca3fe68922a19aaf990109cb9d84e9ad004b4d2025ad6f529314419',
  JUP: '0a0408d619e9380abad35060f9192039ed5042fa6f82301d0e48bb52be830996',
  RAY: '91568baa8beb53db23eb3fb7f22c6e8bd303d103919e19733f2bb642d3e7987a',
  JTO: 'b43660a5f790c69354b0729a5ef9d50d68f1df92107540210b9cccba1f947cc2',
};

// Pyth on-chain price accounts (Solana mainnet)
export const PYTH_PRICE_ACCOUNTS: Record<string, string> = {
  SOL: 'H6ARHf6YXhGYeQfUzQNGk6rDNnLBQKrenN712K4AQJEG',
  BTC: 'GVXRSBjFk6e6J3NbVPXohDJetcTjaeeuykUpbQF8UoMU',
  ETH: 'JBu1AL4obBcCMqKBBxhpWCNUt136ijcuMZLFvTP7iWdB',
  WIF: '6B23K3tkb51vLZA14jcEQVCA1pfHptzEHFA93V5dYwbT',
  BONK: '8ihFLu5FimgTQ1Unh4dVyEHUGodJ5gJQCrQf4KUVB9bN',
  JUP: 'g6eRCbboSwK4tSWngn773RCMexr1APQr4uA9bGZBYfo',
  RAY: 'AnLf8tVYCM816gmBjiy8n53eXKKEDydT5piYjjQDPgTB',
  JTO: '7yyaeuJ1GGtVBLT2z2xub5ZWYKaNhF28mj1RdV4VDFVk',
};

// Price discrepancy threshold (percentage)
const DISCREPANCY_THRESHOLD_PERCENT = 1.0; // Alert if prices differ by more than 1%

// Audit record interface
export interface PriceAuditRecord {
  id: string;
  gameType: 'token_wars' | 'lds' | 'oracle';
  gameId: string;
  event: 'round_start' | 'round_end' | 'battle_start' | 'battle_end';
  symbol: string;
  backendPrice: number;
  pythPrice: number | null;
  pythConfidence: number | null;
  pythPublishTime: number | null;
  discrepancyPercent: number | null;
  flagged: boolean;
  timestamp: number;
}

// In-memory audit log (would be persisted to DB in production)
const auditLog: PriceAuditRecord[] = [];

// Pyth Hermes API response types
interface HermesPriceData {
  id: string;
  price: {
    price: string;
    conf: string;
    expo: number;
    publish_time: number;
  };
  ema_price: {
    price: string;
    conf: string;
    expo: number;
    publish_time: number;
  };
}

interface HermesResponse {
  parsed: HermesPriceData[];
}

class PythVerificationService {
  private connection: Connection | null = null;
  private initialized = false;

  constructor() {
    // Initialize connection for on-chain reads if needed
    const rpcUrl = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
    try {
      this.connection = new Connection(rpcUrl, 'confirmed');
      this.initialized = true;
      console.log('[PythVerification] Service initialized');
    } catch (error) {
      console.error('[PythVerification] Failed to initialize:', error);
    }
  }

  /**
   * Fetch current price from Pyth Hermes API
   */
  async getPythPrice(symbol: string): Promise<{ price: number; confidence: number; publishTime: number } | null> {
    const feedId = PYTH_FEED_IDS[symbol];
    if (!feedId) {
      console.warn(`[PythVerification] No feed ID for symbol: ${symbol}`);
      return null;
    }

    try {
      const url = `${PYTH_HERMES_URL}/api/latest_price_feeds?ids[]=${feedId}`;
      const response = await fetch(url);

      if (!response.ok) {
        console.error(`[PythVerification] Hermes API error: ${response.status}`);
        return null;
      }

      const data: HermesPriceData[] = await response.json();

      if (!data || data.length === 0) {
        console.warn(`[PythVerification] No price data for ${symbol}`);
        return null;
      }

      const priceData = data[0].price;
      const price = parseFloat(priceData.price) * Math.pow(10, priceData.expo);
      const confidence = parseFloat(priceData.conf) * Math.pow(10, priceData.expo);

      return {
        price,
        confidence,
        publishTime: priceData.publish_time,
      };
    } catch (error) {
      console.error(`[PythVerification] Failed to fetch Pyth price for ${symbol}:`, error);
      return null;
    }
  }

  /**
   * Fetch multiple prices at once (more efficient)
   */
  async getPythPrices(symbols: string[]): Promise<Map<string, { price: number; confidence: number; publishTime: number }>> {
    const results = new Map<string, { price: number; confidence: number; publishTime: number }>();

    const feedIds = symbols
      .map(s => PYTH_FEED_IDS[s])
      .filter(Boolean);

    if (feedIds.length === 0) return results;

    try {
      const idsParam = feedIds.map(id => `ids[]=${id}`).join('&');
      const url = `${PYTH_HERMES_URL}/api/latest_price_feeds?${idsParam}`;
      const response = await fetch(url);

      if (!response.ok) {
        console.error(`[PythVerification] Hermes API error: ${response.status}`);
        return results;
      }

      const data: HermesPriceData[] = await response.json();

      for (const item of data) {
        // Find symbol by feed ID
        const symbol = Object.entries(PYTH_FEED_IDS).find(([_, id]) => id === item.id)?.[0];
        if (symbol) {
          const priceData = item.price;
          results.set(symbol, {
            price: parseFloat(priceData.price) * Math.pow(10, priceData.expo),
            confidence: parseFloat(priceData.conf) * Math.pow(10, priceData.expo),
            publishTime: priceData.publish_time,
          });
        }
      }
    } catch (error) {
      console.error('[PythVerification] Failed to fetch Pyth prices:', error);
    }

    return results;
  }

  /**
   * Record a price audit with verification
   */
  async recordPriceAudit(
    gameType: PriceAuditRecord['gameType'],
    gameId: string,
    event: PriceAuditRecord['event'],
    symbol: string,
    backendPrice: number
  ): Promise<PriceAuditRecord> {
    const pythData = await this.getPythPrice(symbol);

    let discrepancyPercent: number | null = null;
    let flagged = false;

    if (pythData && pythData.price > 0 && backendPrice > 0) {
      discrepancyPercent = Math.abs((backendPrice - pythData.price) / pythData.price) * 100;
      flagged = discrepancyPercent > DISCREPANCY_THRESHOLD_PERCENT;

      if (flagged) {
        console.warn(
          `[PythVerification] PRICE DISCREPANCY: ${symbol} | Backend: $${backendPrice.toFixed(4)} | Pyth: $${pythData.price.toFixed(4)} | Diff: ${discrepancyPercent.toFixed(2)}%`
        );
      }
    }

    const record: PriceAuditRecord = {
      id: `${gameType}_${gameId}_${event}_${symbol}_${Date.now()}`,
      gameType,
      gameId,
      event,
      symbol,
      backendPrice,
      pythPrice: pythData?.price || null,
      pythConfidence: pythData?.confidence || null,
      pythPublishTime: pythData?.publishTime || null,
      discrepancyPercent,
      flagged,
      timestamp: Date.now(),
    };

    auditLog.push(record);

    // Keep audit log from growing too large (keep last 10000 records)
    if (auditLog.length > 10000) {
      auditLog.splice(0, auditLog.length - 10000);
    }

    console.log(
      `[PythVerification] ${gameType}/${gameId} ${event}: ${symbol} Backend=$${backendPrice.toFixed(4)} Pyth=$${pythData?.price?.toFixed(4) || 'N/A'}${flagged ? ' [FLAGGED]' : ''}`
    );

    return record;
  }

  /**
   * Record multiple price audits at once
   */
  async recordMultiplePriceAudits(
    gameType: PriceAuditRecord['gameType'],
    gameId: string,
    event: PriceAuditRecord['event'],
    prices: { symbol: string; backendPrice: number }[]
  ): Promise<PriceAuditRecord[]> {
    const symbols = prices.map(p => p.symbol);
    const pythPrices = await this.getPythPrices(symbols);
    const records: PriceAuditRecord[] = [];

    for (const { symbol, backendPrice } of prices) {
      const pythData = pythPrices.get(symbol);

      let discrepancyPercent: number | null = null;
      let flagged = false;

      if (pythData && pythData.price > 0 && backendPrice > 0) {
        discrepancyPercent = Math.abs((backendPrice - pythData.price) / pythData.price) * 100;
        flagged = discrepancyPercent > DISCREPANCY_THRESHOLD_PERCENT;

        if (flagged) {
          console.warn(
            `[PythVerification] PRICE DISCREPANCY: ${symbol} | Backend: $${backendPrice.toFixed(4)} | Pyth: $${pythData.price.toFixed(4)} | Diff: ${discrepancyPercent.toFixed(2)}%`
          );
        }
      }

      const record: PriceAuditRecord = {
        id: `${gameType}_${gameId}_${event}_${symbol}_${Date.now()}`,
        gameType,
        gameId,
        event,
        symbol,
        backendPrice,
        pythPrice: pythData?.price || null,
        pythConfidence: pythData?.confidence || null,
        pythPublishTime: pythData?.publishTime || null,
        discrepancyPercent,
        flagged,
        timestamp: Date.now(),
      };

      records.push(record);
      auditLog.push(record);
    }

    // Keep audit log from growing too large
    if (auditLog.length > 10000) {
      auditLog.splice(0, auditLog.length - 10000);
    }

    return records;
  }

  /**
   * Get audit records for a specific game
   */
  getAuditRecords(gameType?: string, gameId?: string, limit: number = 100): PriceAuditRecord[] {
    let records = [...auditLog];

    if (gameType) {
      records = records.filter(r => r.gameType === gameType);
    }
    if (gameId) {
      records = records.filter(r => r.gameId === gameId);
    }

    return records.slice(-limit).reverse();
  }

  /**
   * Get flagged discrepancies
   */
  getFlaggedRecords(limit: number = 50): PriceAuditRecord[] {
    return auditLog
      .filter(r => r.flagged)
      .slice(-limit)
      .reverse();
  }

  /**
   * Get verification summary for a game
   */
  getGameVerificationSummary(gameType: string, gameId: string): {
    totalRecords: number;
    flaggedRecords: number;
    averageDiscrepancy: number;
    records: PriceAuditRecord[];
  } {
    const records = auditLog.filter(r => r.gameType === gameType && r.gameId === gameId);
    const flaggedRecords = records.filter(r => r.flagged);

    const discrepancies = records
      .filter(r => r.discrepancyPercent !== null)
      .map(r => r.discrepancyPercent!);

    const averageDiscrepancy = discrepancies.length > 0
      ? discrepancies.reduce((a, b) => a + b, 0) / discrepancies.length
      : 0;

    return {
      totalRecords: records.length,
      flaggedRecords: flaggedRecords.length,
      averageDiscrepancy,
      records,
    };
  }

  /**
   * Check if a symbol is supported by Pyth
   */
  isSupported(symbol: string): boolean {
    return symbol in PYTH_FEED_IDS;
  }

  /**
   * Get supported symbols
   */
  getSupportedSymbols(): string[] {
    return Object.keys(PYTH_FEED_IDS);
  }
}

// Export singleton instance
export const pythVerificationService = new PythVerificationService();
