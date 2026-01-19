import { NextRequest, NextResponse } from 'next/server';
import { WHITELISTED_WALLETS } from '@/config/whitelist';
import crypto from 'crypto';
import { BACKEND_URL } from '@/config/api';

// Secret for signing tokens - MUST match middleware
const WHITELIST_SECRET = process.env.WHITELIST_SECRET || 'dev-secret-change-in-production';

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
 * POST /api/auth/set-whitelist-cookie
 *
 * Sets the whitelist access cookie for authenticated users.
 * Requires a valid JWT token in the Authorization header.
 * No wallet signature required - JWT proves identity.
 */
export async function POST(request: NextRequest) {
  try {
    // Get JWT from Authorization header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid authorization header' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);

    // Verify JWT with backend
    const verifyResponse = await fetch(`${BACKEND_URL}/api/auth/verify`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!verifyResponse.ok) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    const verifyData = await verifyResponse.json();
    const walletAddress = verifyData.wallet || verifyData.walletAddress;

    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Could not determine wallet from token' },
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

    // Generate signed token for cookie
    const signedToken = generateSignedToken(walletAddress);

    // Create response with HTTP-only cookie
    const response = NextResponse.json({
      success: true,
      message: 'Whitelist cookie set',
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
    console.error('Set whitelist cookie error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
