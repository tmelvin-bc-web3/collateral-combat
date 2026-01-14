export type GameMode = 'oracle' | 'battle' | 'draft' | 'spectator';

export interface WinShareData {
  winAmount: number; // In SOL
  gameMode: GameMode;
  walletAddress: string;
  referralCode: string;
  level?: number;
}

// Game mode display labels
function getGameModeLabel(gameMode: GameMode): string {
  const labels: Record<GameMode, string> = {
    oracle: 'ORACLE PREDICTION',
    battle: 'BATTLE ARENA',
    draft: 'MEMECOIN DRAFT',
    spectator: 'SPECTATOR BET',
  };
  return labels[gameMode];
}

// Truncate wallet address for display
function truncateWallet(address: string): string {
  if (address.length <= 12) return address;
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

// Generate share image using HTML Canvas
export async function generateShareImage(data: WinShareData): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = 1200;
  canvas.height = 630;
  const ctx = canvas.getContext('2d')!;

  // Draw dark gradient background
  const gradient = ctx.createLinearGradient(0, 0, 0, 630);
  gradient.addColorStop(0, '#1a1512');
  gradient.addColorStop(0.5, '#0f0d0a');
  gradient.addColorStop(1, '#0a0908');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 1200, 630);

  // Add subtle radial glow in center
  const radialGradient = ctx.createRadialGradient(600, 300, 0, 600, 300, 400);
  radialGradient.addColorStop(0, 'rgba(255, 85, 0, 0.08)');
  radialGradient.addColorStop(1, 'rgba(255, 85, 0, 0)');
  ctx.fillStyle = radialGradient;
  ctx.fillRect(0, 0, 1200, 630);

  // Draw border glow effect
  ctx.strokeStyle = 'rgba(255, 85, 0, 0.3)';
  ctx.lineWidth = 2;
  ctx.strokeRect(20, 20, 1160, 590);

  // Draw DegenDome branding top-left
  ctx.textAlign = 'left';
  ctx.font = 'bold 42px Impact, sans-serif';
  ctx.fillStyle = '#ff5500';
  ctx.fillText('DEGEN', 50, 70);
  ctx.fillStyle = '#e8dfd4';
  ctx.fillText('DOME', 185, 70);

  // Draw level badge top-right if provided
  if (data.level) {
    ctx.textAlign = 'right';
    ctx.font = 'bold 24px Inter, Arial, sans-serif';
    ctx.fillStyle = '#888888';
    ctx.fillText(`Level ${data.level}`, 1150, 60);
  }

  // Draw game mode label
  ctx.textAlign = 'center';
  ctx.font = 'bold 32px Inter, Arial, sans-serif';
  ctx.fillStyle = '#ff5500';
  ctx.fillText(getGameModeLabel(data.gameMode), 600, 180);

  // Draw "I WON" text
  ctx.font = 'bold 36px Inter, Arial, sans-serif';
  ctx.fillStyle = '#888888';
  ctx.fillText('I WON', 600, 240);

  // Draw win amount (large, green, prominent)
  ctx.font = 'bold 96px Impact, sans-serif';
  ctx.fillStyle = '#7fba00';
  // Add glow effect for win amount
  ctx.shadowColor = '#7fba00';
  ctx.shadowBlur = 20;
  ctx.fillText(`+${data.winAmount.toFixed(2)} SOL`, 600, 340);
  ctx.shadowBlur = 0;

  // Draw wallet address (truncated)
  ctx.font = '26px monospace';
  ctx.fillStyle = '#666666';
  ctx.fillText(truncateWallet(data.walletAddress), 600, 400);

  // Draw separator line
  ctx.strokeStyle = 'rgba(255, 85, 0, 0.2)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(400, 450);
  ctx.lineTo(800, 450);
  ctx.stroke();

  // Draw referral code section (gold, prominent)
  ctx.font = 'bold 28px Inter, Arial, sans-serif';
  ctx.fillStyle = '#c4a574';
  ctx.fillText('Join the arena with code:', 600, 500);

  ctx.font = 'bold 40px Impact, sans-serif';
  ctx.fillStyle = '#FFD700';
  ctx.shadowColor = '#FFD700';
  ctx.shadowBlur = 10;
  ctx.fillText(data.referralCode, 600, 550);
  ctx.shadowBlur = 0;

  // Draw site URL
  ctx.font = '20px Inter, Arial, sans-serif';
  ctx.fillStyle = '#555555';
  ctx.fillText('degendome.xyz', 600, 600);

  // Convert canvas to blob
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to generate image'));
        }
      },
      'image/png',
      1.0
    );
  });
}

// Download the generated image
export async function downloadShareImage(data: WinShareData): Promise<void> {
  const blob = await generateShareImage(data);
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = `degendome-win-${data.winAmount.toFixed(2)}sol.png`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  URL.revokeObjectURL(url);
}

// Get share text templates
export function getShareText(data: WinShareData): string {
  const referralLink = `https://degendome.xyz/ref/${data.referralCode}`;

  const templates: Record<GameMode, string[]> = {
    oracle: [
      `Just won ${data.winAmount.toFixed(2)} SOL predicting SOL price on @DegenDomeSolana!\n\nThink you can beat the oracle?\n\n${referralLink}`,
      `Called it! +${data.winAmount.toFixed(2)} SOL on @DegenDomeSolana Oracle\n\n30 seconds. One prediction. Big wins.\n\n${referralLink}`,
    ],
    battle: [
      `Just destroyed my opponent in @DegenDomeSolana Battle Arena!\n\n+${data.winAmount.toFixed(2)} SOL\n\nWho's next?\n\n${referralLink}`,
    ],
    draft: [
      `My draft picks are paying off! +${data.winAmount.toFixed(2)} SOL on @DegenDomeSolana\n\nThink you can build a better portfolio?\n\n${referralLink}`,
    ],
    spectator: [
      `Backed the right fighter! +${data.winAmount.toFixed(2)} SOL spectating on @DegenDomeSolana\n\n${referralLink}`,
    ],
  };

  // Use big win template for wins > 1 SOL
  if (data.winAmount >= 1.0) {
    return `MASSIVE WIN\n\nJust pulled ${data.winAmount.toFixed(2)} SOL on @DegenDomeSolana!\n\nThe degen life chose me\n\n${referralLink}`;
  }

  const modeTemplates = templates[data.gameMode];
  return modeTemplates[Math.floor(Math.random() * modeTemplates.length)];
}

// Generate Twitter share URL
export function getTwitterShareUrl(data: WinShareData): string {
  const text = getShareText(data);
  return `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
}

// Get referral link
export function getReferralLink(referralCode: string): string {
  return `https://degendome.xyz/ref/${referralCode}`;
}
