'use client';

import { Calendar, Clock, Users, Flame } from 'lucide-react';
import Link from 'next/link';

interface Fighter {
  name: string;
  record: string;
  elo: number;
  avatar?: string;
}

interface FightCard {
  fighter1: Fighter;
  fighter2: Fighter;
  stakes: number;
  isMainEvent?: boolean;
}

interface FightNightProps {
  eventName: string;
  tagline: string;
  date: Date;
  fightCard: FightCard[];
  registeredCount?: number;
  prizePool?: number;
}

// Default fight night data - CT Showdown
const DEFAULT_FIGHT_NIGHT: FightNightProps = {
  eventName: 'CT SHOWDOWN',
  tagline: 'Crypto Twitter\'s Finest Enter The Dome',
  date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
  registeredCount: 47,
  prizePool: 125,
  fightCard: [
    {
      fighter1: { name: 'GCR.eth', record: '23-4', elo: 1920 },
      fighter2: { name: 'Hsaka', record: '19-6', elo: 1850 },
      stakes: 10,
      isMainEvent: true,
    },
    {
      fighter1: { name: 'CryptoCobain', record: '31-8', elo: 1780 },
      fighter2: { name: 'Pentoshi', record: '28-11', elo: 1740 },
      stakes: 5,
    },
    {
      fighter1: { name: 'TheDeFiEdge', record: '15-3', elo: 1690 },
      fighter2: { name: 'Blknoiz06', record: '18-7', elo: 1650 },
      stakes: 3,
    },
    {
      fighter1: { name: 'ColdBloodShill', record: '12-5', elo: 1580 },
      fighter2: { name: 'AltcoinPsycho', record: '14-6', elo: 1560 },
      stakes: 2,
    },
  ],
};

