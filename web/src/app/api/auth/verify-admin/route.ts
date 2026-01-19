import { NextRequest, NextResponse } from 'next/server';
import nacl from 'tweetnacl';
import bs58 from 'bs58';

// ADMIN_WALLETS is server-side only - NOT exposed to browser
// Set this in Vercel environment variables (without NEXT_PUBLIC_ prefix)
const ADMIN_WALLETS = process.env.ADMIN_WALLETS?.split(',').map(w => w.trim().toLowerCase()) || [];

export async function POST(request: NextRequest) {
  try {
    // If no admin wallets configured, deny all
    if (ADMIN_WALLETS.length === 0) {
      return NextResponse.json(
        { error: 'Admin access not configured' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { walletAddress, signature, timestamp } = body;

    // Validate required fields
    if (!walletAddress || !signature || !timestamp) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if wallet is in admin list (case-insensitive)
    const isAdmin = ADMIN_WALLETS.includes(walletAddress.toLowerCase());
    if (!isAdmin) {
      // Don't reveal that the wallet isn't an admin - just say "unauthorized"
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Verify signature is recent (within 2 minutes for tighter security)
    const signatureTime = parseInt(timestamp, 10);
    if (isNaN(signatureTime) || Date.now() - signatureTime > 2 * 60 * 1000) {
      return NextResponse.json(
        { error: 'Signature expired' },
        { status: 400 }
      );
    }

    // Verify the wallet signature
    try {
      const message = `DegenDome:admin:${timestamp}`;
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

    // All checks passed - wallet is verified admin
    return NextResponse.json({
      success: true,
      isAdmin: true,
    });
  } catch (error) {
    console.error('Admin verification error:', error);
    return NextResponse.json(
      { error: 'Verification failed' },
      { status: 500 }
    );
  }
}
