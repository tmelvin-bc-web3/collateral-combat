import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { BattleShareButtons } from '@/components/BattleShareButtons';

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ref?: string }>;
}

// Dynamic metadata for Twitter Cards
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;

  return {
    title: `Battle Result | DegenDome`,
    description: 'Check out this battle result on DegenDome - the UFC of crypto trading!',
    openGraph: {
      title: 'Battle Result | DegenDome',
      description: 'Check out this battle result on DegenDome!',
      type: 'website',
      images: [
        {
          url: `/battle/${id}/result/opengraph-image`,
          width: 1200,
          height: 630,
          alt: 'Battle Result',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: 'Battle Result | DegenDome',
      description: 'Check out this battle result on DegenDome!',
      images: [`/battle/${id}/result/opengraph-image`],
    },
  };
}

interface BattlePlayer {
  walletAddress: string;
  account?: {
    totalPnlPercent?: number;
  };
  finalPnl?: number;
}

interface BattleConfig {
  entryFee?: number;
  duration?: number;
}

interface BattleData {
  id: string;
  status: string;
  players: BattlePlayer[];
  winnerId?: string;
  prizePool: number;
  config?: BattleConfig;
}

async function getBattleResult(id: string): Promise<BattleData | null> {
  try {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';
    const res = await fetch(`${backendUrl}/api/battles/${id}`, {
      next: { revalidate: 60 }, // Cache for 1 minute
    });

    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export default async function BattleResultPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const { ref } = await searchParams;

  const battle = await getBattleResult(id);

  if (!battle || battle.status !== 'completed') {
    notFound();
  }

  const winner = battle.players.find((p) => p.walletAddress === battle.winnerId);
  const loser = battle.players.find((p) => p.walletAddress !== battle.winnerId);

  const winAmount = battle.prizePool * 0.95; // After 5% fee

  // Get PnL for each player
  const getPlayerPnl = (player: BattlePlayer | undefined): number => {
    if (!player) return 0;
    return player.finalPnl ?? player.account?.totalPnlPercent ?? 0;
  };

  const player1 = battle.players[0];
  const player2 = battle.players[1];
  const player1Pnl = getPlayerPnl(player1);
  const player2Pnl = getPlayerPnl(player2);

  return (
    <div className="min-h-screen bg-[#080705] text-white">
      {/* Header */}
      <header className="border-b border-white/10 bg-black/60 backdrop-blur">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <a href="/" className="flex items-baseline">
            <span className="text-[#ff5500] text-2xl font-bold">DEGEN</span>
            <span className="text-[#e8dfd4] text-2xl font-bold">DOME</span>
          </a>
          <span className="text-white/40 text-sm">BATTLE RESULT</span>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-4xl mx-auto px-4 py-12">
        {/* Result card */}
        <div className="bg-black/40 backdrop-blur border border-white/10 rounded-2xl overflow-hidden">
          {/* Winner banner */}
          <div className="bg-gradient-to-r from-[#7fba00]/20 to-[#7fba00]/5 border-b border-[#7fba00]/20 px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[#7fba00] text-sm font-medium">WINNER</div>
                <div className="text-white text-2xl font-bold">
                  {winner?.walletAddress?.slice(0, 4)}...{winner?.walletAddress?.slice(-4)}
                </div>
              </div>
              <div className="text-right">
                <div className="text-[#7fba00] text-3xl font-bold">
                  +{winAmount.toFixed(2)} SOL
                </div>
              </div>
            </div>
          </div>

          {/* Battle stats */}
          <div className="p-6">
            <div className="grid grid-cols-2 gap-6 mb-8">
              {/* Fighter 1 */}
              <div className={`p-4 rounded-xl ${winner?.walletAddress === player1?.walletAddress ? 'bg-[#7fba00]/10 border border-[#7fba00]/20' : 'bg-white/5'}`}>
                <div className="text-white/40 text-xs mb-1">FIGHTER 1</div>
                <div className="text-white font-medium mb-2">
                  {player1?.walletAddress?.slice(0, 4)}...{player1?.walletAddress?.slice(-4)}
                </div>
                <div className={`text-2xl font-bold ${player1Pnl >= 0 ? 'text-[#7fba00]' : 'text-[#cc2200]'}`}>
                  {player1Pnl >= 0 ? '+' : ''}{player1Pnl.toFixed(1)}%
                </div>
              </div>

              {/* Fighter 2 */}
              <div className={`p-4 rounded-xl ${winner?.walletAddress === player2?.walletAddress ? 'bg-[#7fba00]/10 border border-[#7fba00]/20' : 'bg-white/5'}`}>
                <div className="text-white/40 text-xs mb-1">FIGHTER 2</div>
                <div className="text-white font-medium mb-2">
                  {player2?.walletAddress?.slice(0, 4)}...{player2?.walletAddress?.slice(-4)}
                </div>
                <div className={`text-2xl font-bold ${player2Pnl >= 0 ? 'text-[#7fba00]' : 'text-[#cc2200]'}`}>
                  {player2Pnl >= 0 ? '+' : ''}{player2Pnl.toFixed(1)}%
                </div>
              </div>
            </div>

            {/* Stats row */}
            <div className="flex justify-center gap-8 py-4 border-t border-white/10">
              <div className="text-center">
                <div className="text-white/40 text-xs">ENTRY FEE</div>
                <div className="text-white font-medium">{battle.config?.entryFee?.toFixed(2) ?? '0.10'} SOL</div>
              </div>
              <div className="text-center">
                <div className="text-white/40 text-xs">DURATION</div>
                <div className="text-white font-medium">{Math.floor((battle.config?.duration || 300) / 60)} min</div>
              </div>
              <div className="text-center">
                <div className="text-white/40 text-xs">PRIZE POOL</div>
                <div className="text-white font-medium">{battle.prizePool?.toFixed(2)} SOL</div>
              </div>
            </div>
          </div>

          {/* Share section */}
          <div className="border-t border-white/10 p-6">
            <div className="text-center mb-4">
              <div className="text-white/60 text-sm">Share this battle</div>
            </div>
            <div className="flex justify-center">
              <BattleShareButtons
                battleId={id}
                winAmount={winAmount}
                isWinner={true}
                referralCode={ref}
              />
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center mt-8">
          <a
            href="/battle"
            className="inline-block px-8 py-3 bg-[#ff5500] hover:bg-[#ff5500]/80 text-white font-bold rounded-lg transition-colors"
          >
            Start Your Own Battle
          </a>
        </div>
      </main>
    </div>
  );
}
