'use client';

import { useParams, useRouter } from 'next/navigation';
import { useWallet } from '@solana/wallet-adapter-react';
import { useTournament } from '@/hooks/useTournament';
import { TournamentLobby } from '@/components/tournament/TournamentLobby';
import { BracketViewer } from '@/components/tournament/BracketViewer';

export default function TournamentPage() {
  const params = useParams();
  const router = useRouter();
  const { publicKey } = useWallet();
  const tournamentId = params.id as string;

  const { tournament, matches, loading, error, register } = useTournament(tournamentId);

  if (loading) {
    return (
      <main className="min-h-screen bg-primary flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-warning"></div>
      </main>
    );
  }

  if (error || !tournament) {
    return (
      <main className="min-h-screen bg-primary flex flex-col items-center justify-center">
        <p className="text-danger mb-4">{error || 'Tournament not found'}</p>
        <button
          onClick={() => router.push('/tournaments')}
          className="text-warning hover:underline"
        >
          Back to Tournaments
        </button>
      </main>
    );
  }

  const handleRegister = async () => {
    if (!publicKey) throw new Error('Wallet not connected');
    await register(publicKey.toBase58());
  };

  const handleMatchClick = (matchId: string) => {
    const match = matches.find(m => m.id === matchId);
    if (match?.battleId) {
      router.push(`/battle/${match.battleId}`);
    }
  };

  // Count registered players from matches (first round has all players)
  const firstRoundMatches = matches.filter(m => m.round === 1);
  const registeredCount = firstRoundMatches.reduce((count, m) => {
    let playerCount = 0;
    if (m.player1Wallet) playerCount++;
    if (m.player2Wallet) playerCount++;
    return count + playerCount;
  }, 0);

  // Check if current user is registered
  const isRegistered = publicKey && matches.some(m =>
    m.player1Wallet === publicKey.toBase58() || m.player2Wallet === publicKey.toBase58()
  );

  return (
    <main className="min-h-screen bg-primary">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Back link */}
        <button
          onClick={() => router.push('/tournaments')}
          className="text-white/50 hover:text-white mb-6 flex items-center gap-2"
        >
          <span>&larr;</span> All Tournaments
        </button>

        {/* Lobby (before tournament starts) */}
        {(tournament.status === 'upcoming' || tournament.status === 'registration_open') && (
          <TournamentLobby
            tournament={tournament}
            registeredCount={registeredCount}
            isRegistered={!!isRegistered}
            onRegister={handleRegister}
          />
        )}

        {/* Bracket (after tournament starts) */}
        {(tournament.status === 'in_progress' || tournament.status === 'completed') && (
          <div className="bg-black/40 backdrop-blur border border-white/10 rounded-lg p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-white">{tournament.name}</h2>
              {tournament.status === 'in_progress' ? (
                <span className="bg-success text-black px-3 py-1 rounded font-bold">LIVE</span>
              ) : (
                <span className="bg-white/20 text-white/60 px-3 py-1 rounded">Completed</span>
              )}
            </div>

            <BracketViewer
              tournament={tournament}
              matches={matches}
              onMatchClick={handleMatchClick}
            />
          </div>
        )}

        {/* Cancelled state */}
        {tournament.status === 'cancelled' && (
          <div className="bg-black/40 backdrop-blur border border-white/10 rounded-lg p-6">
            <div className="text-center py-8">
              <h2 className="text-2xl font-bold text-white mb-2">{tournament.name}</h2>
              <p className="text-danger">This tournament has been cancelled</p>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
