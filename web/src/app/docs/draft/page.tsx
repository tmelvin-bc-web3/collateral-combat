import DocsCallout from '@/components/docs/DocsCallout';

export default function DraftPage() {
  return (
    <div className="animate-fadeIn">
      <h1 className="text-3xl font-bold mb-4">Draft (Memecoin Tournaments)</h1>
      <p className="text-text-secondary text-lg mb-8">
        Weekly tournaments where you draft a portfolio of memecoins and compete for prizes.
      </p>

      {/* Overview */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-4">Overview</h2>
        <p className="text-text-secondary mb-4">
          Draft tournaments run every week from Monday to Sunday (UTC). Pay an entry fee,
          draft 6 memecoins, and compete based on total portfolio performance. Use power-ups
          strategically to boost your score.
        </p>

        <div className="grid md:grid-cols-3 gap-4">
          <div className="card p-4 text-center">
            <div className="text-2xl font-bold text-accent mb-1">$5</div>
            <div className="text-text-secondary text-sm">Entry Tier</div>
          </div>
          <div className="card p-4 text-center">
            <div className="text-2xl font-bold text-accent mb-1">$25</div>
            <div className="text-text-secondary text-sm">Entry Tier</div>
          </div>
          <div className="card p-4 text-center">
            <div className="text-2xl font-bold text-accent mb-1">$100</div>
            <div className="text-text-secondary text-sm">Entry Tier</div>
          </div>
        </div>

        <DocsCallout type="info" title="One Entry Per Tier">
          You can enter each tier once per week. Enter all three tiers if you want maximum exposure!
        </DocsCallout>
      </section>

      {/* Tournament Timeline */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-4">Tournament Timeline</h2>
        <div className="space-y-4">
          <div className="card p-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded bg-bg-tertiary flex items-center justify-center text-xl">📝</div>
              <div>
                <h3 className="font-medium">Monday 00:00 UTC</h3>
                <p className="text-text-secondary text-sm">
                  New tournament opens. Pay entry fee and enter the draft queue.
                </p>
              </div>
            </div>
          </div>
          <div className="card p-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded bg-bg-tertiary flex items-center justify-center text-xl">🎯</div>
              <div>
                <h3 className="font-medium">Draft Phase (24 hours)</h3>
                <p className="text-text-secondary text-sm">
                  Complete your draft within 24 hours. Pick 6 memecoins in 6 rounds.
                </p>
              </div>
            </div>
          </div>
          <div className="card p-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded bg-bg-tertiary flex items-center justify-center text-xl">📈</div>
              <div>
                <h3 className="font-medium">Active Phase</h3>
                <p className="text-text-secondary text-sm">
                  Watch your portfolio&apos;s performance. Use power-ups strategically.
                </p>
              </div>
            </div>
          </div>
          <div className="card p-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded bg-bg-tertiary flex items-center justify-center text-xl">🏆</div>
              <div>
                <h3 className="font-medium">Sunday 23:59 UTC</h3>
                <p className="text-text-secondary text-sm">
                  Tournament ends. Final scores calculated and prizes distributed.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Draft Mechanics */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-4">Draft Mechanics</h2>
        <div className="card p-4 mb-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <div className="text-text-tertiary text-sm mb-1">Total Picks</div>
              <div className="font-bold">6 coins</div>
            </div>
            <div>
              <div className="text-text-tertiary text-sm mb-1">Options Per Round</div>
              <div className="font-bold">5 coins to choose from</div>
            </div>
            <div>
              <div className="text-text-tertiary text-sm mb-1">Time Per Pick</div>
              <div className="font-bold">30 seconds</div>
            </div>
            <div>
              <div className="text-text-tertiary text-sm mb-1">Draft Deadline</div>
              <div className="font-bold">24 hours after tournament starts</div>
            </div>
          </div>
        </div>

        <p className="text-text-secondary">
          Each round presents 5 memecoins. Select one before the 30-second timer expires.
          If you don&apos;t pick in time, a random coin is selected for you.
        </p>
      </section>

      {/* Power-ups */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-4">Power-ups</h2>
        <p className="text-text-secondary mb-4">
          Each entry comes with 3 power-ups. Use them wisely — you only get one of each!
        </p>

        <div className="space-y-4">
          <div className="card p-4">
            <div className="flex gap-4">
              <div className="text-3xl">🔄</div>
              <div>
                <h3 className="font-medium text-accent mb-1">Swap</h3>
                <p className="text-text-secondary text-sm">
                  Replace one of your picks with a different coin. You&apos;ll get 3 alternative
                  options to choose from. Use this if one of your picks is tanking.
                </p>
              </div>
            </div>
          </div>
          <div className="card p-4">
            <div className="flex gap-4">
              <div className="text-3xl">🚀</div>
              <div>
                <h3 className="font-medium text-accent mb-1">Boost</h3>
                <p className="text-text-secondary text-sm">
                  Apply a <strong>1.5x multiplier</strong> to one pick&apos;s percentage change.
                  Use this on your best performer to maximize gains. Works for gains AND losses!
                </p>
              </div>
            </div>
          </div>
          <div className="card p-4">
            <div className="flex gap-4">
              <div className="text-3xl">❄️</div>
              <div>
                <h3 className="font-medium text-accent mb-1">Freeze</h3>
                <p className="text-text-secondary text-sm">
                  Lock a pick&apos;s performance at its current value. The coin&apos;s % change
                  is frozen at the moment you activate this. Use to protect gains or stop losses.
                </p>
              </div>
            </div>
          </div>
        </div>

        <DocsCallout type="tip" title="Power-up Strategy">
          Wait until mid-week to use power-ups when trends are clearer. Boost your best performer,
          freeze your second-best to lock in gains, and swap your worst pick if it&apos;s still early.
        </DocsCallout>
      </section>

      {/* Scoring */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-4">Scoring</h2>
        <p className="text-text-secondary mb-4">
          Your final score is the sum of all your picks&apos; percentage changes from draft time
          to tournament end, with power-up modifiers applied.
        </p>

        <div className="card p-4 bg-bg-tertiary font-mono text-sm mb-4">
          Final Score = Σ (Pick % Change × Boost Multiplier)
        </div>

        <div className="card p-4">
          <h3 className="font-medium mb-3">Example Portfolio</h3>
          <div className="space-y-2 text-sm">
            <div className="grid grid-cols-3 text-text-tertiary font-medium border-b border-border-primary pb-2">
              <span>Coin</span>
              <span>% Change</span>
              <span>Contribution</span>
            </div>
            <div className="grid grid-cols-3 py-1">
              <span>WIF</span>
              <span className="text-success">+45%</span>
              <span className="text-success">+67.5% (Boosted)</span>
            </div>
            <div className="grid grid-cols-3 py-1">
              <span>BONK</span>
              <span className="text-success">+20%</span>
              <span className="text-success">+20% (Frozen)</span>
            </div>
            <div className="grid grid-cols-3 py-1">
              <span>PEPE</span>
              <span className="text-success">+15%</span>
              <span className="text-success">+15%</span>
            </div>
            <div className="grid grid-cols-3 py-1">
              <span>DOGE</span>
              <span className="text-danger">-5%</span>
              <span className="text-danger">-5%</span>
            </div>
            <div className="grid grid-cols-3 py-1">
              <span>SHIB</span>
              <span className="text-danger">-10%</span>
              <span className="text-danger">-10%</span>
            </div>
            <div className="grid grid-cols-3 py-1">
              <span>FLOKI</span>
              <span className="text-success">+8%</span>
              <span className="text-success">+8%</span>
            </div>
            <div className="grid grid-cols-3 pt-2 border-t border-border-primary font-medium">
              <span>Total</span>
              <span></span>
              <span className="text-success">+95.5%</span>
            </div>
          </div>
        </div>
      </section>

      {/* Prize Distribution */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-4">Prize Distribution</h2>
        <p className="text-text-secondary mb-4">
          The top 10% of entries share the prize pool. Distribution:
        </p>

        <div className="card p-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-text-secondary">1st Place</span>
              <span className="font-medium text-accent">30% of prize pool</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-text-secondary">2nd Place</span>
              <span className="font-medium">20% of prize pool</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-text-secondary">3rd Place</span>
              <span className="font-medium">15% of prize pool</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-text-secondary">4th+ (Top 10%)</span>
              <span className="font-medium">35% split evenly</span>
            </div>
          </div>
        </div>

        <DocsCallout type="info" title="Platform Fee">
          10% of the prize pool goes to the platform. The remaining 90% is distributed to winners.
        </DocsCallout>
      </section>

      {/* Tips */}
      <section>
        <h2 className="text-xl font-semibold mb-4">Strategy Tips</h2>
        <ul className="space-y-3">
          <li className="flex gap-3">
            <span className="text-accent">•</span>
            <span className="text-text-secondary">
              <strong>Diversify</strong> — Don&apos;t put all eggs in one basket. Mix established memes with moonshots.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="text-accent">•</span>
            <span className="text-text-secondary">
              <strong>Watch narratives</strong> — Memecoins follow trends. What&apos;s hot on CT this week?
            </span>
          </li>
          <li className="flex gap-3">
            <span className="text-accent">•</span>
            <span className="text-text-secondary">
              <strong>Timing matters</strong> — Draft early to get first pick of trending coins.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="text-accent">•</span>
            <span className="text-text-secondary">
              <strong>Use power-ups wisely</strong> — Don&apos;t waste them on day 1. Wait for clear trends.
            </span>
          </li>
        </ul>
      </section>
    </div>
  );
}
