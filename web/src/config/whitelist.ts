// Whitelisted wallet addresses that can bypass coming soon mode
// SECURITY: Wallets are loaded from environment variable to avoid exposing addresses in source code
// Set NEXT_PUBLIC_WHITELISTED_WALLETS as a comma-separated list of wallet addresses

const parseWhitelistedWallets = (): string[] => {
  const envWallets = process.env.NEXT_PUBLIC_WHITELISTED_WALLETS;
  if (!envWallets) return [];

  return envWallets
    .split(',')
    .map((addr) => addr.trim())
    .filter((addr) => addr.length > 0);
};

export const WHITELISTED_WALLETS: string[] = parseWhitelistedWallets();

// Check if a wallet is whitelisted
export function isWhitelisted(walletAddress: string | null | undefined): boolean {
  if (!walletAddress) return false;
  return WHITELISTED_WALLETS.some(
    (addr) => addr.toLowerCase() === walletAddress.toLowerCase()
  );
}
