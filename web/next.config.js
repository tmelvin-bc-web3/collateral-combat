/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    // SECURITY: Whitelist known safe image domains for NFT images
    remotePatterns: [
      // IPFS gateways
      { protocol: 'https', hostname: 'ipfs.io' },
      { protocol: 'https', hostname: 'cloudflare-ipfs.com' },
      { protocol: 'https', hostname: 'gateway.pinata.cloud' },
      { protocol: 'https', hostname: 'nftstorage.link' },
      { protocol: 'https', hostname: '*.ipfs.nftstorage.link' },
      { protocol: 'https', hostname: 'ipfs.infura.io' },
      // Arweave
      { protocol: 'https', hostname: 'arweave.net' },
      { protocol: 'https', hostname: '*.arweave.net' },
      // Solana NFT CDNs
      { protocol: 'https', hostname: 'metadata.degods.com' },
      { protocol: 'https', hostname: 'bafybeihazpt6pkm4azgtupdz7hc2j3a767rdgk23gutn56mfqvi7ta77h4.ipfs.nftstorage.link' },
      { protocol: 'https', hostname: 'shdw-drive.genesysgo.net' },
      { protocol: 'https', hostname: 'madlads.s3.us-west-2.amazonaws.com' },
      { protocol: 'https', hostname: 'img-cdn.magiceden.dev' },
      { protocol: 'https', hostname: 'creator-hub-prod.s3.us-east-2.amazonaws.com' },
      // AWS S3 (common for NFT metadata)
      { protocol: 'https', hostname: '*.amazonaws.com' },
      // Helius CDN
      { protocol: 'https', hostname: 'cdn.helius-rpc.com' },
    ],
  },
  turbopack: {
    root: __dirname,
  },
};

module.exports = nextConfig;
