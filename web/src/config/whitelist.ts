// Whitelisted wallet addresses that can bypass coming soon mode
// Add wallet addresses here to grant early access

export const WHITELISTED_WALLETS: string[] = [
  // Add wallet addresses here (one per line)
  'GxjjUmgTR9uR63b1xgmnv5RweZgLu3FKrLspY9pCZdEN', // Tayler
];

// Check if a wallet is whitelisted
export function isWhitelisted(walletAddress: string | null | undefined): boolean {
  if (!walletAddress) return false;
  return WHITELISTED_WALLETS.some(
    (addr) => addr.toLowerCase() === walletAddress.toLowerCase()
  );
}
