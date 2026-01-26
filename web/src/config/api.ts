/**
 * API Configuration
 *
 * SECURITY: In production, NEXT_PUBLIC_BACKEND_URL must be set.
 * The localhost fallback is only allowed in development.
 */

const getBackendUrl = (): string => {
  const url = process.env.NEXT_PUBLIC_BACKEND_URL;

  if (url) {
    return url.trim();
  }

  // In production, we should never fall back to localhost
  if (process.env.NODE_ENV === 'production') {
    console.error(
      '[Config] CRITICAL: NEXT_PUBLIC_BACKEND_URL is not set in production!'
    );
    // Return empty string to make API calls fail clearly
    // rather than silently trying localhost
    return '';
  }

  // Development fallback
  return 'http://localhost:3001';
};

export const BACKEND_URL = getBackendUrl();

/**
 * WebSocket URL derived from backend URL
 */
export const getWebSocketUrl = (): string => {
  if (!BACKEND_URL) return '';

  // Convert http(s) to ws(s)
  return BACKEND_URL.replace(/^http/, 'ws');
};

export const WS_URL = getWebSocketUrl();
