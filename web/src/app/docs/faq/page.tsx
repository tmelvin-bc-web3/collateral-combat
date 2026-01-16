'use client';

import { useState } from 'react';

interface FAQItem {
  question: string;
  answer: string;
  category: 'general' | 'gameplay' | 'technical' | 'fees';
}

const FAQ_ITEMS: FAQItem[] = [
  // General
  {
    question: 'What is DegenDome?',
    answer: 'DegenDome is a competitive trading arena on Solana. You can predict price movements (Oracle), battle other traders 1v1 (Battle Mode), draft memecoin portfolios (Draft), or wager on live competitions (Spectate). All results are settled on-chain for transparency.',
    category: 'general',
  },
  {
    question: 'What wallet do I need?',
    answer: 'Any Solana wallet works! We support Phantom, Solflare, Backpack, and other major Solana wallets. Make sure you have some SOL for transaction fees and wagering.',
    category: 'general',
  },
  {
    question: 'Is DegenDome safe?',
    answer: 'DegenDome uses on-chain settlement and cryptographic signatures to ensure fair play. Battle results are verified on Solana smart contracts. We never have access to your private keys. See our Security page for more details.',
    category: 'general',
  },
  {
    question: 'How do I get started?',
    answer: 'Connect your wallet, make sure you have some SOL, and try Oracle predictions first! They\'re quick 30-second rounds that are perfect for beginners. Check our Getting Started guide for a full walkthrough.',
    category: 'general',
  },

  // Gameplay
  {
    question: 'What is Oracle (Predictions)?',
    answer: 'Oracle is a fast-paced prediction game with 30-second rounds. You wager on whether an asset\'s price will go up (Long) or down (Short). Winners split the losing pool proportionally to their wager size.',
    category: 'gameplay',
  },
  {
    question: 'How does Battle Mode work?',
    answer: 'Two traders compete head-to-head. Both start with $1,000 virtual balance and can trade perpetual futures with up to 20x leverage. The player with the highest P&L percentage when time runs out wins 95% of the prize pool.',
    category: 'gameplay',
  },
  {
    question: 'What is liquidation in Battle Mode?',
    answer: 'Liquidation happens when your losses exceed your margin (the amount you put into a position). At 5% maintenance margin, if your losses reach 95% of your margin, your position is automatically closed. Higher leverage = closer liquidation price.',
    category: 'gameplay',
  },
  {
    question: 'How do Draft tournaments work?',
    answer: 'Pay an entry fee, draft 6 memecoins across 6 rounds (30 seconds per pick), and compete based on total portfolio performance over the week. Use power-ups (Swap, Boost, Freeze) strategically to maximize your score.',
    category: 'gameplay',
  },
  {
    question: 'What are the wager limits?',
    answer: 'Minimum wager is 0.01 SOL across all game modes. Maximum is 10 SOL for Oracle and Spectator wagering. Draft entry fees are 0.1 SOL, 0.5 SOL, or 1 SOL tiers.',
    category: 'gameplay',
  },
  {
    question: 'How do I earn XP and level up?',
    answer: 'Every wager you make earns XP. You also get streak bonuses for playing daily (up to 2x XP). As you level up, you unlock fee discounts, free wagers, cosmetics, and titles. There are 100 levels total.',
    category: 'gameplay',
  },

  // Technical
  {
    question: 'How are prices determined?',
    answer: 'Oracle rounds use Pyth Network, a decentralized oracle used by major DeFi protocols. Prices are verified on-chain at round start, lock, and settlement — tamper-proof and transparent.',
    category: 'technical',
  },
  {
    question: 'What is on-chain settlement?',
    answer: 'Game results are managed by the Session Betting Program on Solana. Oracle rounds are fully on-chain with Pyth prices. Your funds are stored in personal vault PDAs that only you can withdraw from.',
    category: 'technical',
  },
  {
    question: 'What is the Session Betting Program?',
    answer: 'The Session Betting Program (4EMMUfMMx61ynFq53fi8nsXBdDRcB1KuDuAmjsYMAKAA) manages your balance, sessions, and Oracle rounds. It uses PDAs to store your funds securely on-chain.',
    category: 'technical',
  },
  {
    question: 'What are signed trades?',
    answer: 'Every trade in Battle Mode is signed by your wallet using ED25519 cryptography. This creates a verifiable record that proves you authorized each trade. Even if our servers were compromised, no one could forge trades without your private key.',
    category: 'technical',
  },
  {
    question: 'Where can I verify the smart contracts?',
    answer: 'Session Betting Program: 4EMMUfMMx61ynFq53fi8nsXBdDRcB1KuDuAmjsYMAKAA (Devnet). Search on Solscan to view transactions and verify results.',
    category: 'technical',
  },

  // Fees
  {
    question: 'What are the platform fees?',
    answer: 'Standard fee is 5% on winnings (Oracle, Battle, Spectator). Draft tournaments have a 10% rake on the prize pool. You never pay fees on losses. Level up to unlock fee discount perks!',
    category: 'fees',
  },
  {
    question: 'How do fee reduction perks work?',
    answer: 'As you level up, you unlock perks that reduce your effective fee rate. For Oracle: 4.5%, 4%, or 3.5% (down from 5%). For Draft: 9%, 8%, or 7% (down from 10%). Activate perks from the Progression page.',
    category: 'fees',
  },
  {
    question: 'Are there gas fees?',
    answer: 'Yes, Solana transactions require a small gas fee (usually fractions of a cent). You need SOL in your wallet to cover these. On-chain wagers and claims each require a transaction.',
    category: 'fees',
  },
];

const CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'general', label: 'General' },
  { id: 'gameplay', label: 'Gameplay' },
  { id: 'technical', label: 'Technical' },
  { id: 'fees', label: 'Fees' },
];

export default function FAQPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const [activeCategory, setActiveCategory] = useState('all');

  const filteredFAQ = activeCategory === 'all'
    ? FAQ_ITEMS
    : FAQ_ITEMS.filter(item => item.category === activeCategory);

  return (
    <div className="animate-fadeIn">
      <h1 className="text-3xl font-bold mb-4">Frequently Asked Questions</h1>
      <p className="text-text-secondary text-lg mb-8">
        Quick answers to common questions about DegenDome.
      </p>

      {/* Category Filter */}
      <div className="flex flex-wrap gap-2 mb-8">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => {
              setActiveCategory(cat.id);
              setOpenIndex(null);
            }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeCategory === cat.id
                ? 'bg-accent text-white'
                : 'bg-bg-tertiary text-text-secondary hover:text-text-primary'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* FAQ Accordion */}
      <div className="space-y-2">
        {filteredFAQ.map((item, index) => (
          <div key={item.question} className="card overflow-hidden">
            <button
              onClick={() => setOpenIndex(openIndex === index ? null : index)}
              className="w-full flex justify-between items-center p-4 text-left hover:bg-bg-tertiary/50 transition-colors"
            >
              <span className="font-medium pr-4">{item.question}</span>
              <span className="text-text-tertiary text-xl flex-shrink-0">
                {openIndex === index ? '−' : '+'}
              </span>
            </button>
            {openIndex === index && (
              <div className="px-4 pb-4 pt-0">
                <p className="text-text-secondary text-sm leading-relaxed">
                  {item.answer}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Still Need Help */}
      <div className="mt-12 card p-6 text-center">
        <h2 className="font-semibold mb-2">Still have questions?</h2>
        <p className="text-text-secondary text-sm mb-4">
          Join our community for help and updates.
        </p>
        <div className="flex justify-center gap-4">
          <a
            href="https://twitter.com/degendome"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-ghost text-sm"
          >
            Twitter
          </a>
          <a
            href="https://discord.gg/degendome"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-ghost text-sm"
          >
            Discord
          </a>
        </div>
      </div>
    </div>
  );
}
