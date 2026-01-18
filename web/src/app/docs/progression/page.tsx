import DocsCallout from '@/components/docs/DocsCallout';

export default function ProgressionPage() {
  return (
    <div className="animate-fadeIn">
      <h1 className="text-3xl font-bold mb-4">Progression System</h1>
      <p className="text-text-secondary text-lg mb-8">
        Earn XP, level up, and unlock powerful perks and cosmetics.
      </p>

      {/* Overview */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-4">Overview</h2>
        <p className="text-text-secondary mb-4">
          Every wager you make earns you XP (experience points). As you accumulate XP, you level up
          and unlock rewards including fee discounts, free wagers, cosmetics, and titles.
        </p>

        <div className="grid md:grid-cols-4 gap-4">
          <div className="card p-4 text-center">
            <div className="text-2xl font-bold text-accent mb-1">100</div>
            <div className="text-text-secondary text-sm">Total Levels</div>
          </div>
          <div className="card p-4 text-center">
            <div className="text-2xl font-bold text-accent mb-1">7</div>
            <div className="text-text-secondary text-sm">Title Tiers</div>
          </div>
          <div className="card p-4 text-center">
            <div className="text-2xl font-bold text-accent mb-1">6</div>
            <div className="text-text-secondary text-sm">Perk Types</div>
          </div>
          <div className="card p-4 text-center">
            <div className="text-2xl font-bold text-accent mb-1">2x</div>
            <div className="text-text-secondary text-sm">Max Streak Bonus</div>
          </div>
        </div>
      </section>

      {/* XP Sources */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-4">Earning XP</h2>
        <p className="text-text-secondary mb-4">
          XP is earned from all game modes. The amount varies by activity:
        </p>

        <div className="card p-4">
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-border-primary">
              <span className="flex items-center gap-2">
                <span>🔮</span>
                <span>Oracle Predictions</span>
              </span>
              <span className="text-text-secondary text-sm">XP per wager settled</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-border-primary">
              <span className="flex items-center gap-2">
                <span>⚔️</span>
                <span>Battle Mode</span>
              </span>
              <span className="text-text-secondary text-sm">XP per battle completed</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-border-primary">
              <span className="flex items-center gap-2">
                <span>🎯</span>
                <span>Draft Tournaments</span>
              </span>
              <span className="text-text-secondary text-sm">50 XP entry + score bonuses</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="flex items-center gap-2">
                <span>👁️</span>
                <span>Spectator Wagering</span>
              </span>
              <span className="text-text-secondary text-sm">XP per wager settled</span>
            </div>
          </div>
        </div>
      </section>

      {/* Streak System */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-4">Daily Streak Bonus</h2>
        <p className="text-text-secondary mb-4">
          Play every day to build your streak and earn bonus XP!
        </p>

        <div className="card p-4 mb-4">
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-text-secondary">Day 1</span>
              <span className="font-medium">1.0x XP (base)</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-text-secondary">Day 3</span>
              <span className="font-medium text-success">~1.2x XP</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-text-secondary">Day 7</span>
              <span className="font-medium text-success">~1.5x XP</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-text-secondary">Day 14+</span>
              <span className="font-medium text-accent">~2.0x XP (max)</span>
            </div>
          </div>
        </div>

        <DocsCallout type="warning" title="Don&apos;t Break Your Streak!">
          If you miss a day, your streak resets to 0. You have until midnight UTC to place at
          least one wager to maintain your streak.
        </DocsCallout>
      </section>

      {/* Titles */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-4">Titles</h2>
        <p className="text-text-secondary mb-4">
          Your title displays next to your name and shows your experience level.
        </p>

        <div className="card p-4">
          <div className="space-y-2">
            <div className="grid grid-cols-2 text-sm py-2 border-b border-border-primary font-medium">
              <span>Level Range</span>
              <span>Title</span>
            </div>
            {[
              { range: '1-5', title: 'Rookie', color: 'text-text-secondary' },
              { range: '6-10', title: 'Contender', color: 'text-blue-400' },
              { range: '11-20', title: 'Warrior', color: 'text-green-400' },
              { range: '21-35', title: 'Veteran', color: 'text-purple-400' },
              { range: '36-50', title: 'Champion', color: 'text-yellow-400' },
              { range: '51-75', title: 'Legend', color: 'text-orange-400' },
              { range: '76-100', title: 'Immortan', color: 'text-accent' },
            ].map((tier) => (
              <div key={tier.title} className="grid grid-cols-2 text-sm py-2">
                <span className="text-text-secondary">Level {tier.range}</span>
                <span className={tier.color}>{tier.title}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Perks */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-4">Perks</h2>
        <p className="text-text-secondary mb-4">
          Unlock powerful perks as you level up. Perks reduce your effective fee rate!
        </p>

        <h3 className="font-medium mb-3">Draft Fee Reduction</h3>
        <div className="card p-4 mb-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm py-2 border-b border-border-primary">
              <span className="text-text-secondary">Level 15, 25</span>
              <span>9% fee <span className="text-success">(1% discount)</span></span>
            </div>
            <div className="flex justify-between text-sm py-2 border-b border-border-primary">
              <span className="text-text-secondary">Level 40</span>
              <span>8% fee <span className="text-success">(2% discount)</span></span>
            </div>
            <div className="flex justify-between text-sm py-2">
              <span className="text-text-secondary">Level 75, 100</span>
              <span>7% fee <span className="text-success">(3% discount)</span></span>
            </div>
          </div>
        </div>

        <h3 className="font-medium mb-3">Oracle Fee Reduction</h3>
        <div className="card p-4 mb-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm py-2 border-b border-border-primary">
              <span className="text-text-secondary">Level 15, 25</span>
              <span>4.5% fee <span className="text-success">(0.5% discount)</span></span>
            </div>
            <div className="flex justify-between text-sm py-2 border-b border-border-primary">
              <span className="text-text-secondary">Level 40</span>
              <span>4.0% fee <span className="text-success">(1% discount)</span></span>
            </div>
            <div className="flex justify-between text-sm py-2">
              <span className="text-text-secondary">Level 75, 100</span>
              <span>3.5% fee <span className="text-success">(1.5% discount)</span></span>
            </div>
          </div>
        </div>

        <DocsCallout type="info" title="Perk Activation">
          Perks must be activated from the Progression page. Some perks are time-limited,
          while Level 100 perks are permanent!
        </DocsCallout>
      </section>

      {/* Free Wagers */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-4">Free Wagers</h2>
        <p className="text-text-secondary mb-4">
          Earn free wager credits at level milestones. Use them to wager without risking your own SOL!
        </p>

        <div className="card p-4 mb-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm py-2 border-b border-border-primary">
              <span className="text-text-secondary">Level 5</span>
              <span className="text-accent">Free Wager Unlocked</span>
            </div>
            <div className="flex justify-between text-sm py-2 border-b border-border-primary">
              <span className="text-text-secondary">Level 10</span>
              <span className="text-accent">Free Wager Unlocked</span>
            </div>
            <div className="flex justify-between text-sm py-2 border-b border-border-primary">
              <span className="text-text-secondary">Level 20</span>
              <span className="text-accent">Free Wager Unlocked</span>
            </div>
            <div className="flex justify-between text-sm py-2 border-b border-border-primary">
              <span className="text-text-secondary">Level 35</span>
              <span className="text-accent">Free Wager Unlocked</span>
            </div>
            <div className="flex justify-between text-sm py-2">
              <span className="text-text-secondary">Level 50+</span>
              <span className="text-accent">Additional Free Wagers</span>
            </div>
          </div>
        </div>

        <DocsCallout type="tip" title="Free Wager Value">
          Each free wager is worth 0.01 SOL. If you win, the profit is credited to your Session Betting balance!
          Free wagers are funded from the platform pool.
        </DocsCallout>
      </section>

      {/* Cosmetics */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-4">Cosmetics</h2>
        <p className="text-text-secondary mb-4">
          Unlock profile borders and avatars to customize your appearance.
        </p>

        <div className="grid md:grid-cols-5 gap-3">
          {[
            { name: 'Bronze', level: 10, color: 'border-amber-700' },
            { name: 'Silver', level: 25, color: 'border-gray-400' },
            { name: 'Gold', level: 50, color: 'border-yellow-400' },
            { name: 'Platinum', level: 75, color: 'border-cyan-300' },
            { name: 'Immortan', level: 100, color: 'border-accent' },
          ].map((border) => (
            <div key={border.name} className={`card p-3 text-center border-2 ${border.color}`}>
              <div className="font-medium text-sm">{border.name}</div>
              <div className="text-text-tertiary text-xs">Level {border.level}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Leaderboards */}
      <section>
        <h2 className="text-xl font-semibold mb-4">Leaderboards</h2>
        <p className="text-text-secondary mb-4">
          Compete with other players on the leaderboard. Rankings are based on:
        </p>

        <ul className="list-disc list-inside space-y-2 text-text-secondary">
          <li><strong>Profit/Loss</strong> — Total net winnings across all game modes</li>
          <li><strong>Win Rate</strong> — Percentage of wagers won</li>
          <li><strong>Volume</strong> — Total amount wagered</li>
        </ul>

        <p className="text-text-secondary mt-4">
          Check the <a href="/leaderboard" className="text-accent hover:underline">Leaderboard</a> page
          to see where you rank!
        </p>
      </section>
    </div>
  );
}
