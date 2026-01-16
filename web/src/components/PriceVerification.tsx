'use client';

import { useState, useEffect } from 'react';
import { BACKEND_URL } from '@/config/api';

interface PriceVerificationProps {
  symbol: string;
  backendPrice: number;
  showDetails?: boolean;
  className?: string;
}

interface PythPriceData {
  symbol: string;
  backendPrice: number;
  pythPrice: number | null;
  pythConfidence: number | null;
  pythPublishTime: number | null;
  supported: boolean;
}

interface AuditRecord {
  id: string;
  gameType: string;
  gameId: string;
  event: string;
  symbol: string;
  backendPrice: number;
  pythPrice: number | null;
  pythConfidence: number | null;
  discrepancyPercent: number | null;
  flagged: boolean;
  timestamp: number;
}

/**
 * PriceVerification Component
 *
 * Shows a verified price badge with Pyth oracle comparison.
 * Green checkmark = prices match (within 1% tolerance)
 * Yellow warning = minor discrepancy
 * Red alert = significant discrepancy (>1%)
 */
export function PriceVerification({ symbol, backendPrice, showDetails = false, className = '' }: PriceVerificationProps) {
  const [pythData, setPythData] = useState<PythPriceData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPythPrice = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/prices/pyth/${symbol}`);
        if (res.ok) {
          const data = await res.json();
          setPythData(data);
        }
      } catch (err) {
        console.error('Failed to fetch Pyth price:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPythPrice();
    // Refresh every 30 seconds
    const interval = setInterval(fetchPythPrice, 30000);
    return () => clearInterval(interval);
  }, [symbol]);

  if (loading) {
    return (
      <div className={`inline-flex items-center gap-1 text-white/40 ${className}`}>
        <div className="w-3 h-3 rounded-full bg-white/20 animate-pulse" />
        <span className="text-xs">Verifying...</span>
      </div>
    );
  }

  if (!pythData || pythData.pythPrice === null) {
    return (
      <div className={`inline-flex items-center gap-1 text-white/40 ${className}`}>
        <div className="w-3 h-3 rounded-full bg-white/20" />
        <span className="text-xs">Pyth N/A</span>
      </div>
    );
  }

  const discrepancy = Math.abs((backendPrice - pythData.pythPrice) / pythData.pythPrice) * 100;
  const isVerified = discrepancy < 1;
  const isWarning = discrepancy >= 1 && discrepancy < 3;
  const isAlert = discrepancy >= 3;

  return (
    <div className={`inline-flex items-center gap-1.5 ${className}`}>
      {/* Verification Badge */}
      <div
        className={`w-4 h-4 rounded-full flex items-center justify-center ${
          isVerified ? 'bg-success/20 text-success' :
          isWarning ? 'bg-warning/20 text-warning' :
          'bg-danger/20 text-danger'
        }`}
        title={`Pyth: $${pythData.pythPrice.toFixed(4)} | Diff: ${discrepancy.toFixed(2)}%`}
      >
        {isVerified ? (
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        ) : isWarning ? (
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01" />
          </svg>
        ) : (
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        )}
      </div>

      {/* Details */}
      {showDetails && (
        <div className="text-xs">
          <span className={isVerified ? 'text-success' : isWarning ? 'text-warning' : 'text-danger'}>
            Pyth: ${pythData.pythPrice.toFixed(2)}
          </span>
          <span className="text-white/30 ml-1">
            ({discrepancy.toFixed(1)}%)
          </span>
        </div>
      )}
    </div>
  );
}

/**
 * GameVerificationBadge
 *
 * Shows verification status for a completed game/round with tooltip.
 */
interface GameVerificationBadgeProps {
  gameType: 'token_wars' | 'lds' | 'oracle';
  gameId: string;
  className?: string;
}

export function GameVerificationBadge({ gameType, gameId, className = '' }: GameVerificationBadgeProps) {
  const [summary, setSummary] = useState<{
    totalRecords: number;
    flaggedRecords: number;
    averageDiscrepancy: number;
  } | null>(null);
  const [showTooltip, setShowTooltip] = useState(false);

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/verification/game/${gameType}/${gameId}`);
        if (res.ok) {
          const data = await res.json();
          setSummary(data);
        }
      } catch (err) {
        console.error('Failed to fetch verification summary:', err);
      }
    };

    fetchSummary();
  }, [gameType, gameId]);

  if (!summary || summary.totalRecords === 0) {
    return null;
  }

  const isVerified = summary.flaggedRecords === 0;
  const avgDiscrepancy = summary.averageDiscrepancy;

  return (
    <div className={`relative inline-block ${className}`}>
      <button
        className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
          isVerified
            ? 'bg-success/10 text-success hover:bg-success/20'
            : 'bg-warning/10 text-warning hover:bg-warning/20'
        }`}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        {isVerified ? (
          <>
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            Pyth Verified
          </>
        ) : (
          <>
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            {summary.flaggedRecords} Discrepancy
          </>
        )}
      </button>

      {/* Tooltip */}
      {showTooltip && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-black/90 border border-white/10 rounded-lg text-xs z-50">
          <div className="text-white/60 mb-1">Price Verification</div>
          <div className="space-y-1">
            <div className="flex justify-between">
              <span className="text-white/40">Checks:</span>
              <span className="text-white">{summary.totalRecords}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/40">Avg Diff:</span>
              <span className="text-white">{avgDiscrepancy.toFixed(3)}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/40">Flagged:</span>
              <span className={summary.flaggedRecords > 0 ? 'text-warning' : 'text-success'}>
                {summary.flaggedRecords}
              </span>
            </div>
          </div>
          <div className="mt-2 pt-2 border-t border-white/10 text-white/40">
            Prices verified against Pyth Network oracles
          </div>
          {/* Arrow */}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-black/90" />
        </div>
      )}
    </div>
  );
}

/**
 * VerificationAuditLog
 *
 * Shows a scrollable list of price verification records.
 */
interface VerificationAuditLogProps {
  gameType?: string;
  gameId?: string;
  limit?: number;
  className?: string;
}

export function VerificationAuditLog({ gameType, gameId, limit = 20, className = '' }: VerificationAuditLogProps) {
  const [records, setRecords] = useState<AuditRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRecords = async () => {
      try {
        const params = new URLSearchParams();
        if (gameType) params.set('gameType', gameType);
        if (gameId) params.set('gameId', gameId);
        params.set('limit', limit.toString());

        const res = await fetch(`${BACKEND_URL}/api/verification/audit?${params}`);
        if (res.ok) {
          const data = await res.json();
          setRecords(data.records);
        }
      } catch (err) {
        console.error('Failed to fetch audit records:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchRecords();
    // Refresh every 10 seconds
    const interval = setInterval(fetchRecords, 10000);
    return () => clearInterval(interval);
  }, [gameType, gameId, limit]);

  if (loading) {
    return <div className="text-white/40 text-sm">Loading audit log...</div>;
  }

  if (records.length === 0) {
    return <div className="text-white/40 text-sm">No verification records yet</div>;
  }

  return (
    <div className={`space-y-1 ${className}`}>
      {records.map((record) => (
        <div
          key={record.id}
          className={`flex items-center justify-between p-2 rounded text-xs ${
            record.flagged ? 'bg-warning/10 border border-warning/20' : 'bg-white/5'
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="text-white/40">{record.symbol}</span>
            <span className="text-white/60">{record.event.replace('_', ' ')}</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-white/60">Backend: ${record.backendPrice.toFixed(2)}</div>
              {record.pythPrice && (
                <div className="text-white/40">Pyth: ${record.pythPrice.toFixed(2)}</div>
              )}
            </div>
            {record.discrepancyPercent !== null && (
              <span className={`px-1.5 py-0.5 rounded ${
                record.flagged ? 'bg-warning/20 text-warning' : 'bg-success/20 text-success'
              }`}>
                {record.discrepancyPercent.toFixed(2)}%
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
