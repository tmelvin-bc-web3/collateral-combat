import DocsCallout from '@/components/docs/DocsCallout';

export default function TokenWarsPage() {
  return (
    <div className="animate-fadeIn">
      <h1 className="text-3xl font-bold mb-4">Token Wars</h1>
      <p className="text-text-secondary text-lg mb-8">
        Head-to-head token battles. Pick the token with the best price performance over 5 minutes and win the pool.
      </p>

      {/* How It Works */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-4">How It Works</h2>
        <div className="space-y-4">
          <div className="card p-4">
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded bg-bg-tertiary flex items-center justify-center font-bold text-accent">1</div>
              <div>
                <h3 className="font-medium mb-1">Betting Phase (60 seconds)</h3>
                <p className="text-text-secondary text-sm">
                  Two tokens are matched up (e.g., BTC vs ETH). You have 60 seconds to place your bet on which token
                  will have the better percentage price change. Bet anywhere from 0.01 to 10 SOL.
                </p>
              </div>
            </div>
          </div>
          <div className="card p-4">
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded bg-bg-tertiary flex items-center justify-center font-bold text-accent">2</div>
              <div>
                <h3 className="font-medium mb-1">Battle Phase (5 minutes)</h3>
                <p className="text-text-secondary text-sm">
                  The battle begins! Watch in real-time as both tokens compete. Starting prices are locked and
                  percentage changes are tracked live. The token with the higher % gain (or smaller % loss) wins.
                </p>
              </div>
            </div>
          </div>
          <div className="card p-4">
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded bg-bg-tertiary flex items-center justify-center font-bold text-accent">3</div>
              <div>
                <h3 className="font-medium mb-1">Settlement</h3>
                <p className="text-text-secondary text-sm">
                  After 5 minutes, the winner is determined by which token performed better.
                  Winners split the losing pool proportionally to their bet size. Winnings are credited automatically.
                </p>
              </div>
            </div>
          </div>
          <div className="card p-4">
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded bg-bg-tertiary flex items-center justify-center font-bold text-accent">4</div>
              <div>
                <h3 className="font-medium mb-1">Cooldown & Next Battle (60 seconds)</h3>
                <p className="text-text-secondary text-sm">
                  After settlement, there&apos;s a 60-second cooldown before the next battle begins with a new token matchup.
                  Battles run continuously 24/7.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Parimutuel Betting */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-4">Parimutuel Odds</h2>
        <p className="text-text-secondary mb-4">
          Token Wars uses parimutuel betting — like horse racing. All bets go into a shared pool, and winners
          split the losing side&apos;s pool proportionally.
        </p>

        <div className="card p-4 mb-4">
          <h3 className="font-medium mb-3">Example</h3>
          <div className="space-y-2 text-sm text-text-secondary">
            <p><strong>BTC Pool:</strong> 8 SOL total</p>
            <p><strong>ETH Pool:</strong> 2 SOL total</p>
            <p><strong>Your Bet:</strong> 1 SOL on ETH (50% of ETH pool)</p>
            <p className="pt-2 border-t border-border-primary">
              <strong>If ETH wins:</strong> 5% fee taken from BTC pool (0.4 SOL) → 7.6 SOL distributed.
              You receive 50% = 3.8 SOL profit + your 1 SOL back = 4.8 SOL total.
            </p>
          </div>
        </div>

        <DocsCallout type="tip" title="Contrarian Advantage">
          Betting on the underdog (smaller pool) gives better odds if they win. Watch the pools
          fill up during betting phase to find value.
        </DocsCallout>
      </section>

      {/* Token Matchups */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-4">Token Matchups</h2>
        <p className="text-text-secondary mb-4">
          Battles feature rotating matchups from popular tokens. Each battle brings a new pair.
        </p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <div className="card p-3 text-center">
            <div className="text-lg font-bold text-warning">BTC</div>
            <div className="text-text-tertiary text-xs">Bitcoin</div>
          </div>
          <div className="card p-3 text-center">
            <div className="text-lg font-bold text-blue-400">ETH</div>
            <div className="text-text-tertiary text-xs">Ethereum</div>
          </div>
          <div className="card p-3 text-center">
            <div className="text-lg font-bold text-purple-400">SOL</div>
            <div className="text-text-tertiary text-xs">Solana</div>
          </div>
          <div className="card p-3 text-center">
            <div className="text-lg font-bold text-amber-500">WIF</div>
            <div className="text-text-tertiary text-xs">dogwifhat</div>
          </div>
          <div className="card p-3 text-center">
            <div className="text-lg font-bold text-orange-400">BONK</div>
            <div className="text-text-tertiary text-xs">Bonk</div>
          </div>
          <div className="card p-3 text-center">
            <div className="text-lg font-bold text-green-400">JUP</div>
            <div className="text-text-tertiary text-xs">Jupiter</div>
          </div>
          <div className="card p-3 text-center">
            <div className="text-lg font-bold text-cyan-400">RAY</div>
            <div className="text-text-tertiary text-xs">Raydium</div>
          </div>
          <div className="card p-3 text-center">
            <div className="text-lg font-bold text-red-400">JTO</div>
            <div className="text-text-tertiary text-xs">Jito</div>
          </div>
        </div>

        <div className="card p-4">
          <h3 className="font-medium mb-3">Popular Matchups</h3>
          <div className="grid grid-cols-2 gap-2 text-sm text-text-secondary">
            <div>BTC vs ETH — <span className="text-text-tertiary">Classic crypto battle</span></div>
            <div>SOL vs ETH — <span className="text-text-tertiary">L1 rivalry</span></div>
            <div>WIF vs BONK — <span className="text-text-tertiary">Meme coin war</span></div>
            <div>JUP vs RAY — <span className="text-text-tertiary">Solana DEX battle</span></div>
          </div>
        </div>
      </section>

      {/* Winning Conditions */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-4">How Winners Are Determined</h2>

        <div className="space-y-4">
          <div className="card p-4">
            <h3 className="font-medium mb-2">Percentage Change Comparison</h3>
            <p className="text-text-secondary text-sm mb-3">
              The winning token is determined by comparing percentage price changes from start to end of battle.
            </p>
            <div className="bg-bg-tertiary p-3 rounded text-sm font-mono">
              <p>Token A: $100 → $102 = <span className="text-success">+2.00%</span></p>
              <p>Token B: $50 → $50.50 = <span className="text-success">+1.00%</span></p>
              <p className="mt-2 text-text-primary">Winner: Token A (+2.00% &gt; +1.00%)</p>
            </div>
          </div>

          <div className="card p-4">
            <h3 className="font-medium mb-2">Both Tokens Down?</h3>
            <p className="text-text-secondary text-sm">
              If both tokens drop, the one with the <strong>smaller loss</strong> wins.
            </p>
            <div className="bg-bg-tertiary p-3 rounded text-sm font-mono mt-3">
              <p>Token A: $100 → $98 = <span className="text-danger">-2.00%</span></p>
              <p>Token B: $50 → $49 = <span className="text-danger">-2.00%</span></p>
              <p className="mt-2 text-text-primary">Winner: Tie — bets refunded</p>
            </div>
          </div>
        </div>

        <DocsCallout type="info" title="Ties">
          If both tokens have exactly the same percentage change, all bets are refunded.
        </DocsCallout>
      </section>

      {/* Technical Details */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-4">Technical Details</h2>

        <div className="card p-4 mb-4">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between py-1">
              <span className="text-text-tertiary">Betting Window</span>
              <span>60 seconds</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-text-tertiary">Battle Duration</span>
              <span>5 minutes</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-text-tertiary">Cooldown</span>
              <span>60 seconds</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-text-tertiary">Minimum Bet</span>
              <span>0.01 SOL</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-text-tertiary">Maximum Bet</span>
              <span>10 SOL</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-text-tertiary">Platform Fee</span>
              <span>5% of losing pool</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-text-tertiary">Operation</span>
              <span>24/7 continuous</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-text-tertiary">Price Verification</span>
              <span>Pyth Network</span>
            </div>
          </div>
        </div>

        <DocsCallout type="info" title="Price Verification">
          Prices are sourced from our backend and verified against Pyth Network oracles at battle start and end.
          View the verification badge to confirm prices were accurate.
        </DocsCallout>
      </section>

      {/* No Bets Scenario */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-4">What If Nobody Bets?</h2>
        <p className="text-text-secondary mb-4">
          If no bets are placed during the betting window, the battle is cancelled and a new one starts
          immediately after cooldown. No fees are charged.
        </p>
      </section>

      {/* Strategy Tips */}
      <section>
        <h2 className="text-xl font-semibold mb-4">Strategy Tips</h2>
        <ul className="space-y-3">
          <li className="flex gap-3">
            <span className="text-accent">&#x2022;</span>
            <span className="text-text-secondary">
              <strong>Watch the pools</strong> — Smaller pools mean better odds. If everyone is betting BTC, ETH might offer more value.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="text-accent">&#x2022;</span>
            <span className="text-text-secondary">
              <strong>Consider volatility</strong> — Meme coins (WIF, BONK) can move more in 5 minutes than majors (BTC, ETH).
            </span>
          </li>
          <li className="flex gap-3">
            <span className="text-accent">&#x2022;</span>
            <span className="text-text-secondary">
              <strong>Check correlation</strong> — Highly correlated pairs (BTC/ETH) often move together. Look for pairs with different momentum.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="text-accent">&#x2022;</span>
            <span className="text-text-secondary">
              <strong>News matters</strong> — A token with upcoming news or catalyst might outperform in the short term.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="text-accent">&#x2022;</span>
            <span className="text-text-secondary">
              <strong>Bet early for better odds</strong> — Early bets lock in better odds before the pool grows on your side.
            </span>
          </li>
        </ul>
      </section>
    </div>
  );
}
