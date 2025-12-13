'use client';

import { useState } from 'react';

const FAQ = [
  {
    q: 'What is Collateral Combat?',
    a: 'A PvP perpetual trading arena. Two traders compete head-to-head, both starting with $1,000. Best P&L percentage wins the prize pool.',
  },
  {
    q: 'How does leverage work?',
    a: 'Leverage amplifies gains and losses. 10x leverage means a 1% price move = 10% position change. Higher leverage = higher liquidation risk.',
  },
  {
    q: 'What is liquidation?',
    a: 'When losses exceed your margin, the position auto-closes. At 5% maintenance margin with 10x leverage, a ~9.5% adverse move triggers liquidation.',
  },
  {
    q: 'How is the winner determined?',
    a: 'Highest P&L percentage when time runs out. Includes both realized (closed) and unrealized (open) P&L.',
  },
  {
    q: 'What are the fees?',
    a: '5% platform fee on prize pool. Winner receives 95% of total entry fees.',
  },
];

export default function DocsPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  return (
    <div className="max-w-3xl mx-auto animate-fadeIn">
      {/* Header */}
      <div className="mb-8 mt-8">
        <h1 className="text-2xl font-semibold mb-2">Documentation</h1>
        <p className="text-text-secondary">How Collateral Combat works</p>
      </div>

      {/* Quick Start */}
      <div className="card mb-6">
        <h2 className="font-medium mb-4">Quick Start</h2>
        <div className="space-y-4">
          <div className="flex gap-4">
            <div className="w-6 h-6 rounded bg-bg-tertiary flex items-center justify-center text-xs font-medium text-text-secondary flex-shrink-0">1</div>
            <div>
              <h3 className="font-medium text-sm">Connect & Match</h3>
              <p className="text-text-secondary text-sm">Connect wallet, choose entry fee and duration, find opponent.</p>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="w-6 h-6 rounded bg-bg-tertiary flex items-center justify-center text-xs font-medium text-text-secondary flex-shrink-0">2</div>
            <div>
              <h3 className="font-medium text-sm">Trade</h3>
              <p className="text-text-secondary text-sm">Long or short SOL, BTC, ETH, WIF, BONK with 2-20x leverage.</p>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="w-6 h-6 rounded bg-bg-tertiary flex items-center justify-center text-xs font-medium text-text-secondary flex-shrink-0">3</div>
            <div>
              <h3 className="font-medium text-sm">Win</h3>
              <p className="text-text-secondary text-sm">Highest P&L % when timer ends takes 95% of prize pool.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Trading */}
      <div className="grid md:grid-cols-2 gap-6 mb-6">
        <div className="card">
          <h2 className="font-medium mb-4">Long vs Short</h2>
          <div className="space-y-3">
            <div className="p-3 rounded-lg bg-success-muted">
              <div className="font-medium text-success text-sm mb-1">Long</div>
              <p className="text-text-secondary text-sm">Profit when price goes up.</p>
            </div>
            <div className="p-3 rounded-lg bg-danger-muted">
              <div className="font-medium text-danger text-sm mb-1">Short</div>
              <p className="text-text-secondary text-sm">Profit when price goes down.</p>
            </div>
          </div>
        </div>

        <div className="card">
          <h2 className="font-medium mb-4">Leverage</h2>
          <div className="space-y-2">
            {[
              { lev: '2x', liq: '~47% move' },
              { lev: '5x', liq: '~19% move' },
              { lev: '10x', liq: '~9.5% move' },
              { lev: '20x', liq: '~4.75% move' },
            ].map((item) => (
              <div key={item.lev} className="flex justify-between py-2 text-sm">
                <span className="font-mono text-accent">{item.lev}</span>
                <span className="text-text-tertiary">Liquidation: {item.liq}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* P&L */}
      <div className="card mb-6">
        <h2 className="font-medium mb-4">P&L Calculation</h2>
        <div className="p-4 rounded-lg bg-bg-tertiary font-mono text-sm mb-4">
          P&L = Margin × Leverage × Price Change %
        </div>
        <p className="text-text-secondary text-sm">
          Example: $100 margin × 10x = $1,000 position. If price moves +5%, you profit $50 (+50% on margin).
        </p>
      </div>

      {/* Rules */}
      <div className="card mb-6">
        <h2 className="font-medium mb-4">Battle Rules</h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-text-tertiary mb-1">Starting Balance</div>
            <div>$1,000 USD</div>
          </div>
          <div>
            <div className="text-text-tertiary mb-1">Duration</div>
            <div>30 min or 1 hour</div>
          </div>
          <div>
            <div className="text-text-tertiary mb-1">Leverage</div>
            <div>2x, 5x, 10x, 20x</div>
          </div>
          <div>
            <div className="text-text-tertiary mb-1">Platform Fee</div>
            <div>5% of prize pool</div>
          </div>
        </div>
      </div>

      {/* FAQ */}
      <div className="card">
        <h2 className="font-medium mb-4">FAQ</h2>
        <div className="space-y-2">
          {FAQ.map((item, i) => (
            <div key={i} className="border-b border-border-primary last:border-0">
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full flex justify-between items-center py-3 text-left"
              >
                <span className="font-medium text-sm">{item.q}</span>
                <span className="text-text-tertiary">{openFaq === i ? '−' : '+'}</span>
              </button>
              {openFaq === i && (
                <p className="text-text-secondary text-sm pb-3">{item.a}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
