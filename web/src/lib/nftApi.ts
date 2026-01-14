import { NFTAsset } from '@/types';
import { BACKEND_URL } from '@/config/api';

export async function fetchWalletNFTs(walletAddress: string): Promise<NFTAsset[]> {
  // SECURITY: Validate wallet address format before sending to backend
  if (!walletAddress || !/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(walletAddress)) {
    console.error('[NFT API] Invalid wallet address format');
    return [];
  }

  try {
    // Use backend proxy to hide API key
    const response = await fetch(`${BACKEND_URL}/api/nfts/${walletAddress}`);

    if (!response.ok) {
      throw new Error(`NFT API error: ${response.status}`);
    }

    const data = await response.json();
    return data.nfts || [];
  } catch {
    return [];
  }
}

// Convert IPFS URLs to HTTP gateway
export function resolveImageUrl(url: string): string {
  if (!url) return '';

  if (url.startsWith('ipfs://')) {
    return url.replace('ipfs://', 'https://ipfs.io/ipfs/');
  }

  if (url.startsWith('ar://')) {
    return url.replace('ar://', 'https://arweave.net/');
  }

  return url;
}
