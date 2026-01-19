import { NextRequest, NextResponse } from 'next/server';
import { WHITELISTED_WALLETS } from '@/config/whitelist';
import { PublicKey } from '@solana/web3.js';
import bs58 from 'bs58';
import crypto from 'crypto';
import nacl from 'tweetnacl';

// Secret for signing tokens - MUST be set in production
const WHITELIST_SECRET = process.env.WHITELIST_SECRET || 'dev-secret-change-in-production';

// Token expiry: 24 hours
const TOKEN_EXPIRY_MS = 24 * 60 * 60 * 1000;

/**
 * Generate a signed whitelist access token
 * Format: wallet:timestamp:signature
 */
function generateSignedToken(walletAddress: string): string {
  const timestamp = Date.now().toString();
  const data = `${walletAddress}:${timestamp}`;
  const signature = crypto
    .createHmac('sha256', WHITELIST_SECRET)
    .update(data)
    .digest('hex');
  return `${walletAddress}:${timestamp}:${signature}`;
}

/**
 * Verify a signed whitelist access token
 */
export function verifySignedToken(token: string): { valid: boolean; wallet?: string } {
  try {
    const parts = token.split(':');
    if (parts.length !== 3) {
      return { valid: false };
    }

    const [wallet, timestamp, signature] = parts;

    // Check if token has expired
    const tokenTime = parseInt(timestamp, 10);
    if (isNaN(tokenTime) || Date.now() - tokenTime > TOKEN_EXPIRY_MS) {
      return { valid: false };
    }

    // Verify signature
    const data = `${wallet}:${timestamp}`;
    const expectedSignature = crypto
      .createHmac('sha256', WHITELIST_SECRET)
      .update(data)
      .digest('hex');

    if (signature !== expectedSignature) {
      return { valid: false };
    }

    // Verify wallet is still whitelisted
    const isWhitelisted = WHITELISTED_WALLETS.some(
      (addr) => addr.toLowerCase() === wallet.toLowerCase()
    );
    if (!isWhitelisted) {
      return { valid: false };
    }

    return { valid: true, wallet };
  } catch {
    return { valid: false };
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { walletAddress, signature, message, timestamp } = body;

    // Validate required fields
    if (!walletAddress || !signature || !message || !timestamp) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if wallet is whitelisted
    const isWhitelisted = WHITELISTED_WALLETS.some(
      (addr) => addr.toLowerCase() === walletAddress.toLowerCase()
    );

    if (!isWhitelisted) {
      return NextResponse.json(
        { error: 'Wallet not whitelisted' },
        { status: 403 }
      );
    }

    // Verify the signature is recent (within 5 minutes)
    const signatureTime = parseInt(timestamp, 10);
    if (isNaN(signatureTime) || Date.now() - signatureTime > 5 * 60 * 1000) {
      return NextResponse.json(
        { error: 'Signature expired' },
        { status: 400 }
      );
    }

    // Verify the expected message format
    const expectedMessage = `DegenDome:whitelist:${timestamp}`;
    if (message !== expectedMessage) {
      return NextResponse.json(
        { error: 'Invalid message format' },
        { status: 400 }
      );
    }

    // Verify the wallet signature
    try {
      const messageBytes = new TextEncoder().encode(message);
      const signatureBytes = bs58.decode(signature);
      const publicKeyBytes = bs58.decode(walletAddress);

      const isValid = nacl.sign.detached.verify(
        messageBytes,
        signatureBytes,
        publicKeyBytes
      );

      if (!isValid) {
        return NextResponse.json(
          { error: 'Invalid signature' },
          { status: 401 }
        );
      }
    } catch {
      return NextResponse.json(
        { error: 'Signature verification failed' },
        { status: 401 }
      );
    }

    // Generate signed token
    const signedToken = generateSignedToken(walletAddress);

    // Create response with HTTP-only cookie
    const response = NextResponse.json({
      success: true,
      message: 'Access granted',
    });

    // Set secure HTTP-only cookie
    response.cookies.set('whitelist_access', signedToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 86400, // 24 hours
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Whitelist verification error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
