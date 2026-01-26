import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { WHITELISTED_WALLETS } from '@/config/whitelist';

// Coming soon mode - uses env var, defaults to true in production
const COMING_SOON_MODE = (process.env.NEXT_PUBLIC_COMING_SOON || '').trim() !== 'false';

// Secret for verifying signed tokens - MUST match the API route
const WHITELIST_SECRET = process.env.WHITELIST_SECRET || 'dev-secret-change-in-production';

// Token expiry: 24 hours
const TOKEN_EXPIRY_MS = 24 * 60 * 60 * 1000;

/**
 * Verify a signed whitelist access token
 * Token format: wallet:timestamp:signature
 *
 * This uses Web Crypto API which is available in Edge runtime
 */
async function verifySignedToken(token: string): Promise<{ valid: boolean; wallet?: string }> {
  try {
    const parts = token.split(':');
    if (parts.length !== 3) {
      return { valid: false };
    }

    const [wallet, timestamp, providedSignature] = parts;

    // Check if token has expired
    const tokenTime = parseInt(timestamp, 10);
    if (isNaN(tokenTime) || Date.now() - tokenTime > TOKEN_EXPIRY_MS) {
      return { valid: false };
    }

    // Verify signature using Web Crypto API (Edge-compatible)
    const data = `${wallet}:${timestamp}`;
    const encoder = new TextEncoder();
    const keyData = encoder.encode(WHITELIST_SECRET).buffer as ArrayBuffer;
    const messageData = encoder.encode(data).buffer as ArrayBuffer;

    const key = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const signatureBuffer = await crypto.subtle.sign('HMAC', key, messageData);
    const expectedSignature = Array.from(new Uint8Array(signatureBuffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    if (providedSignature !== expectedSignature) {
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

export async function middleware(request: NextRequest) {
  // If not in coming soon mode, allow all routes
  if (!COMING_SOON_MODE) {
    return NextResponse.next();
  }

  const { pathname } = request.nextUrl;

  // Check for signed whitelist cookie
  const whitelistCookie = request.cookies.get('whitelist_access');
  if (whitelistCookie) {
    const tokenValue = whitelistCookie.value;

    // Verify the signed token (not just the wallet address)
    const verification = await verifySignedToken(tokenValue);
    if (verification.valid) {
      return NextResponse.next();
    }

    // Invalid/expired token - clear the cookie
    const response = NextResponse.redirect(new URL('/coming-soon', request.url));
    response.cookies.delete('whitelist_access');

    // Only redirect if not already going to coming-soon
    if (pathname !== '/coming-soon' && !pathname.startsWith('/coming-soon/')) {
      return response;
    }
  }

  // Redirect home to coming-soon page in coming soon mode
  if (pathname === '/') {
    return NextResponse.redirect(new URL('/coming-soon', request.url));
  }

  // Allow these paths in coming soon mode
  const allowedPaths = [
    '/coming-soon',
    '/api/waitlist',
    '/api/auth',
    '/waitlist',
    '/ref',
    '/admin',
  ];

  // Allow static files and Next.js internals
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/logo') ||
    pathname.includes('.') // static files
  ) {
    return NextResponse.next();
  }

  // Check if path is allowed
  if (allowedPaths.some(path => pathname === path || pathname.startsWith(path + '/'))) {
    return NextResponse.next();
  }

  // Redirect all other paths to coming-soon
  return NextResponse.redirect(new URL('/coming-soon', request.url));
}

export const config = {
  matcher: [
    // Match all paths except static files
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
