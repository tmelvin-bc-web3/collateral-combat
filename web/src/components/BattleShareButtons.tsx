'use client';

import { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';

interface BattleShareButtonsProps {
  battleId: string;
  winAmount?: number;
  isWinner?: boolean;
  referralCode?: string;
  className?: string;
}

export function BattleShareButtons({
  battleId,
  winAmount,
  isWinner,
  referralCode,
  className,
}: BattleShareButtonsProps) {
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);

  // Build share URL with referral code
  const getShareUrl = useCallback(() => {
    const baseUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/battle/${battleId}/result`;
    if (referralCode) {
      return `${baseUrl}?ref=${referralCode}`;
    }
    return baseUrl;
  }, [battleId, referralCode]);

  // Build Twitter share text
  const getShareText = useCallback(() => {
    if (isWinner && winAmount) {
      return `Just won ${winAmount.toFixed(2)} SOL in a @DegenDomeSolana battle!\n\nThink you can beat me?`;
    }
    return `Check out this battle on @DegenDomeSolana!`;
  }, [isWinner, winAmount]);

  const handleTwitterShare = useCallback(() => {
    const text = getShareText();
    const url = getShareUrl();
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
    window.open(twitterUrl, '_blank', 'noopener,noreferrer,width=550,height=450');
  }, [getShareText, getShareUrl]);

  const handleCopyLink = useCallback(async () => {
    const url = getShareUrl();
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  }, [getShareUrl]);

  const handleDownloadImage = useCallback(async () => {
    // Fetch the image from backend and download
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';
    const imageUrl = `${backendUrl}/api/share/battle/${battleId}/image`;

    setDownloading(true);
    try {
      const response = await fetch(imageUrl);
      if (!response.ok) {
        throw new Error('Failed to fetch image');
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = `degendome-battle-${battleId.slice(0, 8)}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download image:', error);
    } finally {
      setDownloading(false);
    }
  }, [battleId]);

  return (
    <div className={cn('flex gap-3', className)}>
      {/* Twitter Share */}
      <button
        onClick={handleTwitterShare}
        className="flex items-center gap-2 px-4 py-2 bg-[#1DA1F2] hover:bg-[#1a8cd8] text-white font-medium rounded-lg transition-colors"
      >
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
        <span>Share on X</span>
      </button>

      {/* Copy Link */}
      <button
        onClick={handleCopyLink}
        className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white font-medium rounded-lg transition-colors border border-white/10"
      >
        {copied ? (
          <>
            <svg className="w-5 h-5 text-[#7fba00]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span>Copied!</span>
          </>
        ) : (
          <>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
            </svg>
            <span>Copy Link</span>
          </>
        )}
      </button>

      {/* Download Image */}
      <button
        onClick={handleDownloadImage}
        disabled={downloading}
        className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white font-medium rounded-lg transition-colors border border-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {downloading ? (
          <>
            <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span>Downloading...</span>
          </>
        ) : (
          <>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            <span>Download</span>
          </>
        )}
      </button>
    </div>
  );
}
