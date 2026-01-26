import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const contentType = 'image/png';
export const size = { width: 600, height: 315 };
export const alt = 'Fighter Profile';

interface ProfileData {
  wallet: string;
  wins: number;
  losses: number;
  dr: number;
  tier: string;
  currentStreak: number;
  totalBattles: number;
}

export default async function OGImage({ params }: { params: Promise<{ wallet: string }> }) {
  const { wallet } = await params;

  try {
    // Fetch profile data from backend
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';
    const res = await fetch(`${backendUrl}/api/battles/stats/${wallet}`, { next: { revalidate: 300 } });

    let profileData: ProfileData;

    if (res.ok) {
      const stats = await res.json();
      profileData = {
        wallet,
        wins: stats.wins || 0,
        losses: stats.losses || 0,
        dr: stats.dr || stats.elo || 1000,
        tier: stats.tier || 'retail',
        currentStreak: stats.currentStreak || 0,
        totalBattles: stats.totalBattles || 0,
      };
    } else {
      // Default data for new/unknown wallets
      profileData = {
        wallet,
        wins: 0,
        losses: 0,
        dr: 1000,
        tier: 'retail',
        currentStreak: 0,
        totalBattles: 0,
      };
    }

    const displayName = `${wallet.slice(0, 4)}...${wallet.slice(-4)}`;
    const winRate = profileData.totalBattles > 0
      ? ((profileData.wins / profileData.totalBattles) * 100).toFixed(0)
      : '0';

    const tierColors: Record<string, string> = {
      bronze: '#cd7f32',
      silver: '#c0c0c0',
      gold: '#ffd700',
      platinum: '#e5e4e2',
      diamond: '#b9f2ff',
    };

    const tierColor = tierColors[profileData.tier.toLowerCase()] || '#ff5500';

    return new ImageResponse(
      (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            width: '100%',
            height: '100%',
            background: 'linear-gradient(180deg, #1a1512 0%, #0a0908 100%)',
            fontFamily: 'Inter, sans-serif',
            padding: '30px',
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'baseline' }}>
              <span style={{ color: '#ff5500', fontSize: '24px', fontWeight: 700 }}>DEGEN</span>
              <span style={{ color: '#e8dfd4', fontSize: '24px', fontWeight: 700 }}>DOME</span>
            </div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              padding: '4px 12px',
              background: `${tierColor}20`,
              border: `1px solid ${tierColor}`,
              borderRadius: '20px',
            }}>
              <span style={{ color: tierColor, fontSize: '14px', fontWeight: 600, textTransform: 'uppercase' }}>
                {profileData.tier}
              </span>
            </div>
          </div>

          {/* Fighter info */}
          <div style={{ display: 'flex', flexDirection: 'column', marginBottom: '20px' }}>
            <span style={{ color: '#e8dfd4', fontSize: '36px', fontWeight: 700 }}>{displayName}</span>
            <span style={{ color: '#666', fontSize: '14px' }}>DR: {profileData.dr}</span>
          </div>

          {/* Stats */}
          <div style={{ display: 'flex', gap: '40px', marginTop: 'auto' }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ color: '#666', fontSize: '10px', textTransform: 'uppercase' }}>RECORD</span>
              <span style={{ color: '#e8dfd4', fontSize: '20px', fontWeight: 600 }}>
                {profileData.wins}W - {profileData.losses}L
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ color: '#666', fontSize: '10px', textTransform: 'uppercase' }}>WIN RATE</span>
              <span style={{ color: '#7fba00', fontSize: '20px', fontWeight: 600 }}>{winRate}%</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ color: '#666', fontSize: '10px', textTransform: 'uppercase' }}>STREAK</span>
              <span style={{
                color: profileData.currentStreak > 0 ? '#7fba00' : '#e8dfd4',
                fontSize: '20px',
                fontWeight: 600
              }}>
                {profileData.currentStreak > 0 ? `${profileData.currentStreak}W` : '-'}
              </span>
            </div>
          </div>
        </div>
      ),
      { ...size }
    );
  } catch (error) {
    // Fallback image
    return new ImageResponse(
      (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
            height: '100%',
            background: 'linear-gradient(180deg, #1a1512 0%, #0a0908 100%)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'baseline' }}>
            <span style={{ color: '#ff5500', fontSize: '36px', fontWeight: 700 }}>DEGEN</span>
            <span style={{ color: '#e8dfd4', fontSize: '36px', fontWeight: 700 }}>DOME</span>
          </div>
          <span style={{ color: '#555', fontSize: '16px', marginTop: '10px' }}>Fighter Profile</span>
        </div>
      ),
      { ...size }
    );
  }
}
