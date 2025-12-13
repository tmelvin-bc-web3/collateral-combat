import { NFTAsset } from '@/types';

const HELIUS_API_KEY = process.env.NEXT_PUBLIC_HELIUS_API_KEY;
const HELIUS_RPC_URL = HELIUS_API_KEY
  ? `https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`
  : null;

interface HeliusAsset {
  id: string;
  content: {
    metadata?: {
      name?: string;
    };
    links?: {
      image?: string;
    };
    files?: Array<{
      uri?: string;
      cdn_uri?: string;
      mime?: string;
    }>;
  };
  grouping?: Array<{
    group_key: string;
    group_value: string;
  }>;
}

interface GetAssetsByOwnerResponse {
  result: {
    items: HeliusAsset[];
    total: number;
  };
}

export async function fetchWalletNFTs(walletAddress: string): Promise<NFTAsset[]> {
  if (!HELIUS_RPC_URL) {
    return [];
  }

  try {
    const response = await fetch(HELIUS_RPC_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 'my-id',
        method: 'getAssetsByOwner',
        params: {
          ownerAddress: walletAddress,
          page: 1,
          limit: 100,
          displayOptions: {
            showCollectionMetadata: true,
          },
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Helius API error: ${response.status}`);
    }

    const data: GetAssetsByOwnerResponse = await response.json();

    if (!data.result?.items) {
      return [];
    }

    // Filter and map to our NFTAsset type
    const nfts: NFTAsset[] = data.result.items
      .filter((asset) => {
        // Only include NFTs with images
        const hasImage =
          asset.content?.links?.image ||
          asset.content?.files?.some((f) => f.mime?.startsWith('image/'));
        return hasImage;
      })
      .map((asset) => {
        // Get image URL (prefer CDN)
        let image = asset.content?.links?.image || '';
        const imageFile = asset.content?.files?.find((f) =>
          f.mime?.startsWith('image/')
        );
        if (imageFile?.cdn_uri) {
          image = imageFile.cdn_uri;
        } else if (imageFile?.uri) {
          image = imageFile.uri;
        }

        // Get collection name
        const collectionGroup = asset.grouping?.find(
          (g) => g.group_key === 'collection'
        );

        return {
          mint: asset.id,
          name: asset.content?.metadata?.name || 'Unknown NFT',
          image,
          collection: collectionGroup?.group_value,
        };
      });

    return nfts;
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
