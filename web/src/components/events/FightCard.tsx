'use client';

import { FightCardEvent, EventBattle } from '@/hooks/useEvents';
import { EventCountdown } from './EventCountdown';

interface FightCardProps {
  event: FightCardEvent;
  onSubscribe?: () => void;
  isSubscribed?: boolean;
}

export function FightCard({ event, onSubscribe, isSubscribed }: FightCardProps) {
  const mainEvent = event.battles.find(b => b.isMainEvent);
  const undercard = event.battles.filter(b => !b.isMainEvent).sort((a, b) => a.position - b.position);

  return (
    <div className="bg-black/40 backdrop-blur border border-white/10 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-warning/20 to-transparent p-4 border-b border-white/10">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-xl font-bold text-white">{event.name}</h2>
            {event.description && (
              <p className="text-white/60 text-sm mt-1">{event.description}</p>
            )}
          </div>
          <div className="text-right">
            <EventCountdown targetTime={event.scheduledStartTime} size="md" />
            <p className="text-white/50 text-xs mt-1">
              {new Date(event.scheduledStartTime).toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>

      {/* Main Event */}
      {mainEvent && (
        <div className="p-4 bg-warning/5 border-b border-white/10">
          <span className="text-warning text-xs font-bold uppercase tracking-wider">Main Event</span>
          <BattleCard battle={mainEvent} isMain />
        </div>
      )}

      {/* Undercard */}
      {undercard.length > 0 && (
        <div className="p-4 space-y-3">
          <span className="text-white/50 text-xs uppercase tracking-wider">Undercard</span>
          {undercard.map(battle => (
            <BattleCard key={battle.id} battle={battle} />
          ))}
        </div>
      )}

      {/* Subscribe Button */}
      {event.status === 'upcoming' || event.status === 'registration_open' ? (
        <div className="p-4 border-t border-white/10">
          <button
            onClick={onSubscribe}
            className={`w-full py-2 rounded font-medium transition-colors ${
              isSubscribed
                ? 'bg-white/10 text-white/50 cursor-default'
                : 'bg-warning text-black hover:bg-warning/80'
            }`}
            disabled={isSubscribed}
          >
            {isSubscribed ? 'Subscribed for Notifications' : 'Get Notified'}
          </button>
        </div>
      ) : null}
    </div>
  );
}

function BattleCard({ battle, isMain = false }: { battle: EventBattle; isMain?: boolean }) {
  const formatWallet = (wallet: string) => wallet.slice(0, 4) + '...' + wallet.slice(-4);

  return (
    <div className={`flex items-center justify-between py-2 ${isMain ? 'text-lg' : 'text-sm'}`}>
      <span className="text-white font-medium">{formatWallet(battle.player1Wallet)}</span>
      <span className="text-warning font-bold mx-4">VS</span>
      <span className="text-white font-medium">{formatWallet(battle.player2Wallet)}</span>
      <span className={`ml-4 text-xs px-2 py-0.5 rounded ${
        battle.status === 'in_progress' ? 'bg-success text-black' :
        battle.status === 'completed' ? 'bg-white/20 text-white/50' :
        'bg-white/10 text-white/50'
      }`}>
        {battle.status === 'in_progress' ? 'LIVE' : battle.status.toUpperCase()}
      </span>
    </div>
  );
}
