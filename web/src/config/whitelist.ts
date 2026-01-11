// Whitelisted wallet addresses that can bypass coming soon mode
// Add wallet addresses here to grant early access

export const WHITELISTED_WALLETS: string[] = [
  // Add your wallet addresses here (one per line)
  // Example: 'YourWalletAddressHere123456789abcdefghijk'
];

// Check if a wallet is whitelisted
export function isWhitelisted(walletAddress: string | null | undefined): boolean {
  if (!walletAddress) return false;
  return WHITELISTED_WALLETS.some(
    (addr) => addr.toLowerCase() === walletAddress.toLowerCase()
  );
}
