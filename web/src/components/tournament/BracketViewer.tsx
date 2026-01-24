'use client';

import { useMemo } from 'react';
import {
  SingleEliminationBracket,
  Match,
  SVGViewer,
  createTheme,
} from '@g-loot/react-tournament-brackets';
import { TournamentMatch, Tournament } from '@/hooks/useTournament';

interface BracketViewerProps {
  tournament: Tournament;
  matches: TournamentMatch[];
  onMatchClick?: (matchId: string) => void;
}

// Wasteland theme for bracket
const wastelandTheme = createTheme({
  textColor: { main: '#FFFFFF', highlighted: '#ff5500', dark: '#888888' },
  matchBackground: { wonColor: '#1a1a1a', lostColor: '#0d0d0d' },
  score: {
    background: { wonColor: '#ff5500', lostColor: '#333333' },
    text: { highlightedWonColor: '#000000', highlightedLostColor: '#ffffff' }
  },
  border: { color: '#333333', highlightedColor: '#ff5500' },
  roundHeader: { backgroundColor: '#111111', fontColor: '#ffffff' },
  connectorColor: '#333333',
  connectorColorHighlight: '#ff5500',
  svgBackground: '#080705',
});

const ROUND_NAMES: Record<number, Record<number, string>> = {
  8: { 1: 'Quarterfinals', 2: 'Semifinals', 3: 'Final' },
  16: { 1: 'Round of 16', 2: 'Quarterfinals', 3: 'Semifinals', 4: 'Final' }
};

export function BracketViewer({ tournament, matches, onMatchClick }: BracketViewerProps) {
  // Transform matches to library format
  const bracketMatches = useMemo(() => {
    const totalRounds = Math.log2(tournament.size);

    return matches.map(match => {
      const roundName = ROUND_NAMES[tournament.size]?.[match.round] || `Round ${match.round}`;

      return {
        id: match.id,
        name: roundName,
        nextMatchId: match.round < totalRounds
          ? matches.find(m => m.round === match.round + 1 && m.position === Math.floor(match.position / 2))?.id || null
          : null,
        tournamentRoundText: roundName,
        startTime: match.scheduledTime ? new Date(match.scheduledTime).toISOString() : '',
        state: match.status === 'completed' ? 'DONE' :
               match.status === 'in_progress' ? 'RUNNING' :
               match.status === 'ready' ? 'SCHEDULED' : 'NO_PARTY',
        participants: [
          {
            id: match.player1Wallet || 'tbd-1',
            name: match.player1Wallet
              ? match.player1Wallet.slice(0, 4) + '...' + match.player1Wallet.slice(-4)
              : 'TBD',
            isWinner: match.winnerWallet === match.player1Wallet,
            status: match.winnerWallet === match.player1Wallet ? 'PLAYED' :
                   match.status === 'completed' ? 'PLAYED' : null,
            resultText: match.winnerWallet === match.player1Wallet ? 'W' :
                       match.status === 'completed' && match.player1Wallet ? 'L' : null,
          },
          {
            id: match.player2Wallet || 'tbd-2',
            name: match.player2Wallet
              ? match.player2Wallet.slice(0, 4) + '...' + match.player2Wallet.slice(-4)
              : 'TBD',
            isWinner: match.winnerWallet === match.player2Wallet,
            status: match.winnerWallet === match.player2Wallet ? 'PLAYED' :
                   match.status === 'completed' ? 'PLAYED' : null,
            resultText: match.winnerWallet === match.player2Wallet ? 'W' :
                       match.status === 'completed' && match.player2Wallet ? 'L' : null,
          },
        ],
      };
    });
  }, [matches, tournament.size]);

  if (matches.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-white/50">
        Bracket will be generated when tournament starts
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto">
      <div className="min-w-[800px]">
        <SingleEliminationBracket
          matches={bracketMatches as any}
          matchComponent={({ match, ...rest }: any) => (
            <Match
              match={match}
              {...rest}
              onMatchClick={() => onMatchClick?.(match.id)}
            />
          )}
          theme={wastelandTheme}
          options={{
            style: {
              roundHeader: {
                backgroundColor: '#111111',
                fontColor: '#ffffff',
              },
              connectorColor: '#333333',
              connectorColorHighlight: '#ff5500',
            },
          }}
          svgWrapper={({ children, ...props }: any) => (
            <SVGViewer
              width={800}
              height={tournament.size === 8 ? 400 : 600}
              background="#080705"
              SVGBackground="#080705"
              {...props}
            >
              {children}
            </SVGViewer>
          )}
        />
      </div>
    </div>
  );
}
