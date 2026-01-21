'use client';

import { ErrorBoundary, FallbackProps } from 'react-error-boundary';
import { ReactNode } from 'react';

interface PageErrorBoundaryProps {
  children: ReactNode;
  pageName?: string;
}

function ErrorFallback({ error, resetErrorBoundary, pageName }: FallbackProps & { pageName?: string }) {
  // Log error for monitoring
  console.error(`[${pageName || 'Page'}] Error:`, error);

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-black/40 backdrop-blur border border-danger/30 rounded-lg p-8 text-center">
        <h1 className="text-4xl font-bold text-danger mb-4">Oops!</h1>
        <p className="text-white/80 mb-2">
          Something went wrong{pageName ? ` on the ${pageName}` : ''}.
        </p>
        <p className="text-white/60 text-sm mb-6">
          Don't worry - your funds are safe. This was just a display issue.
        </p>

        <div className="flex gap-3 justify-center">
          <button
            onClick={resetErrorBoundary}
            className="px-6 py-2 bg-warning text-black font-semibold rounded hover:bg-warning/90 transition-colors"
          >
            Try Again
          </button>
          <button
            onClick={() => window.location.href = '/'}
            className="px-6 py-2 bg-white/10 text-white font-semibold rounded hover:bg-white/20 transition-colors"
          >
            Go Home
          </button>
        </div>
      </div>
    </div>
  );
}

export function PageErrorBoundary({ children, pageName }: PageErrorBoundaryProps) {
  return (
    <ErrorBoundary
      FallbackComponent={(props) => <ErrorFallback {...props} pageName={pageName} />}
      onReset={() => {
        // Reset app state if needed
        window.location.reload();
      }}
    >
      {children}
    </ErrorBoundary>
  );
}
