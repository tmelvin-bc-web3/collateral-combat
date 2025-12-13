import { Asset } from './types';

// Available assets for perp trading
export const TRADABLE_ASSETS: Asset[] = [
  { symbol: 'SOL', name: 'Solana' },
  { symbol: 'BTC', name: 'Bitcoin' },
  { symbol: 'ETH', name: 'Ethereum' },
  { symbol: 'WIF', name: 'dogwifhat' },
  { symbol: 'BONK', name: 'Bonk' },
  { symbol: 'JUP', name: 'Jupiter' },
  { symbol: 'RAY', name: 'Raydium' },
  { symbol: 'JTO', name: 'Jito' },
];

// Quick lookup by symbol
export const ASSET_BY_SYMBOL: Record<string, Asset> = TRADABLE_ASSETS.reduce((acc, asset) => {
  acc[asset.symbol] = asset;
  return acc;
}, {} as Record<string, Asset>);

export function isValidAsset(symbol: string): boolean {
  return symbol in ASSET_BY_SYMBOL;
}

export function getAsset(symbol: string): Asset | undefined {
  return ASSET_BY_SYMBOL[symbol];
}

// Legacy exports for compatibility
export const WHITELISTED_TOKENS = TRADABLE_ASSETS;
export const TOKEN_BY_SYMBOL = ASSET_BY_SYMBOL;
export function getToken(symbol: string) {
  return getAsset(symbol);
}
