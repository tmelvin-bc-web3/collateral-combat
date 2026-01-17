'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  ReactNode,
} from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import bs58 from 'bs58';
import { BACKEND_URL } from '@/config/api';

interface AuthContextValue {
  isAuthenticated: boolean;
  isLoading: boolean;
  token: string | null;
  error: string | null;
  signIn: () => Promise<boolean>;
  signOut: () => void;
  getAuthHeaders: () => Record<string, string>;
  authenticatedFetch: (url: string, options?: RequestInit) => Promise<Response>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const TOKEN_KEY = 'degendome_auth_token';
const WALLET_KEY = 'degendome_auth_wallet';

export function AuthProvider({ children }: { children: ReactNode }) {
  const { publicKey, signMessage, connected, disconnecting } = useWallet();
  const walletAddress = publicKey?.toBase58() || null;

  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasAttemptedAutoSignIn = useRef(false);
  const initialLoadDone = useRef(false);

  // Load token from localStorage on mount (persists across refreshes and browser restarts)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const savedToken = localStorage.getItem(TOKEN_KEY);
    const savedWallet = localStorage.getItem(WALLET_KEY);

    // On initial load, just restore the token if it exists
    // We'll validate it matches the wallet once the wallet connects
    if (!initialLoadDone.current) {
      initialLoadDone.current = true;
      if (savedToken && savedWallet) {
        // Temporarily set token - will be cleared if wallet doesn't match
        setToken(savedToken);
      }
      return;
    }

    // After initial load, validate wallet matches
    if (walletAddress) {
      if (savedToken && savedWallet === walletAddress) {
        setToken(savedToken);
      } else if (savedWallet && savedWallet !== walletAddress) {
        // Different wallet connected, clear old token
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(WALLET_KEY);
        setToken(null);
      }
    }
  }, [walletAddress]);

  // Clear token when wallet disconnects
  useEffect(() => {
    if (disconnecting || !connected) {
      setToken(null);
      setError(null);
      hasAttemptedAutoSignIn.current = false; // Reset for next connection
      if (typeof window !== 'undefined') {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(WALLET_KEY);
      }
    }
  }, [disconnecting, connected]);

  // Auto sign-in when wallet connects (sign once, play all session)
  useEffect(() => {
    // Skip if already signed in, not connected, or already attempted
    if (token || !connected || !walletAddress || !signMessage || hasAttemptedAutoSignIn.current) {
      return;
    }

    // Check if we have a valid token in sessionStorage first
    const savedToken = localStorage.getItem(TOKEN_KEY);
    const savedWallet = localStorage.getItem(WALLET_KEY);
    if (savedToken && savedWallet === walletAddress) {
      setToken(savedToken);
      return;
    }

    // Mark that we've attempted auto sign-in to prevent repeated prompts
    hasAttemptedAutoSignIn.current = true;

    // Small delay to ensure wallet is fully ready
    const timeoutId = setTimeout(async () => {
      try {
        const timestamp = Date.now().toString();
        const message = `DegenDome:login:${timestamp}`;
        const messageBytes = new TextEncoder().encode(message);

        const signatureBytes = await signMessage(messageBytes);
        const signature = bs58.encode(signatureBytes);

        const res = await fetch(`${BACKEND_URL}/api/auth/login`, {
          method: 'POST',
          headers: {
            'x-wallet-address': walletAddress,
            'x-signature': signature,
            'x-timestamp': timestamp,
          },
        });

        if (res.ok) {
          const data = await res.json();
          setToken(data.token);
          localStorage.setItem(TOKEN_KEY, data.token);
          localStorage.setItem(WALLET_KEY, walletAddress);
        }
      } catch {
        // User rejected or error - they can manually sign in later if needed
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [connected, walletAddress, signMessage, token]);

  // Sign in with wallet signature
  const signIn = useCallback(async (): Promise<boolean> => {
    if (!walletAddress || !signMessage) {
      setError('Wallet not connected or does not support signing');
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Create signature
      const timestamp = Date.now().toString();
      const message = `DegenDome:login:${timestamp}`;
      const messageBytes = new TextEncoder().encode(message);

      const signatureBytes = await signMessage(messageBytes);
      const signature = bs58.encode(signatureBytes);

      // Send to backend
      const res = await fetch(`${BACKEND_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'x-wallet-address': walletAddress,
          'x-signature': signature,
          'x-timestamp': timestamp,
        },
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Sign in failed');
      }

      const data = await res.json();

      // Save token to localStorage (persists across refreshes and browser restarts)
      setToken(data.token);
      if (typeof window !== 'undefined') {
        localStorage.setItem(TOKEN_KEY, data.token);
        localStorage.setItem(WALLET_KEY, walletAddress);
      }

      return true;
    } catch (err: any) {
      if (err.message?.includes('User rejected')) {
        setError('Sign in cancelled');
      } else {
        setError(err.message || 'Sign in failed');
      }
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [walletAddress, signMessage]);

  // Sign out
  const signOut = useCallback(() => {
    setToken(null);
    setError(null);
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem(TOKEN_KEY);
      sessionStorage.removeItem(WALLET_KEY);
    }
  }, []);

  // Get auth headers for API requests
  const getAuthHeaders = useCallback((): Record<string, string> => {
    if (token) {
      return { Authorization: `Bearer ${token}` };
    }
    return {};
  }, [token]);

  // Authenticated fetch wrapper
  const authenticatedFetch = useCallback(
    async (url: string, options: RequestInit = {}): Promise<Response> => {
      const headers = {
        ...options.headers,
        ...getAuthHeaders(),
      };

      const response = await fetch(url, { ...options, headers });

      // If token is invalid, clear it
      if (response.status === 401) {
        const data = await response.clone().json().catch(() => ({}));
        if (data.code === 'INVALID_TOKEN') {
          signOut();
        }
      }

      return response;
    },
    [getAuthHeaders, signOut]
  );

  const isAuthenticated = !!token && !!walletAddress;

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        isLoading,
        token,
        error,
        signIn,
        signOut,
        getAuthHeaders,
        authenticatedFetch,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
