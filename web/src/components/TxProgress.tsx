'use client';

import { CheckCircle, XCircle } from 'lucide-react';

/**
 * Transaction status for multi-step progress tracking
 */
export type TxStatus = 'idle' | 'signing' | 'sending' | 'confirming' | 'success' | 'error';

/**
 * User-friendly messages for each transaction status
 */
const STATUS_MESSAGES: Record<TxStatus, string> = {
  idle: '',
  signing: 'Waiting for your signature...',
  sending: 'Sending transaction to Solana...',
  confirming: 'Confirming transaction...',
  success: 'Success!',
  error: 'Transaction failed',
};

interface TxProgressProps {
  status: TxStatus;
  errorMessage?: string;
}

/**
 * Transaction progress indicator component.
 * Shows multi-step progress during deposit/withdraw/session operations.
 *
 * - Renders nothing when idle
 * - Shows spinner for signing/sending/confirming (warning color)
 * - Shows checkmark for success (success color)
 * - Shows X for error (danger color) with optional error message
 */
export function TxProgress({ status, errorMessage }: TxProgressProps) {
  // Don't render anything when idle
  if (status === 'idle') {
    return null;
  }

  const isProcessing = status === 'signing' || status === 'sending' || status === 'confirming';
  const isSuccess = status === 'success';
  const isError = status === 'error';

  return (
    <div
      className={`flex items-center gap-3 p-3 rounded-lg bg-black/40 border ${
        isSuccess
          ? 'border-success/30'
          : isError
          ? 'border-danger/30'
          : 'border-warning/30'
      }`}
    >
      {/* Icon */}
      <div className="flex-shrink-0">
        {isProcessing && (
          <div className="w-5 h-5 animate-spin border-2 border-warning border-t-transparent rounded-full" />
        )}
        {isSuccess && (
          <CheckCircle className="w-5 h-5 text-success" />
        )}
        {isError && (
          <XCircle className="w-5 h-5 text-danger" />
        )}
      </div>

      {/* Message */}
      <div className="flex-1 min-w-0">
        <p
          className={`text-sm font-medium ${
            isSuccess
              ? 'text-success'
              : isError
              ? 'text-danger'
              : 'text-warning'
          }`}
        >
          {STATUS_MESSAGES[status]}
        </p>
        {isError && errorMessage && (
          <p className="text-xs text-danger/80 mt-0.5 truncate">
            {errorMessage}
          </p>
        )}
      </div>
    </div>
  );
}

export { STATUS_MESSAGES };
