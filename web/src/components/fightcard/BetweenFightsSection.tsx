'use client';

import Link from 'next/link';
import { Target, Trophy, Skull, Swords, Users, Coins } from 'lucide-react';
import type { SideGame } from '@/types/fightcard';

interface BetweenFightsSectionProps {
  games?: SideGame[];
}

// Default side games if none provided
const DEFAULT_GAMES: SideGame[] = [
  {
    id: 'oracle',
    name: 'Oracle',
    icon: 'target',
    href: '/predict',
    description: '30-second price predictions',
    playersActive: 47,
  },
  {
    id: 'draft',
    name: 'Draft',
    icon: 'trophy',
    href: '/draft',
    description: 'Weekly memecoin tournaments',
    playersActive: 89,
  },
  {
    id: 'lds',
    name: 'Last Degen Standing',
    icon: 'skull',
    href: '/lds',
    description: 'Battle royale elimination',
    playersActive: 23,
  },
  {
    id: 'token-wars',
    name: 'Token Wars',
    icon: 'swords',
    href: '/token-wars',
    description: 'Head-to-head token battles',
    playersActive: 34,
    currentPool: 8.5,
  },
];

// Icon mapping
const IconMap: Record<string, React.ReactNode> = {
  target: <Target className="w-6 h-6" />,
  trophy: <Trophy className="w-6 h-6" />,
  skull: <Skull className="w-6 h-6" />,
  swords: <Swords className="w-6 h-6" />,
};

export function BetweenFightsSection({
  games = DEFAULT_GAMES,
}: BetweenFightsSectionProps) {
  return (
    <section className="mb-8">
      {/* Section header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
            <span className="text-lg">
              <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5 text-white/40" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="3" />
                <path d="M12 1v4M12 19v4M1 12h4M19 12h4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83" />
              </svg>
            </span>
          </div>
          <div>
            <h2 className="text-lg font-black uppercase tracking-wider text-white">
              Between Fights
            </h2>
            <p className="text-xs text-white/40">Side games while you wait</p>
          </div>
        </div>
      </div>

      {/* Game cards grid - 2x2 on mobile, 4x1 on desktop */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {games.map((game) => (
          <GameCard key={game.id} game={game} />
        ))}
      </div>
    </section>
  );
}

function GameCard({ game }: { game: SideGame }) {
  const icon = IconMap[game.icon] || <Target className="w-6 h-6" />;

  return (
    <Link
      href={game.href}
      className="group relative flex flex-col p-4 rounded-xl
        bg-white/[0.02] border border-white/[0.06]
        hover:bg-white/[0.04] hover:border-white/10
        transition-all duration-200"
    >
      {/* Icon and title row */}
      <div className="flex items-start gap-3 mb-2">
        <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-white/60 group-hover:text-white/80 group-hover:border-white/20 transition-colors">
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-sm text-white truncate">{game.name}</h3>
          <p className="text-xs text-white/40 line-clamp-2">{game.description}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-3 mt-auto pt-2 border-t border-white/[0.04]">
        {game.playersActive !== undefined && game.playersActive > 0 && (
          <div className="flex items-center gap-1 text-white/40">
            <Users className="w-3 h-3" />
            <span className="text-xs">{game.playersActive}</span>
          </div>
        )}
        {game.currentPool !== undefined && game.currentPool > 0 && (
          <div className="flex items-center gap-1 text-success/60">
            <Coins className="w-3 h-3" />
            <span className="text-xs">{game.currentPool} SOL</span>
          </div>
        )}
      </div>

      {/* Hover indicator */}
      <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
        <svg className="w-4 h-4 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </Link>
  );
}
