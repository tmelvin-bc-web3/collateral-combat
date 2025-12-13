// Asset configuration with CoinMarketCap images
export const ASSETS = [
  {
    symbol: 'SOL',
    name: 'Solana',
    image: 'https://s2.coinmarketcap.com/static/img/coins/64x64/5426.png',
    color: 'from-purple-500 to-blue-500',
  },
  {
    symbol: 'BTC',
    name: 'Bitcoin',
    image: 'https://s2.coinmarketcap.com/static/img/coins/64x64/1.png',
    color: 'from-orange-500 to-yellow-500',
  },
  {
    symbol: 'ETH',
    name: 'Ethereum',
    image: 'https://s2.coinmarketcap.com/static/img/coins/64x64/1027.png',
    color: 'from-blue-400 to-purple-500',
  },
  {
    symbol: 'WIF',
    name: 'dogwifhat',
    image: 'https://s2.coinmarketcap.com/static/img/coins/64x64/28752.png',
    color: 'from-amber-400 to-orange-500',
  },
  {
    symbol: 'BONK',
    name: 'Bonk',
    image: 'https://s2.coinmarketcap.com/static/img/coins/64x64/23095.png',
    color: 'from-yellow-400 to-orange-400',
  },
] as const;

export type AssetSymbol = typeof ASSETS[number]['symbol'];

export const getAsset = (symbol: string) => {
  return ASSETS.find(a => a.symbol === symbol);
};

export const getAssetImage = (symbol: string) => {
  return getAsset(symbol)?.image || '';
};

export const getAssetColor = (symbol: string) => {
  return getAsset(symbol)?.color || 'from-gray-500 to-gray-600';
};
