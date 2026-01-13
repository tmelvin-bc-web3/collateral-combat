import { StatsCard, FeatureCard } from '@/components/docs/DocsCallout';

export default function DocsOverview() {
  return (
    <div className="animate-fadeIn">
      {/* Hero Section */}
      <div className="mb-12">
        <h1 className="text-3xl font-bold mb-4">What is DegenDome?</h1>
        <p className="text-text-secondary text-lg leading-relaxed max-w-2xl">
          DegenDome is a competitive trading arena on Solana where skill meets strategy.
          Predict price movements, battle other traders head-to-head, draft memecoin portfolios,
          and wager on live competitions — all secured by on-chain settlement.
        </p>
      </div>

      {/* Stats Section */}
      <div className="mb-12">
        <h2 className="text-xl font-semibold mb-4">DegenDome by the Numbers</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatsCard value="30s" label="Prediction Rounds" icon="⚡" />
          <StatsCard value="20x" label="Max Leverage" icon="📊" />
          <StatsCard value="5%" label="Platform Fee" icon="💰" />
          <StatsCard value="100" label="Progression Levels" icon="🏆" />
        </div>
      </div>

      {/* Game Modes */}
      <div className="mb-12">
        <h2 className="text-xl font-semibold mb-4">Game Modes</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <FeatureCard
            title="Oracle"
            description="30-second price prediction rounds. Go long or short on SOL, BTC, ETH and more. Winners split the losing pool."
            href="/docs/oracle"
            icon="🔮"
          />
          <FeatureCard
            title="Battle Mode"
            description="1v1 perpetual trading battles. Start with $1,000, use leverage, and compete for the highest P&L percentage."
            href="/docs/battle"
            icon="⚔️"
          />
          <FeatureCard
            title="Draft"
            description="Weekly memecoin tournaments. Draft 6 coins, use power-ups, and compete for prize pools."
            href="/docs/draft"
            icon="🎯"
          />
          <FeatureCard
            title="Spectate"
            description="Watch live battles and wager on the outcome. Dynamic odds based on real-time performance."
            href="/docs/spectate"
            icon="👁️"
          />
        </div>
      </div>

      {/* Key Features */}
      <div className="mb-12">
        <h2 className="text-xl font-semibold mb-4">Why DegenDome?</h2>
        <div className="space-y-4">
          <div className="card p-4">
            <div className="flex gap-4">
              <span className="text-2xl">🔐</span>
              <div>
                <h3 className="font-medium mb-1">On-Chain Settlement</h3>
                <p className="text-text-secondary text-sm">
                  All trades are signed and verified. Battle results are settled on Solana smart contracts.
                  Your funds, your keys.
                </p>
              </div>
            </div>
          </div>
          <div className="card p-4">
            <div className="flex gap-4">
              <span className="text-2xl">⚡</span>
              <div>
                <h3 className="font-medium mb-1">Real-Time Action</h3>
                <p className="text-text-secondary text-sm">
                  Live price feeds, instant trade execution, and real-time P&L updates.
                  No waiting, no delays.
                </p>
              </div>
            </div>
          </div>
          <div className="card p-4">
            <div className="flex gap-4">
              <span className="text-2xl">📈</span>
              <div>
                <h3 className="font-medium mb-1">Progression System</h3>
                <p className="text-text-secondary text-sm">
                  Earn XP, level up, unlock perks like reduced fees, and climb the leaderboard.
                  Your activity rewards you.
                </p>
              </div>
            </div>
          </div>
          <div className="card p-4">
            <div className="flex gap-4">
              <span className="text-2xl">🎮</span>
              <div>
                <h3 className="font-medium mb-1">Multiple Ways to Play</h3>
                <p className="text-text-secondary text-sm">
                  Quick predictions, strategic battles, weekly tournaments, or spectating.
                  Choose your style.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Links */}
      <div className="card p-6">
        <h2 className="font-semibold mb-4">Quick Links</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <a href="/docs/getting-started" className="text-accent hover:underline text-sm">
            → Getting Started
          </a>
          <a href="/docs/security" className="text-accent hover:underline text-sm">
            → Security & Trust
          </a>
          <a href="/docs/progression" className="text-accent hover:underline text-sm">
            → Progression System
          </a>
          <a href="/docs/faq" className="text-accent hover:underline text-sm">
            → FAQ
          </a>
        </div>
      </div>
    </div>
  );
}
