'use client';

import { TournamentMatch } from '@/hooks/useTournament';

interface MatchCardProps {
  match: TournamentMatch;
  roundName: string;
  onWatch?: () => void;
}

export function MatchCard({ match, roundName, onWatch }: MatchCardProps) {
  const formatWallet = (wallet: string | null) =>
    wallet ? wallet.slice(0, 4) + '...' + wallet.slice(-4) : 'TBD';

  const getStatusBadge = () => {
    switch (match.status) {
      case 'in_progress':
        return <span className="bg-success text-black text-xs px-2 py-0.5 rounded font-bold">LIVE</span>;
      case 'completed':
        return <span className="bg-white/20 text-white/60 text-xs px-2 py-0.5 rounded">Complete</span>;
      case 'ready':
        return <span className="bg-warning text-black text-xs px-2 py-0.5 rounded">Ready</span>;
      default:
        return <span className="bg-white/10 text-white/50 text-xs px-2 py-0.5 rounded">Pending</span>;
    }
  };

  const isWinner = (wallet: string | null) => wallet && wallet === match.winnerWallet;

  return (
    <div className="bg-black/60 border border-white/10 rounded-lg p-3 min-w-[200px]">
      <div className="flex justify-between items-center mb-2">
        <span className="text-white/50 text-xs">{roundName}</span>
        {getStatusBadge()}
      </div>

      <div className="space-y-2">
        <div className={`flex items-center justify-between p-2 rounded ${
          isWinner(match.player1Wallet) ? 'bg-success/20 border border-success/30' : 'bg-white/5'
        }`}>
          <span className={`font-mono ${isWinner(match.player1Wallet) ? 'text-success font-bold' : 'text-white'}`}>
            {formatWallet(match.player1Wallet)}
          </span>
          {isWinner(match.player1Wallet) && <span className="text-success">W</span>}
        </div>

        <div className="text-center text-white/30 text-xs">VS</div>

        <div className={`flex items-center justify-between p-2 rounded ${
          isWinner(match.player2Wallet) ? 'bg-success/20 border border-success/30' : 'bg-white/5'
        }`}>
          <span className={`font-mono ${isWinner(match.player2Wallet) ? 'text-success font-bold' : 'text-white'}`}>
            {formatWallet(match.player2Wallet)}
          </span>
          {isWinner(match.player2Wallet) && <span className="text-success">W</span>}
        </div>
      </div>

      {match.status === 'in_progress' && match.battleId && (
        <button
          onClick={onWatch}
          className="w-full mt-2 py-1.5 bg-warning text-black rounded text-sm font-medium hover:bg-warning/80"
        >
          Watch Live
        </button>
      )}
    </div>
  );
}
