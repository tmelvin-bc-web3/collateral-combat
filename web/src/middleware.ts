import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { WHITELISTED_WALLETS } from '@/config/whitelist';

// Coming soon mode - uses env var, defaults to true in production
const COMING_SOON_MODE = process.env.NEXT_PUBLIC_COMING_SOON !== 'false';

export function middleware(request: NextRequest) {
  // If not in coming soon mode, allow all routes
  if (!COMING_SOON_MODE) {
    return NextResponse.next();
  }

  const { pathname } = request.nextUrl;

  // Check for whitelist cookie - grants full access
  const whitelistCookie = request.cookies.get('whitelist_access');
  if (whitelistCookie) {
    const walletAddress = whitelistCookie.value;
    const isWhitelisted = WHITELISTED_WALLETS.some(
      (addr) => addr.toLowerCase() === walletAddress.toLowerCase()
    );
    if (isWhitelisted) {
      return NextResponse.next();
    }
  }

  // Allow these paths in coming soon mode
  const allowedPaths = [
    '/',
    '/coming-soon',
    '/api/waitlist',
    '/progression',
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

  // Redirect all other paths to home
  return NextResponse.redirect(new URL('/', request.url));
}

export const config = {
  matcher: [
    // Match all paths except static files
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
