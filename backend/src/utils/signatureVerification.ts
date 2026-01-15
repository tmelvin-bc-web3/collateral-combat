import { PublicKey } from '@solana/web3.js';
import nacl from 'tweetnacl';
import bs58 from 'bs58';

/**
 * Verify that a message was signed by the claimed wallet address
 *
 * @param walletAddress - The wallet address (base58)
 * @param message - The original message that was signed
 * @param signature - The signature (base58 encoded)
 * @returns true if signature is valid, false otherwise
 */
export function verifySignature(
  walletAddress: string,
  message: string,
  signature: string
): boolean {
  try {
    const publicKey = new PublicKey(walletAddress);
    const messageBytes = new TextEncoder().encode(message);
    const signatureBytes = bs58.decode(signature);

    return nacl.sign.detached.verify(
      messageBytes,
      signatureBytes,
      publicKey.toBytes()
    );
  } catch (error) {
    console.error('[SignatureVerification] Error verifying signature:', error);
    return false;
  }
}

/**
 * Generate a share verification message
 * This message must be signed by the wallet to prove ownership
 *
 * @param walletAddress - The wallet address
 * @param roundId - The round/game ID being shared
 * @param timestamp - Unix timestamp (ms) - used to prevent replay attacks
 * @returns The message to be signed
 */
export function generateShareMessage(
  walletAddress: string,
  roundId: string,
  timestamp: number
): string {
  return `DegenDome Share Verification\n\nWallet: ${walletAddress}\nRound: ${roundId}\nTimestamp: ${timestamp}`;
}

/**
 * Verify a share signature with timestamp validation
 *
 * @param walletAddress - The wallet address
 * @param roundId - The round/game ID
 * @param timestamp - The timestamp from the message
 * @param signature - The signature
 * @param maxAgeMs - Maximum age of the signature in milliseconds (default 5 minutes)
 * @returns Object with valid status and error message if invalid
 */
export function verifyShareSignature(
  walletAddress: string,
  roundId: string,
  timestamp: number,
  signature: string,
  maxAgeMs: number = 5 * 60 * 1000 // 5 minutes
): { valid: boolean; error?: string } {
  // Check timestamp is not too old
  const now = Date.now();
  if (now - timestamp > maxAgeMs) {
    return { valid: false, error: 'Signature expired' };
  }

  // Check timestamp is not in the future (with small tolerance)
  if (timestamp > now + 60000) {
    return { valid: false, error: 'Invalid timestamp' };
  }

  // Generate the expected message
  const message = generateShareMessage(walletAddress, roundId, timestamp);

  // Verify the signature
  const isValid = verifySignature(walletAddress, message, signature);
  if (!isValid) {
    return { valid: false, error: 'Invalid signature' };
  }

  return { valid: true };
}
