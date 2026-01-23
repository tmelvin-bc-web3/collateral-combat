'use client';

import { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';

interface ProfileShareButtonProps {
  wallet: string;
  displayName: string;
  wins: number;
  losses: number;
  elo: number;
  tier: string;
  referralCode?: string;
  className?: string;
}

export function ProfileShareButton({
  wallet,
  displayName,
  wins,
  losses,
  elo,
  tier,
  referralCode,
  className,
}: ProfileShareButtonProps) {
  const [copied, setCopied] = useState(false);
  const [showOptions, setShowOptions] = useState(false);

  const getShareUrl = useCallback(() => {
    const baseUrl = `${window.location.origin}/profile/${wallet}`;
    if (referralCode) {
      return `${baseUrl}?ref=${referralCode}`;
    }
    return baseUrl;
  }, [wallet, referralCode]);

  const getShareText = useCallback(() => {
    const winRate = wins + losses > 0 ? ((wins / (wins + losses)) * 100).toFixed(0) : 0;
    return `${displayName} | ${tier.toUpperCase()} Fighter on @DegenDomeSolana\n\n${wins}W - ${losses}L (${winRate}% WR)\nELO: ${elo}\n\nThink you can beat me?`;
  }, [displayName, tier, wins, losses, elo]);

  const handleTwitterShare = useCallback(() => {
    const text = getShareText();
    const url = getShareUrl();
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
    window.open(twitterUrl, '_blank', 'noopener,noreferrer,width=550,height=450');
    setShowOptions(false);
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
    setShowOptions(false);
  }, [getShareUrl]);

  const handleDownloadCard = useCallback(async () => {
    const imageUrl = `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/share/fighter/${wallet}/image`;

    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = `degendome-fighter-${wallet.slice(0, 8)}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download card:', error);
    }
    setShowOptions(false);
  }, [wallet]);

  return (
    <div className={cn('relative', className)}>
      <button
        onClick={() => setShowOptions(!showOptions)}
        className="flex items-center gap-2 px-4 py-2 bg-[#ff5500] hover:bg-[#ff5500]/80 text-white font-medium rounded-lg transition-colors"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
        </svg>
        <span>Share Profile</span>
      </button>

      {/* Dropdown options */}
      {showOptions && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowOptions(false)}
          />

          {/* Dropdown */}
          <div className="absolute top-full right-0 mt-2 w-48 bg-[#1a1512] border border-white/10 rounded-lg shadow-xl z-50 overflow-hidden">
            <button
              onClick={handleTwitterShare}
              className="w-full flex items-center gap-3 px-4 py-3 text-left text-white/80 hover:bg-white/10 transition-colors"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
              <span>Share on X</span>
            </button>

            <button
              onClick={handleCopyLink}
              className="w-full flex items-center gap-3 px-4 py-3 text-left text-white/80 hover:bg-white/10 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              <span>{copied ? 'Copied!' : 'Copy Link'}</span>
            </button>

            <button
              onClick={handleDownloadCard}
              className="w-full flex items-center gap-3 px-4 py-3 text-left text-white/80 hover:bg-white/10 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <span>Download Card</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}
