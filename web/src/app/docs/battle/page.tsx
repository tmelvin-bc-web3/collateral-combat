import DocsCallout from '@/components/docs/DocsCallout';

export default function BattlePage() {
  return (
    <div className="animate-fadeIn">
      <h1 className="text-3xl font-bold mb-4">Battle Mode</h1>
      <p className="text-text-secondary text-lg mb-8">
        1v1 perpetual trading battles. Compete head-to-head for the highest P&L percentage.
      </p>

      {/* Overview */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-4">Overview</h2>
        <p className="text-text-secondary mb-4">
          In Battle Mode, two traders go head-to-head in a timed trading competition. Both start
          with a virtual $1,000 balance and can trade perpetual futures with up to 20x leverage.
          When time runs out, the player with the highest P&L percentage wins the prize pool.
        </p>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="card p-4">
            <div className="text-text-tertiary text-sm mb-1">Starting Balance</div>
            <div className="text-xl font-bold">$1,000</div>
          </div>
          <div className="card p-4">
            <div className="text-text-tertiary text-sm mb-1">Duration Options</div>
            <div className="text-xl font-bold">30 min or 1 hour</div>
          </div>
          <div className="card p-4">
            <div className="text-text-tertiary text-sm mb-1">Max Leverage</div>
            <div className="text-xl font-bold">20x</div>
          </div>
          <div className="card p-4">
            <div className="text-text-tertiary text-sm mb-1">Winner Takes</div>
            <div className="text-xl font-bold">95% of pool</div>
          </div>
        </div>
      </section>

      {/* How to Play */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-4">How to Play</h2>
        <div className="space-y-4">
          <div className="card p-4">
            <h3 className="font-medium mb-2">1. Enter a Battle</h3>
            <p className="text-text-secondary text-sm">
              Choose your entry fee and duration, then wait for an opponent or start practice mode.
              Your entry fee goes into the prize pool.
            </p>
          </div>
          <div className="card p-4">
            <h3 className="font-medium mb-2">2. Open Positions</h3>
            <p className="text-text-secondary text-sm">
              Trade any supported asset. Choose Long (profit when price rises) or Short
              (profit when price falls). Select your leverage (2x, 5x, 10x, or 20x) and position size.
            </p>
          </div>
          <div className="card p-4">
            <h3 className="font-medium mb-2">3. Manage Risk</h3>
            <p className="text-text-secondary text-sm">
              Monitor your positions, close them when profitable, or cut losses early.
              Be careful with leverage — higher leverage means higher liquidation risk.
            </p>
          </div>
          <div className="card p-4">
            <h3 className="font-medium mb-2">4. Win the Battle</h3>
            <p className="text-text-secondary text-sm">
              When time runs out, the player with the highest total P&L percentage wins.
              P&L includes both realized (closed) and unrealized (open) positions.
            </p>
          </div>
        </div>
      </section>

      {/* Trading Mechanics */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-4">Trading Mechanics</h2>

        <h3 className="font-medium mb-3">Long vs Short</h3>
        <div className="grid md:grid-cols-2 gap-4 mb-6">
          <div className="card p-4 border-success/30">
            <h4 className="font-medium text-success mb-2">Long Position</h4>
            <p className="text-text-secondary text-sm">
              You profit when the price goes <strong>up</strong>.
              Example: Buy SOL at $100, sell at $110 = 10% gain.
            </p>
          </div>
          <div className="card p-4 border-danger/30">
            <h4 className="font-medium text-danger mb-2">Short Position</h4>
            <p className="text-text-secondary text-sm">
              You profit when the price goes <strong>down</strong>.
              Example: Short SOL at $100, close at $90 = 10% gain.
            </p>
          </div>
        </div>

        <h3 className="font-medium mb-3">Leverage</h3>
        <p className="text-text-secondary mb-4">
          Leverage amplifies both gains and losses. Higher leverage = higher risk.
        </p>

        <div className="card p-4 mb-4">
          <div className="space-y-3">
            <div className="grid grid-cols-3 text-sm font-medium border-b border-border-primary pb-2">
              <span>Leverage</span>
              <span>Price Move Impact</span>
              <span>Liquidation Distance</span>
            </div>
            {[
              { lev: '2x', impact: '1% move = 2% P&L', liq: '~47% adverse move' },
              { lev: '5x', impact: '1% move = 5% P&L', liq: '~19% adverse move' },
              { lev: '10x', impact: '1% move = 10% P&L', liq: '~9.5% adverse move' },
              { lev: '20x', impact: '1% move = 20% P&L', liq: '~4.75% adverse move' },
            ].map((row) => (
              <div key={row.lev} className="grid grid-cols-3 text-sm py-2">
                <span className="font-mono text-accent">{row.lev}</span>
                <span className="text-text-secondary">{row.impact}</span>
                <span className="text-text-tertiary">{row.liq}</span>
              </div>
            ))}
          </div>
        </div>

        <DocsCallout type="warning" title="Liquidation Risk">
          If your position loses enough that your margin falls below 5%, you get liquidated.
          The position auto-closes and you lose your margin. Use lower leverage for safety.
        </DocsCallout>
      </section>

      {/* P&L Calculation */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-4">P&L Calculation</h2>

        <div className="card p-4 bg-bg-tertiary font-mono text-sm mb-4">
          P&L = Position Size × (Exit Price - Entry Price) / Entry Price × Leverage
        </div>

        <div className="card p-4">
          <h3 className="font-medium mb-3">Example Trade</h3>
          <div className="space-y-2 text-sm text-text-secondary">
            <p><strong>Position:</strong> Long SOL with $100 margin at 10x leverage</p>
            <p><strong>Entry Price:</strong> $100</p>
            <p><strong>Exit Price:</strong> $105 (+5%)</p>
            <p className="pt-2 border-t border-border-primary">
              <strong>P&L:</strong> $100 × 10 × 5% = <span className="text-success">+$50 (+50% on margin)</span>
            </p>
          </div>
        </div>
      </section>

      {/* Supported Assets */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-4">Supported Assets</h2>
        <div className="grid grid-cols-4 md:grid-cols-8 gap-3">
          {['SOL', 'BTC', 'ETH', 'WIF', 'BONK', 'JUP', 'RAY', 'JTO'].map((asset) => (
            <div key={asset} className="card p-3 text-center">
              <span className="font-mono text-accent text-sm">{asset}</span>
            </div>
          ))}
        </div>
        <p className="text-text-secondary text-sm mt-3">
          You can hold one position per asset at a time.
        </p>
      </section>

      {/* Entry & Balance */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-4">Entry Fees & Balance</h2>
        <p className="text-text-secondary mb-4">
          Battle entry fees are paid from your Session Betting balance. Deposit SOL once and use it
          across all game modes — no wallet popups during gameplay.
        </p>

        <div className="card p-4 mb-4">
          <h3 className="font-medium mb-3">How It Works</h3>
          <ol className="list-decimal list-inside space-y-2 text-text-secondary text-sm">
            <li>Deposit SOL to your Session Betting balance</li>
            <li>Entry fee is deducted when you join a battle</li>
            <li>Funds are locked on-chain immediately (prevents withdrawal)</li>
            <li>Winner receives the prize pool automatically</li>
          </ol>
        </div>

        <DocsCallout type="info" title="Unified Balance">
          Your Session Betting balance works across all game modes: Oracle, Battle, Draft, and Spectator.
          See <a href="/docs/session-betting" className="text-accent hover:underline">Session Betting</a> for details.
        </DocsCallout>
      </section>

      {/* Settlement */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-4">Settlement</h2>
        <p className="text-text-secondary mb-4">
          Battle results are settled using Solana smart contracts. All trades during
          the battle are cryptographically signed, ensuring trustless verification.
        </p>

        <DocsCallout type="info" title="Automatic Payouts">
          The winner is determined by total P&L percentage. Winnings are automatically credited
          to the winner&apos;s Session Betting balance — no claiming required.
          See the <a href="/docs/security" className="text-accent hover:underline">Security</a> page for more details.
        </DocsCallout>
      </section>

      {/* Strategy Tips */}
      <section>
        <h2 className="text-xl font-semibold mb-4">Strategy Tips</h2>
        <ul className="space-y-3">
          <li className="flex gap-3">
            <span className="text-accent">•</span>
            <span className="text-text-secondary">
              <strong>Start conservative</strong> — Use lower leverage early to preserve capital.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="text-accent">•</span>
            <span className="text-text-secondary">
              <strong>Watch your opponent</strong> — If they&apos;re ahead, you may need to take more risk.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="text-accent">•</span>
            <span className="text-text-secondary">
              <strong>Cut losses quickly</strong> — A small loss is better than liquidation.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="text-accent">•</span>
            <span className="text-text-secondary">
              <strong>Don&apos;t revenge trade</strong> — Stick to your strategy after a loss.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="text-accent">•</span>
            <span className="text-text-secondary">
              <strong>Time your exits</strong> — Close profitable positions before they reverse.
            </span>
          </li>
        </ul>
      </section>
    </div>
  );
}
