import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const contentType = 'image/png';
export const size = { width: 1200, height: 630 };
export const alt = 'Battle Result';

interface BattlePlayer {
  walletAddress: string;
  account?: {
    totalPnlPercent?: number;
  };
  finalPnl?: number;
}

interface BattleData {
  id: string;
  status: string;
  players: BattlePlayer[];
  winnerId?: string;
  prizePool: number;
}

export default async function OGImage({ params }: { params: { id: string } }) {
  const { id } = params;

  // Fetch the battle data to generate the image
  try {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';
    const res = await fetch(`${backendUrl}/api/battles/${id}`, { next: { revalidate: 60 } });

    if (!res.ok) {
      throw new Error('Battle not found');
    }

    const battle: BattleData = await res.json();

    const winner = battle.players?.find((p) => p.walletAddress === battle.winnerId);
    const loser = battle.players?.find((p) => p.walletAddress !== battle.winnerId);
    const winAmount = (battle.prizePool * 0.95).toFixed(2);

    // Get PnL for loser display
    const loserPnl = loser?.finalPnl ?? loser?.account?.totalPnlPercent ?? 0;

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
          }}
        >
          {/* Top accent */}
          <div style={{ display: 'flex', height: '4px', background: 'linear-gradient(90deg, #ff5500 0%, #ff8800 50%, #ff5500 100%)' }} />

          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '30px 50px' }}>
            <div style={{ display: 'flex', alignItems: 'baseline' }}>
              <span style={{ color: '#ff5500', fontSize: '42px', fontWeight: 700 }}>DEGEN</span>
              <span style={{ color: '#e8dfd4', fontSize: '42px', fontWeight: 700 }}>DOME</span>
            </div>
            <span style={{ color: '#555', fontSize: '20px' }}>BATTLE RESULT</span>
          </div>

          {/* Main content */}
          <div style={{ display: 'flex', flex: 1, padding: '0 50px', gap: '40px', alignItems: 'center', justifyContent: 'center' }}>
            {/* Winner */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              padding: '30px 50px',
              background: 'rgba(127, 186, 0, 0.1)',
              borderRadius: '16px',
              border: '2px solid rgba(127, 186, 0, 0.3)',
            }}>
              <div style={{ background: '#7fba00', color: 'black', padding: '6px 20px', borderRadius: '20px', fontSize: '14px', fontWeight: 700, marginBottom: '16px' }}>
                WINNER
              </div>
              <span style={{ color: '#e8dfd4', fontSize: '28px', fontWeight: 600, marginBottom: '20px' }}>
                {winner?.walletAddress?.slice(0, 4)}...{winner?.walletAddress?.slice(-4)}
              </span>
              <span style={{ color: '#7fba00', fontSize: '48px', fontWeight: 700 }}>
                +{winAmount} SOL
              </span>
            </div>

            {/* VS */}
            <span style={{ color: '#ff5500', fontSize: '36px', fontWeight: 700 }}>VS</span>

            {/* Loser */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              padding: '30px 50px',
              background: 'rgba(255, 255, 255, 0.02)',
              borderRadius: '16px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
            }}>
              <span style={{ color: '#e8dfd4', fontSize: '28px', fontWeight: 600, marginBottom: '20px' }}>
                {loser?.walletAddress?.slice(0, 4)}...{loser?.walletAddress?.slice(-4)}
              </span>
              <span style={{ color: '#cc2200', fontSize: '48px', fontWeight: 700 }}>
                {loserPnl >= 0 ? '+' : ''}{loserPnl.toFixed(1)}%
              </span>
            </div>
          </div>

          {/* Footer */}
          <div style={{ display: 'flex', justifyContent: 'center', padding: '30px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            <span style={{ color: '#444', fontSize: '18px' }}>degendome.xyz</span>
          </div>
        </div>
      ),
      {
        ...size,
      }
    );
  } catch {
    // Fallback image if battle not found
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
            <span style={{ color: '#ff5500', fontSize: '64px', fontWeight: 700 }}>DEGEN</span>
            <span style={{ color: '#e8dfd4', fontSize: '64px', fontWeight: 700 }}>DOME</span>
          </div>
          <span style={{ color: '#555', fontSize: '24px', marginTop: '20px' }}>Battle Result</span>
        </div>
      ),
      { ...size }
    );
  }
}
