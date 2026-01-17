// Token logo configuration using CoinGecko CDN
// These are the tokens available in Token Wars battles

export interface TokenConfig {
  symbol: string;
  name: string;
  logo: string;
  color: string; // Brand color for the token
  coingeckoId: string;
}

// CoinGecko CDN base URL
const COINGECKO_CDN = 'https://assets.coingecko.com/coins/images';

export const TOKEN_CONFIGS: Record<string, TokenConfig> = {
  BTC: {
    symbol: 'BTC',
    name: 'Bitcoin',
    logo: `${COINGECKO_CDN}/1/large/bitcoin.png`,
    color: '#F7931A',
    coingeckoId: 'bitcoin',
  },
  ETH: {
    symbol: 'ETH',
    name: 'Ethereum',
    logo: `${COINGECKO_CDN}/279/large/ethereum.png`,
    color: '#627EEA',
    coingeckoId: 'ethereum',
  },
  SOL: {
    symbol: 'SOL',
    name: 'Solana',
    logo: `${COINGECKO_CDN}/4128/large/solana.png`,
    color: '#9945FF',
    coingeckoId: 'solana',
  },
  WIF: {
    symbol: 'WIF',
    name: 'dogwifhat',
    logo: `${COINGECKO_CDN}/33566/large/dogwifhat.jpg`,
    color: '#C4A484',
    coingeckoId: 'dogwifcoin',
  },
  BONK: {
    symbol: 'BONK',
    name: 'Bonk',
    logo: `${COINGECKO_CDN}/28600/large/bonk.jpg`,
    color: '#FF6B35',
    coingeckoId: 'bonk',
  },
  JUP: {
    symbol: 'JUP',
    name: 'Jupiter',
    logo: `${COINGECKO_CDN}/34188/large/jup.png`,
    color: '#19FB9B',
    coingeckoId: 'jupiter-exchange-solana',
  },
  RAY: {
    symbol: 'RAY',
    name: 'Raydium',
    logo: `${COINGECKO_CDN}/13928/large/PSigc4ie_400x400.jpg`,
    color: '#5AC4BE',
    coingeckoId: 'raydium',
  },
  JTO: {
    symbol: 'JTO',
    name: 'Jito',
    logo: `${COINGECKO_CDN}/33228/large/jto.png`,
    color: '#6B5DE3',
    coingeckoId: 'jito-governance-token',
  },
  // Memecoins
  PONKE: {
    symbol: 'PONKE',
    name: 'Ponke',
    logo: `${COINGECKO_CDN}/34084/large/ponke.png`,
    color: '#FFD700',
    coingeckoId: 'ponke',
  },
  PENGU: {
    symbol: 'PENGU',
    name: 'Pudgy Penguins',
    logo: `${COINGECKO_CDN}/52138/large/pudgy.jpg`,
    color: '#87CEEB',
    coingeckoId: 'pudgy-penguins',
  },
  TURBO: {
    symbol: 'TURBO',
    name: 'Turbo',
    logo: `${COINGECKO_CDN}/30382/large/turbo.png`,
    color: '#00D4FF',
    coingeckoId: 'turbo',
  },
  POPCAT: {
    symbol: 'POPCAT',
    name: 'Popcat',
    logo: `${COINGECKO_CDN}/36426/large/popcat.png`,
    color: '#FF69B4',
    coingeckoId: 'popcat',
  },
  FARTCOIN: {
    symbol: 'FARTCOIN',
    name: 'Fartcoin',
    logo: `${COINGECKO_CDN}/52517/large/fartcoin.jpg`,
    color: '#90EE90',
    coingeckoId: 'fartcoin',
  },
  MEW: {
    symbol: 'MEW',
    name: 'cat in a dogs world',
    logo: `${COINGECKO_CDN}/35823/large/mew.png`,
    color: '#FFA500',
    coingeckoId: 'cat-in-a-dogs-world',
  },
  PNUT: {
    symbol: 'PNUT',
    name: 'Peanut the Squirrel',
    logo: `${COINGECKO_CDN}/52573/large/pnut.jpg`,
    color: '#DEB887',
    coingeckoId: 'peanut-the-squirrel',
  },
  GOAT: {
    symbol: 'GOAT',
    name: 'Goatseus Maximus',
    logo: `${COINGECKO_CDN}/51090/large/goat.jpg`,
    color: '#8B4513',
    coingeckoId: 'goatseus-maximus',
  },
};

// Get token config by symbol (case-insensitive)
export function getTokenConfig(symbol: string): TokenConfig | undefined {
  return TOKEN_CONFIGS[symbol.toUpperCase()];
}

// Get token logo URL with fallback
export function getTokenLogo(symbol: string): string {
  const config = getTokenConfig(symbol);
  if (config) return config.logo;
  // Fallback to a generic crypto icon
  return `https://ui-avatars.com/api/?name=${symbol}&background=1a1a2e&color=fff&size=128&bold=true`;
}

// Get token color with fallback
export function getTokenColor(symbol: string): string {
  const config = getTokenConfig(symbol);
  return config?.color || '#888888';
}
