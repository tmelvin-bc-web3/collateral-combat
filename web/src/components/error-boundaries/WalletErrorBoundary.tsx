'use client';

import { ErrorBoundary, FallbackProps } from 'react-error-boundary';
import { ReactNode } from 'react';
import { PageErrorBoundary } from './PageErrorBoundary';

interface WalletErrorBoundaryProps {
  children: ReactNode;
}

function isWalletError(error: unknown): boolean {
  const walletKeywords = [
    'wallet',
    'phantom',
    'solflare',
    'connection',
    'adapter',
    'signature',
    'transaction'
  ];

  // Extract error message safely
  let errorMessage = '';
  if (error instanceof Error) {
    errorMessage = error.message?.toLowerCase() || '';
  } else if (typeof error === 'string') {
    errorMessage = error.toLowerCase();
  }

  return walletKeywords.some(keyword => errorMessage.includes(keyword));
}

function WalletErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
  // Log error for monitoring
  console.error('[WalletErrorBoundary] Wallet error:', error);

  // If it's not actually a wallet error, fall back to standard error boundary
  if (!isWalletError(error)) {
    throw error;
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-black/40 backdrop-blur border border-warning/30 rounded-lg p-8 text-center">
        <h1 className="text-4xl font-bold text-warning mb-4">Wallet Connection Issue</h1>
        <p className="text-white/80 mb-2">
          We're having trouble connecting to your wallet.
        </p>
        <p className="text-white/60 text-sm mb-6">
          Try refreshing the page or disconnecting and reconnecting your wallet.
        </p>

        <div className="flex gap-3 justify-center">
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-warning text-black font-semibold rounded hover:bg-warning/90 transition-colors"
          >
            Refresh Page
          </button>
          <button
            onClick={() => {
              // Try to disconnect wallet
              try {
                localStorage.removeItem('walletName');
              } catch (e) {
                console.error('Failed to clear wallet state:', e);
              }
              window.location.reload();
            }}
            className="px-6 py-2 bg-white/10 text-white font-semibold rounded hover:bg-white/20 transition-colors"
          >
            Disconnect Wallet
          </button>
        </div>
      </div>
    </div>
  );
}

export function WalletErrorBoundary({ children }: WalletErrorBoundaryProps) {
  return (
    <PageErrorBoundary pageName="Wallet">
      <ErrorBoundary
        FallbackComponent={WalletErrorFallback}
        onReset={() => {
          window.location.reload();
        }}
      >
        {children}
      </ErrorBoundary>
    </PageErrorBoundary>
  );
}
