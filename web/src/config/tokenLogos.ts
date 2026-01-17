// Token logo configuration using local assets
// Images stored in /public/tokens/ for fast loading

export interface TokenConfig {
  symbol: string;
  name: string;
  logo: string;
  color: string; // Brand color for the token
}

export const TOKEN_CONFIGS: Record<string, TokenConfig> = {
  // Memecoins (used in Token Wars)
  WIF: {
    symbol: 'WIF',
    name: 'dogwifhat',
    logo: '/tokens/wif.png',
    color: '#C4A484',
  },
  BONK: {
    symbol: 'BONK',
    name: 'Bonk',
    logo: '/tokens/bonk.png',
    color: '#FF6B35',
  },
  PONKE: {
    symbol: 'PONKE',
    name: 'Ponke',
    logo: '/tokens/ponke.png',
    color: '#FFD700',
  },
  PENGU: {
    symbol: 'PENGU',
    name: 'Pudgy Penguins',
    logo: '/tokens/pengu.png',
    color: '#87CEEB',
  },
  TURBO: {
    symbol: 'TURBO',
    name: 'Turbo',
    logo: '/tokens/turbo.png',
    color: '#00D4FF',
  },
  POPCAT: {
    symbol: 'POPCAT',
    name: 'Popcat',
    logo: '/tokens/popcat.png',
    color: '#FF69B4',
  },
  FARTCOIN: {
    symbol: 'FARTCOIN',
    name: 'Fartcoin',
    logo: '/tokens/fartcoin.png',
    color: '#90EE90',
  },
  MEW: {
    symbol: 'MEW',
    name: 'cat in a dogs world',
    logo: '/tokens/mew.png',
    color: '#FFA500',
  },
  PNUT: {
    symbol: 'PNUT',
    name: 'Peanut the Squirrel',
    logo: '/tokens/pnut.png',
    color: '#DEB887',
  },
  GOAT: {
    symbol: 'GOAT',
    name: 'Goatseus Maximus',
    logo: '/tokens/goat.png',
    color: '#8B4513',
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
