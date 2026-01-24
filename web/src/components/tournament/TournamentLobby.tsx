'use client';

import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Tournament } from '@/hooks/useTournament';
import { EventCountdown } from '@/components/events/EventCountdown';

interface TournamentLobbyProps {
  tournament: Tournament;
  registeredCount: number;
  isRegistered: boolean;
  onRegister: () => Promise<void>;
}

export function TournamentLobby({
  tournament,
  registeredCount,
  isRegistered,
  onRegister
}: TournamentLobbyProps) {
  const { connected } = useWallet();
  const [registering, setRegistering] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRegister = async () => {
    setRegistering(true);
    setError(null);
    try {
      await onRegister();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setRegistering(false);
    }
  };

  const entryFeeSol = (tournament.entryFeeLamports / 1e9).toFixed(2);
  const prizePoolSol = (tournament.prizePoolLamports / 1e9).toFixed(2);
  const spotsRemaining = tournament.size - registeredCount;

  return (
    <div className="bg-black/40 backdrop-blur border border-white/10 rounded-lg p-6">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white">{tournament.name}</h2>
          <p className="text-white/60 mt-1">
            {tournament.size}-player single elimination
          </p>
        </div>
        <div className="text-right">
          {tournament.status === 'upcoming' || tournament.status === 'registration_open' ? (
            <>
              <p className="text-white/50 text-sm mb-1">Starts in</p>
              <EventCountdown targetTime={tournament.scheduledStartTime} size="lg" />
            </>
          ) : tournament.status === 'in_progress' ? (
            <span className="bg-success text-black px-3 py-1 rounded font-bold">LIVE</span>
          ) : (
            <span className="bg-white/20 text-white/60 px-3 py-1 rounded">Completed</span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white/5 rounded p-4 text-center">
          <p className="text-white/50 text-sm">Entry Fee</p>
          <p className="text-xl font-bold text-white">{entryFeeSol} SOL</p>
        </div>
        <div className="bg-white/5 rounded p-4 text-center">
          <p className="text-white/50 text-sm">Prize Pool</p>
          <p className="text-xl font-bold text-warning">{prizePoolSol} SOL</p>
        </div>
        <div className="bg-white/5 rounded p-4 text-center">
          <p className="text-white/50 text-sm">Spots</p>
          <p className="text-xl font-bold text-white">
            {registeredCount}/{tournament.size}
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-6">
        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-warning transition-all duration-300"
            style={{ width: `${(registeredCount / tournament.size) * 100}%` }}
          />
        </div>
        <p className="text-white/50 text-sm mt-2 text-center">
          {spotsRemaining} spot{spotsRemaining !== 1 ? 's' : ''} remaining
        </p>
      </div>

      {/* Registration button */}
      {tournament.status === 'registration_open' && (
        <div>
          {error && (
            <p className="text-danger text-sm mb-3 text-center">{error}</p>
          )}

          {!connected ? (
            <p className="text-white/50 text-center py-3">
              Connect wallet to register
            </p>
          ) : isRegistered ? (
            <div className="bg-success/20 border border-success/30 rounded p-3 text-center">
              <p className="text-success font-medium">You are registered!</p>
              <p className="text-white/50 text-sm mt-1">
                Be ready when the tournament starts
              </p>
            </div>
          ) : spotsRemaining === 0 ? (
            <p className="text-white/50 text-center py-3">Tournament is full</p>
          ) : (
            <button
              onClick={handleRegister}
              disabled={registering}
              className="w-full py-3 bg-warning text-black font-bold rounded hover:bg-warning/80 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {registering ? 'Registering...' : `Register (${entryFeeSol} SOL)`}
            </button>
          )}
        </div>
      )}

      {tournament.status === 'upcoming' && (
        <p className="text-white/50 text-center py-3">
          Registration opens {new Date(tournament.registrationOpens).toLocaleString()}
        </p>
      )}
    </div>
  );
}
