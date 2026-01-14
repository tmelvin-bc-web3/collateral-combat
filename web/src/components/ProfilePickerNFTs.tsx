'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useWallet } from '@solana/wallet-adapter-react';
import { NFTAsset } from '@/types';
import { fetchWalletNFTs, resolveImageUrl } from '@/lib/nftApi';

interface ProfilePickerNFTsProps {
  selectedMint: string | null;
  onSelect: (nft: NFTAsset) => void;
}

export function ProfilePickerNFTs({
  selectedMint,
  onSelect,
}: ProfilePickerNFTsProps) {
  const { publicKey } = useWallet();
  const [nfts, setNfts] = useState<NFTAsset[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!publicKey) return;

    const loadNFTs = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const walletNFTs = await fetchWalletNFTs(publicKey.toBase58());
        setNfts(walletNFTs);
      } catch {
        setError('Failed to load NFTs');
      } finally {
        setIsLoading(false);
      }
    };

    loadNFTs();
  }, [publicKey]);

  if (!publicKey) {
    return (
      <div className="py-8 text-center">
        <p className="text-text-tertiary">Connect wallet to see your NFTs</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="py-8 text-center">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-text-tertiary">Loading your NFTs...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-8 text-center">
        <p className="text-danger mb-2">{error}</p>
        <p className="text-sm text-text-tertiary">
          Please try again later
        </p>
      </div>
    );
  }

  if (nfts.length === 0) {
    return (
      <div className="py-8 text-center">
        <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-bg-tertiary flex items-center justify-center">
          <svg
            className="w-6 h-6 text-text-tertiary"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
        </div>
        <p className="text-text-secondary font-medium">No NFTs Found</p>
        <p className="text-sm text-text-tertiary mt-1">
          You don't have any NFTs in this wallet
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-4 gap-3 max-h-64 overflow-y-auto">
      {nfts.map((nft) => (
        <button
          key={nft.mint}
          onClick={() => onSelect(nft)}
          className={`relative aspect-square rounded-xl overflow-hidden transition-all ${
            selectedMint === nft.mint
              ? 'ring-2 ring-accent ring-offset-2 ring-offset-bg-primary'
              : 'hover:ring-2 hover:ring-border-primary'
          }`}
          title={nft.name}
        >
          <Image
            src={resolveImageUrl(nft.image)}
            alt={nft.name}
            fill
            className="object-cover"
            unoptimized
          />
          {selectedMint === nft.mint && (
            <div className="absolute inset-0 bg-accent/20 flex items-center justify-center">
              <svg
                className="w-6 h-6 text-accent"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={3}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
          )}
        </button>
      ))}
    </div>
  );
}
