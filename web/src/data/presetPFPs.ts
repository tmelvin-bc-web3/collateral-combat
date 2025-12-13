import { PresetPFP } from '@/types';

// Using CoinMarketCap CDN for token images (200x200 for better quality)
const CMC_IMG = (id: number) => `https://s2.coinmarketcap.com/static/img/coins/200x200/${id}.png`;

export const PRESET_PFPS: PresetPFP[] = [
  // Solana memes
  {
    id: 'bonk',
    name: 'Bonk',
    category: 'solana',
    image: CMC_IMG(23095), // BONK
  },
  {
    id: 'dogwifhat',
    name: 'Dogwifhat',
    category: 'solana',
    image: CMC_IMG(28752), // WIF
  },
  {
    id: 'popcat',
    name: 'Popcat',
    category: 'solana',
    image: CMC_IMG(28782), // POPCAT
  },
  {
    id: 'gigachad',
    name: 'Gigachad',
    category: 'solana',
    image: CMC_IMG(30063), // GIGA
  },
  {
    id: 'pnut',
    name: 'Peanut',
    category: 'solana',
    image: CMC_IMG(33788), // PNUT
  },

  // Crypto classic memes
  {
    id: 'pepe',
    name: 'Pepe',
    category: 'crypto',
    image: CMC_IMG(24478), // PEPE
  },
  {
    id: 'wojak',
    name: 'Wojak',
    category: 'crypto',
    image: CMC_IMG(24502), // WOJAK
  },
  {
    id: 'bobo',
    name: 'Bobo',
    category: 'crypto',
    image: CMC_IMG(25269), // BOBO
  },
  {
    id: 'brett',
    name: 'Brett',
    category: 'crypto',
    image: CMC_IMG(29743), // BRETT
  },
  {
    id: 'mog',
    name: 'Mog',
    category: 'crypto',
    image: CMC_IMG(27659), // MOG
  },
  {
    id: 'floki',
    name: 'Floki',
    category: 'crypto',
    image: CMC_IMG(10804), // FLOKI
  },
  {
    id: 'shib',
    name: 'Shiba',
    category: 'crypto',
    image: CMC_IMG(5994), // SHIB
  },
];

export function getPresetById(id: string): PresetPFP | undefined {
  return PRESET_PFPS.find(p => p.id === id);
}

export function getPresetsByCategory(category: 'solana' | 'crypto'): PresetPFP[] {
  return PRESET_PFPS.filter(p => p.category === category);
}
