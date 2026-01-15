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
                  A new 30-second round begins. The starting price is locked in.
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
                  Select your wager amount (0.01 - 10 SOL).
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
                  5 seconds before the round ends, betting closes. The lock price is recorded.
                  Watch the final seconds play out!
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
                  The round ends. If the end price is higher than start price, Long wins.
                  If lower, Short wins. If equal, it&apos;s a push (refund).
                </p>
              </div>
            </div>
          </div>
        </div>
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
          how much is wager on each side.
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

      {/* Early Bird Bonus */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-4">Early Bird Bonus</h2>
        <p className="text-text-secondary mb-4">
          Wager early in the round to earn up to <strong>20% bonus</strong> on your potential payout!
        </p>

        <div className="card p-4">
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-text-secondary">First 5 seconds</span>
              <span className="text-success font-medium">+20% bonus</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-text-secondary">5-15 seconds</span>
              <span className="text-success font-medium">+10% to +20% (decaying)</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-text-secondary">15-25 seconds</span>
              <span className="text-yellow-400 font-medium">+0% to +10% (decaying)</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-text-secondary">After 25 seconds</span>
              <span className="text-text-tertiary">Round locked - no wagers</span>
            </div>
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
              You picked the winning side. You receive your original wager plus your share of the
              losing pool (minus 5% fee).
            </p>
          </div>
          <div className="card p-4 border-danger/30">
            <h3 className="font-medium text-danger mb-2">Lose</h3>
            <p className="text-text-secondary text-sm">
              You picked the losing side. Your wager goes to the winning pool.
              No additional fees are charged.
            </p>
          </div>
          <div className="card p-4 border-yellow-500/30">
            <h3 className="font-medium text-yellow-400 mb-2">Push</h3>
            <p className="text-text-secondary text-sm">
              The price didn&apos;t change. Everyone gets their wagers refunded.
              This is rare but can happen.
            </p>
          </div>
        </div>
      </section>

      {/* Tips */}
      <section>
        <h2 className="text-xl font-semibold mb-4">Strategy Tips</h2>
        <ul className="space-y-3">
          <li className="flex gap-3">
            <span className="text-accent">•</span>
            <span className="text-text-secondary">
              <strong>Watch the pool balance</strong> — Better odds come from being on the minority side.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="text-accent">•</span>
            <span className="text-text-secondary">
              <strong>Consider volatility</strong> — SOL can move significantly in 30 seconds during high activity periods.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="text-accent">•</span>
            <span className="text-text-secondary">
              <strong>Wager early</strong> — The early bird bonus can significantly boost your returns.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="text-accent">•</span>
            <span className="text-text-secondary">
              <strong>Check recent history</strong> — Past round results can show momentum patterns.
            </span>
          </li>
        </ul>
      </section>
    </div>
  );
}
