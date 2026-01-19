import DocsCallout from '@/components/docs/DocsCallout';

export default function OraclePage() {
  return (
    <div className="animate-fadeIn">
      <h1 className="text-3xl font-bold mb-4">Oracle (Predictions)</h1>
      <p className="text-text-secondary text-lg mb-8">
        Fast-paced 30-second price prediction rounds. Go long or short and compete for the pool.
      </p>

      {/* How It Works */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-4">How It Works</h2>
        <div className="space-y-4">
          <div className="card p-4">
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded bg-bg-tertiary flex items-center justify-center font-bold text-accent">1</div>
              <div>
                <h3 className="font-medium mb-1">Round Starts</h3>
                <p className="text-text-secondary text-sm">
                  A new 30-second round begins on-chain. The starting price is locked from the Pyth oracle.
                  You have 25 seconds to place your wager before the round locks.
                </p>
              </div>
            </div>
          </div>
          <div className="card p-4">
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded bg-bg-tertiary flex items-center justify-center font-bold text-accent">2</div>
              <div>
                <h3 className="font-medium mb-1">Place Your Wager</h3>
                <p className="text-text-secondary text-sm">
                  Choose <span className="text-success">Long</span> if you think the price will go up,
                  or <span className="text-danger">Short</span> if you think it will go down.
                  Select your wager amount (0.01, 0.05, 0.1, 0.25, or 0.5 SOL).
                  Funds are locked on-chain immediately.
                </p>
              </div>
            </div>
          </div>
          <div className="card p-4">
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded bg-bg-tertiary flex items-center justify-center font-bold text-accent">3</div>
              <div>
                <h3 className="font-medium mb-1">Round Locks</h3>
                <p className="text-text-secondary text-sm">
                  5 seconds before the round ends, wagering closes. The lock price is recorded from
                  the Pyth oracle on-chain. Watch the final seconds play out!
                </p>
              </div>
            </div>
          </div>
          <div className="card p-4">
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded bg-bg-tertiary flex items-center justify-center font-bold text-accent">4</div>
              <div>
                <h3 className="font-medium mb-1">Settlement</h3>
                <p className="text-text-secondary text-sm">
                  The round settles on-chain. If the end price is higher than start price, Long wins.
                  If lower, Short wins. If equal, it&apos;s a push (refund). Winnings are automatically
                  credited to your balance.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* On-Chain Architecture */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-4">On-Chain Architecture</h2>
        <p className="text-text-secondary mb-4">
          Oracle rounds are managed on-chain for transparency and verifiability. Prices come from
          the Pyth Network oracle, ensuring tamper-proof price data.
        </p>

        <div className="card p-4 mb-4">
          <div className="space-y-3 text-sm">
            <div className="flex justify-between items-center py-2 border-b border-border-primary">
              <span className="font-medium">Round Start</span>
              <span className="text-text-secondary">On-chain with Pyth start price</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-border-primary">
              <span className="font-medium">Round Lock</span>
              <span className="text-text-secondary">On-chain with Pyth lock price</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-border-primary">
              <span className="font-medium">Settlement</span>
              <span className="text-text-secondary">On-chain winner determination</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="font-medium">Wager Tracking</span>
              <span className="text-text-secondary">Efficient off-chain with on-chain fund locking</span>
            </div>
          </div>
        </div>

        <DocsCallout type="info" title="Pyth Network Oracle">
          We use Pyth Network for price data, the same oracle used by major DeFi protocols on Solana.
          Prices are sourced from multiple institutional providers for accuracy and reliability.
        </DocsCallout>
      </section>

      {/* Trading Asset */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-4">Trading Asset</h2>
        <div className="card p-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
              <span className="font-bold text-white">SOL</span>
            </div>
            <div>
              <h3 className="font-medium">SOL/USD</h3>
              <p className="text-text-secondary text-sm">
                Oracle predictions track the SOL/USD price via Pyth Network oracle.
                Predict whether SOL will go up or down in the next 30 seconds.
              </p>
            </div>
          </div>
        </div>
        <p className="text-text-tertiary text-sm mt-3">
          More assets coming soon! Battle mode supports additional tokens for trading.
        </p>
      </section>

      {/* Payouts */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-4">Payouts & Odds</h2>
        <p className="text-text-secondary mb-4">
          Winners split the losing pool proportionally to their wager size. The odds depend on
          how much is wagered on each side.
        </p>

        <div className="card p-4 mb-4">
          <h3 className="font-medium mb-3">Example</h3>
          <div className="space-y-2 text-sm text-text-secondary">
            <p><strong>Long Pool:</strong> 10 SOL total</p>
            <p><strong>Short Pool:</strong> 5 SOL total</p>
            <p><strong>Your Long Wager:</strong> 1 SOL (10% of Long pool)</p>
            <p className="pt-2 border-t border-border-primary">
              <strong>If Long wins:</strong> 5% fee taken from Short pool (0.25 SOL) → 4.75 SOL distributed.
              You receive 10% = 0.475 SOL profit + your 1 SOL back.
            </p>
          </div>
        </div>

        <DocsCallout type="info" title="Platform Fee">
          DegenDome takes a 5% fee from the losing pool before distribution to winners.
          Level up to unlock reduced fee perks!
        </DocsCallout>
      </section>

      {/* Balance Requirement */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-4">Balance Requirement</h2>
        <p className="text-text-secondary mb-4">
          Oracle predictions use your session betting balance. You must deposit SOL before
          you can place wagers.
        </p>

        <div className="card p-4 mb-4">
          <h3 className="font-medium mb-3">Quick Start</h3>
          <ol className="list-decimal list-inside space-y-2 text-text-secondary text-sm">
            <li>Click your balance in the header</li>
            <li>Deposit SOL to your wagering balance</li>
            <li>Create a session for instant wagering (optional but recommended)</li>
            <li>Place wagers without wallet popups!</li>
          </ol>
        </div>

        <DocsCallout type="tip" title="Instant Wagering">
          Create a session key to place wagers instantly without wallet popups.
          See <a href="/docs/session-betting" className="text-accent hover:underline">Session Wagering</a> for details.
        </DocsCallout>
      </section>

      {/* Early Bird Bonus */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-4">Early Bird Bonus</h2>
        <p className="text-text-secondary mb-4">
          Wager early in the round to earn up to <strong>20% bonus</strong> on your potential payout!
        </p>

        <div className="card p-4">
          <p className="text-text-secondary text-sm mb-3">
            The earlier you wager in a round, the higher your bonus multiplier. The bonus
            decays linearly as the round progresses, reaching 0% near the end of the betting window.
          </p>
          <div className="bg-success/10 border border-success/30 rounded p-3 text-sm text-success">
            Wager early for maximum bonus!
          </div>
        </div>

        <DocsCallout type="tip">
          The early bird bonus encourages quick decision-making and rewards confident players.
          Place your wager as soon as you&apos;ve made your decision!
        </DocsCallout>
      </section>

      {/* Outcomes */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-4">Possible Outcomes</h2>
        <div className="grid md:grid-cols-3 gap-4">
          <div className="card p-4 border-success/30">
            <h3 className="font-medium text-success mb-2">Win</h3>
            <p className="text-text-secondary text-sm">
              You picked the winning side. Your payout is automatically credited to your
              balance. No claiming required.
            </p>
          </div>
          <div className="card p-4 border-danger/30">
            <h3 className="font-medium text-danger mb-2">Lose</h3>
            <p className="text-text-secondary text-sm">
              You picked the losing side. Your locked wager goes to the winning pool.
              Funds were locked when you placed the wager.
            </p>
          </div>
          <div className="card p-4 border-yellow-500/30">
            <h3 className="font-medium text-yellow-400 mb-2">Push</h3>
            <p className="text-text-secondary text-sm">
              The price didn&apos;t change. Everyone gets their wagers refunded automatically.
              This is rare but can happen.
            </p>
          </div>
        </div>
      </section>

      {/* Technical Details */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-4">Technical Details</h2>

        <div className="card p-4 mb-4">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between py-1">
              <span className="text-text-tertiary">Round Duration</span>
              <span>30 seconds</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-text-tertiary">Betting Window</span>
              <span>25 seconds (5 second lock buffer)</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-text-tertiary">Wager Amounts</span>
              <span>0.01, 0.05, 0.1, 0.25, 0.5 SOL</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-text-tertiary">Platform Fee</span>
              <span>5% of losing pool</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-text-tertiary">Price Oracle</span>
              <span>Pyth Network</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-text-tertiary">Settlement</span>
              <span>Automatic on-chain</span>
            </div>
          </div>
        </div>
      </section>

      {/* Tips */}
      <section>
        <h2 className="text-xl font-semibold mb-4">Strategy Tips</h2>
        <ul className="space-y-3">
          <li className="flex gap-3">
            <span className="text-accent">&#x2022;</span>
            <span className="text-text-secondary">
              <strong>Watch the pool balance</strong> — Better odds come from being on the minority side.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="text-accent">&#x2022;</span>
            <span className="text-text-secondary">
              <strong>Consider volatility</strong> — SOL can move significantly in 30 seconds during high activity periods.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="text-accent">&#x2022;</span>
            <span className="text-text-secondary">
              <strong>Wager early</strong> — The early bird bonus can significantly boost your returns.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="text-accent">&#x2022;</span>
            <span className="text-text-secondary">
              <strong>Create a session</strong> — Instant wagering without popups lets you react faster.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="text-accent">&#x2022;</span>
            <span className="text-text-secondary">
              <strong>Check recent history</strong> — Past round results can show momentum patterns.
            </span>
          </li>
        </ul>
      </section>
    </div>
  );
}
