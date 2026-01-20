// Whitelisted wallet addresses that can bypass coming soon mode
// Wallets can be added via environment variable OR hardcoded below
// Set NEXT_PUBLIC_WHITELISTED_WALLETS as a comma-separated list for additional wallets

// Hardcoded admin/team wallets
const HARDCODED_WALLETS: string[] = [
  'GxjjUmgTR9uR63b1xgmnv5RweZgLu3FKrLspY9pCZdEN', // Tayler
  'CythzC1okU4p8on7FzQDCrrHXBzRvdiqite2UjauNE2W',
  '37ZQx6QbmxX93VhSLDNUzmusDvtBcA3G5xHQFqoLpp7r',
  'Fqczgf9KfSVXtMtXccq6SE1yBfWeUXefJ3ithStptTUa',
  '82RHm6tsGXtiZ8zjymT6D3dmoaMCikdKP4agN67BcRkY',
  'ATajJu4rmqNZSmr45QG94sCxDM4dMc7Xoq6a1BuKmFUq',
  '3Qm9P7RV8AKxD5M7uHXZ23ztNWLg5kneBBBWUKNnUGEx',
];

const parseWhitelistedWallets = (): string[] => {
  const envWallets = process.env.NEXT_PUBLIC_WHITELISTED_WALLETS;
  if (!envWallets) return HARDCODED_WALLETS;

  const envList = envWallets
    .split(',')
    .map((addr) => addr.trim())
    .filter((addr) => addr.length > 0);

  // Combine hardcoded + env wallets, removing duplicates
  return [...new Set([...HARDCODED_WALLETS, ...envList])];
};

export const WHITELISTED_WALLETS: string[] = parseWhitelistedWallets();

// Check if a wallet is whitelisted
export function isWhitelisted(walletAddress: string | null | undefined): boolean {
  if (!walletAddress) return false;
  return WHITELISTED_WALLETS.some(
    (addr) => addr.toLowerCase() === walletAddress.toLowerCase()
  );
}
