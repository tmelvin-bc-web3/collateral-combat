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
  {
    id: 'fartcoin',
    name: 'Fartcoin',
    category: 'solana',
    image: CMC_IMG(33597), // FARTCOIN
  },
  {
    id: 'goat',
    name: 'GOAT',
    category: 'solana',
    image: CMC_IMG(33440), // Goatseus Maximus
  },
  {
    id: 'mew',
    name: 'MEW',
    category: 'solana',
    image: CMC_IMG(30126), // cat in a dogs world
  },
  {
    id: 'pengu',
    name: 'Pengu',
    category: 'solana',
    image: CMC_IMG(34466), // Pudgy Penguins
  },
  {
    id: 'ponke',
    name: 'Ponke',
    category: 'solana',
    image: CMC_IMG(29150), // PONKE
  },
  {
    id: 'trump',
    name: 'TRUMP',
    category: 'solana',
    image: CMC_IMG(35336), // Official Trump
  },
  {
    id: 'turbo',
    name: 'Turbo',
    category: 'solana',
    image: CMC_IMG(24911), // TURBO
  },
  {
    id: 'myro',
    name: 'Myro',
    category: 'solana',
    image: CMC_IMG(28309), // MYRO
  },
  {
    id: 'bome',
    name: 'BOME',
    category: 'solana',
    image: CMC_IMG(29870), // Book of Meme
  },
{
    id: 'spx6900',
    name: 'SPX6900',
    category: 'solana',
    image: CMC_IMG(28621), // SPX6900
  },
  {
    id: 'ai16z',
    name: 'ai16z',
    category: 'solana',
    image: CMC_IMG(34026), // AI16Z
  },
  {
    id: 'slerf',
    name: 'SLERF',
    category: 'solana',
    image: CMC_IMG(37758), // SLERF
  },
  {
    id: 'samo',
    name: 'Samo',
    category: 'solana',
    image: CMC_IMG(9721), // Samoyedcoin
  },
  {
    id: 'wen',
    name: 'WEN',
    category: 'solana',
    image: CMC_IMG(25256), // WEN
  },
  {
    id: 'mother',
    name: 'MOTHER',
    category: 'solana',
    image: CMC_IMG(31510), // Mother Iggy
  },
  {
    id: 'neiro',
    name: 'Neiro',
    category: 'solana',
    image: CMC_IMG(32521), // NEIRO
  },
  {
    id: 'retardio',
    name: 'Retardio',
    category: 'solana',
    image: CMC_IMG(31921), // RETARDIO
  },
  {
    id: 'daddy',
    name: 'DADDY',
    category: 'solana',
    image: CMC_IMG(31830), // Daddy Tate
  },
  {
    id: 'griffain',
    name: 'Griffain',
    category: 'solana',
    image: CMC_IMG(34792), // GRIFFAIN
  },
  {
    id: 'pippin',
    name: 'Pippin',
    category: 'solana',
    image: CMC_IMG(35053), // PIPPIN
  },
  {
    id: 'michi',
    name: 'Michi',
    category: 'solana',
    image: CMC_IMG(30943), // michi
  },
  {
    id: 'doggo',
    name: 'DOGGO',
    category: 'solana',
    image: CMC_IMG(33095), // DOGGO
  },

  // Crypto classic memes
  {
    id: 'doge',
    name: 'Doge',
    category: 'crypto',
    image: CMC_IMG(74), // DOGE
  },
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

  // Degen culture
  {
    id: 'laser-eyes',
    name: 'Laser Eyes',
    category: 'degen',
    image: '/pfp/laser-eyes.svg',
  },
  {
    id: 'diamond-hands',
    name: 'Diamond Hands',
    category: 'degen',
    image: '/pfp/diamond-hands.svg',
  },
  {
    id: 'spartan',
    name: 'Degen Spartan',
    category: 'degen',
    image: '/pfp/spartan.svg',
  },
  {
    id: 'skull',
    name: 'Skull',
    category: 'degen',
    image: '/pfp/skull.svg',
  },
  {
    id: 'npc',
    name: 'NPC',
    category: 'degen',
    image: '/pfp/npc.svg',
  },
  {
    id: 'ape',
    name: 'Ape In',
    category: 'degen',
    image: '/pfp/ape.svg',
  },
  {
    id: 'clown',
    name: 'Clown',
    category: 'degen',
    image: '/pfp/clown.svg',
  },
  {
    id: 'gm-sunrise',
    name: 'GM',
    category: 'degen',
    image: '/pfp/gm-sunrise.svg',
  },
  {
    id: 'rug-pull',
    name: 'REKT',
    category: 'degen',
    image: '/pfp/rug-pull.svg',
  },
  {
    id: 'moon',
    name: 'To The Moon',
    category: 'degen',
    image: '/pfp/moon.svg',
  },
  {
    id: 'gigabrain',
    name: 'Gigabrain',
    category: 'degen',
    image: '/pfp/gigabrain.svg',
  },
  {
    id: 'wagmi',
    name: 'WAGMI',
    category: 'degen',
    image: '/pfp/wagmi.svg',
  },
  {
    id: 'ngmi',
    name: 'NGMI',
    category: 'degen',
    image: '/pfp/ngmi.svg',
  },
];

export function getPresetById(id: string): PresetPFP | undefined {
  return PRESET_PFPS.find(p => p.id === id);
}

export function getPresetsByCategory(category: 'solana' | 'crypto' | 'degen'): PresetPFP[] {
  return PRESET_PFPS.filter(p => p.category === category);
}
