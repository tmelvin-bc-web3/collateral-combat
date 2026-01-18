'use client';

import { useState } from 'react';

export function HowItWorks() {
  const [collapsed, setCollapsed] = useState(false);

  const steps = [
    { number: 1, text: 'Join lobby before timer ends' },
    { number: 2, text: 'Each round: predict SOL up or down' },
    { number: 3, text: 'Wrong prediction = eliminated' },
    { number: 4, text: 'Last player standing wins the pot!' },
  ];

  return (
    <div className="bg-[#2a2a2a] border border-white/[0.06] rounded-xl p-4">
      {/* Header */}
      <div
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setCollapsed(!collapsed)}
      >
        <h3 className="text-xs font-semibold uppercase tracking-wider text-white/50">How It Works</h3>
        <button className="text-white/40 hover:text-white/60 transition-colors text-lg leading-none">
          {collapsed ? '+' : '−'}
        </button>
      </div>

      {/* Steps */}
      {!collapsed && (
        <div className="mt-4 space-y-3">
          {steps.map((step) => (
            <div key={step.number} className="flex items-center gap-3">
              <div className="w-6 h-6 flex items-center justify-center bg-warning rounded-full text-xs font-bold text-black">
                {step.number}
              </div>
              <span className="text-sm text-white">{step.text}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
