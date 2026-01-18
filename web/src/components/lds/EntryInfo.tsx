'use client';

interface EntryInfoProps {
  entryFee: number;
  rakePercent: number;
  minPlayers: number;
  maxPlayers: number;
}

export function EntryInfo({ entryFee, rakePercent, minPlayers, maxPlayers }: EntryInfoProps) {
  return (
    <div className="bg-[#2a2a2a] border border-white/[0.06] rounded-xl p-4">
      <div className="space-y-3">
        <div className="flex justify-between items-center py-2 border-b border-white/[0.06] text-sm">
          <span className="text-white/60">Entry Fee</span>
          <span className="text-white font-medium">{entryFee} SOL</span>
        </div>
        <div className="flex justify-between items-center py-2 border-b border-white/[0.06] text-sm">
          <span className="text-white/60">Platform Fee</span>
          <span className="text-white font-medium">{rakePercent}%</span>
        </div>
        <div className="flex justify-between items-center py-2 border-b border-white/[0.06] text-sm">
          <span className="text-white/60">Min Players</span>
          <span className="text-white font-medium">{minPlayers}</span>
        </div>
        <div className="flex justify-between items-center py-2 text-sm">
          <span className="text-white/60">Max Players</span>
          <span className="text-white font-medium">{maxPlayers}</span>
        </div>
      </div>
    </div>
  );
}