function formatCountdown(date: Date): string {
  const now = new Date();
  const diff = date.getTime() - now.getTime();

  if (diff <= 0) return 'LIVE NOW';

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

  if (days > 0) {
    return `${days}d ${hours}h`;
  }

  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours}h ${minutes}m`;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function UpcomingFightNight({
  eventName = DEFAULT_FIGHT_NIGHT.eventName,
  tagline = DEFAULT_FIGHT_NIGHT.tagline,
  date = DEFAULT_FIGHT_NIGHT.date,
  fightCard = DEFAULT_FIGHT_NIGHT.fightCard,
  registeredCount = DEFAULT_FIGHT_NIGHT.registeredCount,
  prizePool = DEFAULT_FIGHT_NIGHT.prizePool,
}: Partial<FightNightProps> = {}) {
  const mainEvent = fightCard.find(f => f.isMainEvent) || fightCard[0];
  const undercard = fightCard.filter(f => !f.isMainEvent);

  return (
    <section className="mb-8">
      {/* Event Header */}
      <div className="relative overflow-hidden rounded-t-xl bg-gradient-to-r from-fire/20 via-rust/30 to-fire/20 border border-rust/40 border-b-0">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,85,0,0.1) 10px, rgba(255,85,0,0.1) 20px)',
          }} />
        </div>

        <div className="relative px-6 py-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Flame className="w-5 h-5 text-fire" />
                <span className="text-[10px] uppercase tracking-[3px] text-fire font-bold">
                  Upcoming Event
                </span>
              </div>
              <h2 className="text-2xl md:text-3xl font-black uppercase tracking-wider text-white" style={{ fontFamily: 'Impact, sans-serif' }}>
                {eventName}
              </h2>
              <p className="text-sm text-white/60 mt-1">{tagline}</p>
            </div>

            <div className="flex items-center gap-6">
              <div className="text-right">
                <div className="flex items-center gap-2 text-white/60 text-xs mb-1">
                  <Calendar className="w-3.5 h-3.5" />
                  {formatDate(date)}
                </div>
                <div className="text-2xl font-black text-fire">
                  {formatCountdown(date)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Event */}
      <div className="bg-gradient-to-b from-black/60 to-black/40 border-x border-rust/40 p-6">
        <div className="text-center mb-4">
          <span className="inline-block px-3 py-1 rounded bg-fire/20 text-fire text-[10px] uppercase tracking-widest font-bold border border-fire/30">
            Main Event
          </span>
        </div>

        <div className="flex items-center justify-center gap-4 md:gap-8">
          {/* Fighter 1 */}
          <div className="flex-1 text-right">
            <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-gradient-to-br from-rust/40 to-black border-2 border-rust/60 ml-auto mb-2 flex items-center justify-center">
              <span className="text-2xl md:text-3xl font-black text-white/80">
                {mainEvent.fighter1.name.charAt(0)}
              </span>
            </div>
            <h3 className="text-lg md:text-xl font-black text-white truncate">
              {mainEvent.fighter1.name}
            </h3>
            <p className="text-sm text-white/60">{mainEvent.fighter1.record}</p>
            <p className="text-xs text-fire">ELO {mainEvent.fighter1.elo}</p>
          </div>

          {/* VS */}
          <div className="flex flex-col items-center">
            <div className="text-3xl md:text-4xl font-black text-fire" style={{ fontFamily: 'Impact, sans-serif' }}>
              VS
            </div>
            <div className="text-xs text-white/40 mt-1">{mainEvent.stakes} SOL</div>
          </div>

          {/* Fighter 2 */}
          <div className="flex-1 text-left">
            <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-gradient-to-br from-rust/40 to-black border-2 border-rust/60 mr-auto mb-2 flex items-center justify-center">
              <span className="text-2xl md:text-3xl font-black text-white/80">
                {mainEvent.fighter2.name.charAt(0)}
              </span>
            </div>
            <h3 className="text-lg md:text-xl font-black text-white truncate">
              {mainEvent.fighter2.name}
            </h3>
            <p className="text-sm text-white/60">{mainEvent.fighter2.record}</p>
            <p className="text-xs text-fire">ELO {mainEvent.fighter2.elo}</p>
          </div>
        </div>
      </div>

      {/* Undercard */}
      <div className="bg-black/40 border-x border-rust/40">
        <div className="px-6 py-3 border-b border-rust/20">
          <span className="text-[10px] uppercase tracking-widest text-white/40 font-bold">
            Undercard
          </span>
        </div>

        <div className="divide-y divide-rust/10">
          {undercard.map((fight, index) => (
            <div key={index} className="px-6 py-3 flex items-center justify-between hover:bg-white/5 transition-colors">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <span className="text-sm font-bold text-white truncate">{fight.fighter1.name}</span>
                <span className="text-xs text-white/40">({fight.fighter1.record})</span>
              </div>

              <div className="px-3 text-center shrink-0">
                <span className="text-xs font-bold text-fire">VS</span>
                <div className="text-[10px] text-white/40">{fight.stakes} SOL</div>
              </div>

              <div className="flex items-center gap-3 flex-1 min-w-0 justify-end">
                <span className="text-xs text-white/40">({fight.fighter2.record})</span>
                <span className="text-sm font-bold text-white truncate">{fight.fighter2.name}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer with stats and CTA */}
      <div className="rounded-b-xl bg-black/60 border border-t-0 border-rust/40 px-6 py-4 flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 text-white/60 text-sm">
            <Users className="w-4 h-4" />
            <span>{registeredCount} registered</span>
          </div>
          <div className="flex items-center gap-2 text-white/60 text-sm">
            <span className="text-fire font-bold">{prizePool} SOL</span>
            <span>prize pool</span>
          </div>
        </div>

        <Link
          href="/events"
          className="px-6 py-2.5 rounded-lg bg-fire text-black font-bold text-sm uppercase tracking-wider hover:bg-fire/90 transition-colors active:scale-95"
        >
          View Event
        </Link>
      </div>
    </section>
  );
}
