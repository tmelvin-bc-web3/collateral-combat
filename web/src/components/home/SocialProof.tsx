'use client';

import { Lock, Zap, Target, BarChart3 } from 'lucide-react';

export function SocialProof() {
  return (
    <section className="mb-16">
      {/* Trust Bar */}
      <div className="bg-[#1a1a1a] border border-white/[0.06] rounded-xl p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <TrustItem
            icon={<Lock className="w-4 h-4" />}
            text="On-chain & Verifiable"
          />
          <TrustItem
            icon={<Zap className="w-4 h-4" />}
            text="Instant Payouts"
          />
          <TrustItem
            icon={<Target className="w-4 h-4" />}
            text="Pure PvP - No House Edge"
          />
          <TrustItem
            icon={<BarChart3 className="w-4 h-4" />}
            text="5% Rake Only"
          />
        </div>
      </div>
    </section>
  );
}

function TrustItem({
  icon,
  text,
}: {
  icon: React.ReactNode;
  text: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-warning">{icon}</span>
      <span className="text-xs text-white/60">{text}</span>
    </div>
  );
}
