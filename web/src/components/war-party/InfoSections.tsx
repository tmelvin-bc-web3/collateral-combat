'use client';

import { Trophy, ScrollText, Zap, ChevronDown, Medal } from 'lucide-react';
import { PastWinner, TIER_CONFIG } from './types';

interface InfoSectionsProps {
  pastWinners?: PastWinner[];
}

function CollapsibleSection({
  title,
  icon: Icon,
  children,
  defaultOpen = false,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <details className="group bg-[#1a1a1a] border border-white/[0.06] rounded-xl overflow-hidden" open={defaultOpen}>
      <summary className="flex items-center justify-between p-4 cursor-pointer hover:bg-white/5 transition-colors list-none">
        <div className="flex items-center gap-2">
          <Icon className="w-5 h-5 text-warning" />
          <span className="font-semibold uppercase tracking-wide">{title}</span>
        </div>
        <ChevronDown className="w-4 h-4 text-white/40 transition-transform group-open:rotate-180" />
      </summary>
      <div className="px-4 pb-4 pt-2">{children}</div>
    </details>
  );
}

function PastChampionsSection({ winners }: { winners: PastWinner[] }) {
  if (winners.length === 0) {
    return (
      <div className="text-center py-4 text-white/40 text-sm">
        No past champions yet. Be the first!
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {winners.map((winner, idx) => {
        // Find tier color
        const tierConfig = Object.entries(TIER_CONFIG).find(
          ([, config]) => config.name === winner.tier
        );
        const tierColor = tierConfig ? tierConfig[1].color : 'warning';

        return (
          <div
            key={idx}
            className="bg-white/5 border border-white/[0.06] rounded-lg p-3"
          >
            <div className="flex items-center gap-2 mb-2">
              <Medal className={`w-4 h-4 text-${tierColor}`} />
              <span className="text-xs text-white/40">Week {winner.week}</span>
            </div>
            <div className="font-semibold text-sm truncate">{winner.name}</div>
            <div className="flex items-center justify-between mt-1">
              <span className={`text-xs text-${tierColor}`}>{winner.tier}</span>
              <span className="text-xs text-success">
                +{winner.performance.toFixed(1)}% | {winner.prize.toFixed(2)} SOL
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function RulesSection() {
  const rules = [
    {
      step: 1,
      title: 'Choose Your Tier',
      description: 'Pick your entry fee tier based on your risk appetite.',
    },
    {
      step: 2,
      title: 'Draft Your Squad',
      description: 'Select 6 memecoins to form your portfolio.',
    },
    {
      step: 3,
      title: 'Wait for Battle',
      description: 'Once enrollment closes, the war begins at market open.',
    },
    {
      step: 4,
      title: 'Track Performance',
      description: 'Your squad\'s combined % gain determines your rank.',
    },
    {
      step: 5,
      title: 'Claim Victory',
      description: 'Top 10% split the prize pool. Winners take all.',
    },
  ];

  return (
    <div className="space-y-3">
      {rules.map((rule) => (
        <div key={rule.step} className="flex gap-3">
          <div className="flex-shrink-0 w-7 h-7 rounded-full bg-warning/20 flex items-center justify-center">
            <span className="text-sm font-bold text-warning">{rule.step}</span>
          </div>
          <div>
            <div className="font-semibold text-sm">{rule.title}</div>
            <div className="text-xs text-white/50">{rule.description}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function WeaponsSection() {
  const weapons = [
    {
      name: 'Double Down',
      description: '2x the weight on one pick. High risk, high reward.',
      icon: '2x',
    },
    {
      name: 'Shield',
      description: 'Protect one pick from negative gains for 24h.',
      icon: 'S',
    },
    {
      name: 'Swap',
      description: 'Replace one coin mid-week (limited availability).',
      icon: 'SW',
    },
  ];

  return (
    <div className="space-y-3">
      {weapons.map((weapon) => (
        <div
          key={weapon.name}
          className="flex items-start gap-3 bg-white/5 rounded-lg p-3"
        >
          <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-warning/20 flex items-center justify-center">
            <span className="text-sm font-bold text-warning">{weapon.icon}</span>
          </div>
          <div>
            <div className="font-semibold text-sm">{weapon.name}</div>
            <div className="text-xs text-white/50">{weapon.description}</div>
          </div>
        </div>
      ))}
      <p className="text-xs text-white/30 italic">
        Weapons are earned through progression or purchased with points.
      </p>
    </div>
  );
}

export function InfoSections({ pastWinners = [] }: InfoSectionsProps) {
  return (
    <div className="space-y-3">
      <CollapsibleSection title="Past Champions" icon={Trophy}>
        <PastChampionsSection winners={pastWinners} />
      </CollapsibleSection>

      <CollapsibleSection title="Rules of War" icon={ScrollText}>
        <RulesSection />
      </CollapsibleSection>

      <CollapsibleSection title="Wasteland Weapons" icon={Zap}>
        <WeaponsSection />
      </CollapsibleSection>
    </div>
  );
}
