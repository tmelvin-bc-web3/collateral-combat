'use client';

import Image from 'next/image';
import { getAsset } from '@/lib/assets';

interface AssetIconProps {
  symbol: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showFallback?: boolean;
}

const sizeMap = {
  sm: 20,
  md: 28,
  lg: 36,
  xl: 48,
};

const sizeClassMap = {
  sm: 'w-5 h-5',
  md: 'w-7 h-7',
  lg: 'w-9 h-9',
  xl: 'w-12 h-12',
};

export function AssetIcon({ symbol, size = 'md', className = '', showFallback = true }: AssetIconProps) {
  const asset = getAsset(symbol);
  const pixelSize = sizeMap[size];
  const sizeClass = sizeClassMap[size];

  if (!asset) {
    if (showFallback) {
      return (
        <div className={`${sizeClass} rounded-full bg-bg-tertiary flex items-center justify-center text-text-tertiary font-bold text-xs ${className}`}>
          {symbol.slice(0, 2)}
        </div>
      );
    }
    return null;
  }

  return (
    <div className={`${sizeClass} relative rounded-full overflow-hidden ${className}`}>
      <Image
        src={asset.image}
        alt={asset.name}
        width={pixelSize}
        height={pixelSize}
        className="object-cover"
        unoptimized // External images from CoinMarketCap
      />
    </div>
  );
}
