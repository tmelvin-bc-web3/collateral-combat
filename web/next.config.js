/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Security headers
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: https:",
              "font-src 'self' data:",
              "connect-src 'self' https://*.degendome.xyz https://api.devnet.solana.com https://api.mainnet-beta.solana.com wss://*.degendome.xyz https://price.jup.ag https://hermes.pyth.network",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join('; '),
          },
        ],
      },
    ];
  },
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
      // AWS S3 (scoped to known regions for NFT metadata)
      { protocol: 'https', hostname: '*.s3.us-east-1.amazonaws.com' },
      { protocol: 'https', hostname: '*.s3.us-east-2.amazonaws.com' },
      { protocol: 'https', hostname: '*.s3.us-west-2.amazonaws.com' },
      { protocol: 'https', hostname: '*.s3.amazonaws.com' },
      // Helius CDN
      { protocol: 'https', hostname: 'cdn.helius-rpc.com' },
      // CoinMarketCap CDN for token logos
      { protocol: 'https', hostname: 's2.coinmarketcap.com' },
      // UI Avatars for fallback token icons
      { protocol: 'https', hostname: 'ui-avatars.com' },
      // Unavatar for Twitter/X profile pictures
      { protocol: 'https', hostname: 'unavatar.io' },
    ],
  },
  turbopack: {
    root: __dirname,
  },
};

module.exports = nextConfig;
