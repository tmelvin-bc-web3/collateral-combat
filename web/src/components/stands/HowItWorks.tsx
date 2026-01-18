'use client';

import { Info, ChevronDown, Search, Target, Eye, Gift } from 'lucide-react';

const STEPS = [
  {
    icon: Search,
    title: 'Find a Battle',
    description: 'Browse live Arena battles, Token Wars, or Last Degen Standing games.',
  },
  {
    icon: Target,
    title: 'Back Your Champion',
    description: 'Place a wager on the fighter you think will win. Odds update in real-time.',
  },
  {
    icon: Eye,
    title: 'Watch the Action',
    description: "See the battle unfold live. Spectator pools grow as more bets come in.",
  },
  {
    icon: Gift,
    title: 'Claim Your Winnings',
    description: 'If your champion wins, claim your share of the spectator pool!',
  },
];

export function HowItWorks() {
  return (
    <details className="group bg-[#1a1a1a] border border-white/[0.06] rounded-xl overflow-hidden mt-8">
      <summary className="flex items-center justify-between p-4 cursor-pointer hover:bg-white/5 transition-colors list-none">
        <div className="flex items-center gap-2">
          <Info className="w-5 h-5 text-warning" />
          <span className="font-semibold">How Spectator Betting Works</span>
        </div>
        <ChevronDown className="w-4 h-4 text-white/40 transition-transform group-open:rotate-180" />
      </summary>

      <div className="px-4 pb-4 pt-2">
        <div className="grid md:grid-cols-2 gap-4">
          {STEPS.map((step, index) => (
            <div key={index} className="flex gap-3">
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-warning/20 flex items-center justify-center">
                <span className="text-sm font-bold text-warning">{index + 1}</span>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <step.icon className="w-4 h-4 text-warning" />
                  <strong className="text-sm">{step.title}</strong>
                </div>
                <p className="text-xs text-white/50">{step.description}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 pt-4 border-t border-white/[0.06] text-xs text-white/40">
          <strong className="text-white/60">Note:</strong> Spectator betting uses a parimutuel pool system.
          Your potential payout depends on the total pool and how many others bet on the same fighter.
          Odds adjust in real-time as bets come in.
        </div>
      </div>
    </details>
  );
}
