'use client';

import Link from 'next/link';
import { Wallet, Gamepad2, Coins, ChevronRight, ExternalLink } from 'lucide-react';

interface HowItWorksProps {
  onStartPlaying?: () => void;
}

export function HowItWorks({ onStartPlaying }: HowItWorksProps) {
  return (
    <section className="mb-20 mt-4">
      {/* Section Header */}
      <div className="text-center mb-8">
        <h2 className="text-xl font-black uppercase tracking-wider text-white mb-2">New to the Dome?</h2>
        <p className="text-sm text-white/40">Get started in 60 seconds</p>
      </div>

      {/* Steps */}
      <div className="grid md:grid-cols-3 gap-4 mb-8">
        <StepCard
          number={1}
          icon={<Wallet className="w-6 h-6" />}
          title="Connect Wallet"
          description="Phantom, Solflare, or any Solana wallet. No signup. No KYC."
        />
        <StepCard
          number={2}
          icon={<Gamepad2 className="w-6 h-6" />}
          title="Pick a Game"
          description="Start with Oracle - it's the easiest. 30 second rounds, 0.01 SOL minimum."
          highlight
        />
        <StepCard
          number={3}
          icon={<Coins className="w-6 h-6" />}
          title="Win & Withdraw"
          description="Beat other players, take their SOL. Instant withdrawals to your wallet."
        />
      </div>

      {/* Connectors for desktop */}
      <div className="hidden md:flex items-center justify-center -mt-[88px] mb-8 pointer-events-none">
        <div className="flex-1 max-w-[200px] flex items-center justify-end pr-8">
          <ChevronRight className="w-6 h-6 text-white/20" />
        </div>
        <div className="w-[200px]" />
        <div className="flex-1 max-w-[200px] flex items-center justify-start pl-8">
          <ChevronRight className="w-6 h-6 text-white/20" />
        </div>
      </div>

      {/* CTAs */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-12">
        <Link
          href="/predict"
          className="px-8 py-4 rounded-xl bg-gradient-to-r from-warning to-fire text-black font-bold text-lg hover:opacity-90 transition-all hover:scale-[1.02]"
        >
          Start Playing Now
        </Link>
        <Link
          href="/docs"
          className="flex items-center gap-2 px-6 py-3 text-white/60 hover:text-white/80 transition-colors text-sm"
        >
          Read the full docs
          <ExternalLink className="w-4 h-4" />
        </Link>
      </div>
    </section>
  );
}

function StepCard({
  number,
  icon,
  title,
  description,
  highlight = false,
}: {
  number: number;
  icon: React.ReactNode;
  title: string;
  description: string;
  highlight?: boolean;
}) {
  return (
    <div className={`relative bg-[#1a1a1a] border rounded-xl p-6 text-center ${highlight ? 'border-warning/20' : 'border-white/[0.06]'}`}>
      {/* Step number */}
      <div className={`absolute -top-3 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
        highlight ? 'bg-warning text-black' : 'bg-white/10 text-white/60'
      }`}>
        {number}
      </div>

      {/* Icon */}
      <div className={`w-14 h-14 mx-auto rounded-xl flex items-center justify-center mb-4 ${
        highlight ? 'bg-warning/10 text-warning' : 'bg-white/5 text-white/40'
      }`}>
        {icon}
      </div>

      {/* Content */}
      <h3 className={`font-bold uppercase tracking-wider mb-2 ${highlight ? 'text-warning' : 'text-white'}`}>
        {title}
      </h3>
      <p className="text-sm text-white/50">{description}</p>
    </div>
  );
}
