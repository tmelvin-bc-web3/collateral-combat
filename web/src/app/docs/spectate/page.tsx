import DocsCallout from '@/components/docs/DocsCallout';

export default function SpectatePage() {
  return (
    <div className="animate-fadeIn">
      <h1 className="text-3xl font-bold mb-4">Spectate</h1>
      <p className="text-text-secondary text-lg mb-8">
        Watch live battles and wager on the outcome. Dynamic odds based on real-time performance.
      </p>

      {/* Overview */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-4">Overview</h2>
        <p className="text-text-secondary mb-4">
          Spectator wagerting lets you watch live 1v1 battles and place wagers on who will win.
          Odds update in real-time based on each player&apos;s performance, creating exciting
          opportunities to wager on comebacks or lock in favorites.
        </p>

        <div className="grid md:grid-cols-3 gap-4">
          <div className="card p-4 text-center">
            <div className="text-2xl font-bold text-accent mb-1">0.01 SOL</div>
            <div className="text-text-secondary text-sm">Minimum Wager</div>
          </div>
          <div className="card p-4 text-center">
            <div className="text-2xl font-bold text-accent mb-1">10 SOL</div>
            <div className="text-text-secondary text-sm">Maximum Wager</div>
          </div>
          <div className="card p-4 text-center">
            <div className="text-2xl font-bold text-accent mb-1">5%</div>
            <div className="text-text-secondary text-sm">Fee on Winnings</div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-4">How It Works</h2>
        <div className="space-y-4">
          <div className="card p-4">
            <h3 className="font-medium mb-2">1. Find a Live Battle</h3>
            <p className="text-text-secondary text-sm">
              Browse the Spectate page to see all active battles. You&apos;ll see both players&apos;
              current P&L and the live odds for each side.
            </p>
          </div>
          <div className="card p-4">
            <h3 className="font-medium mb-2">2. Analyze the Match</h3>
            <p className="text-text-secondary text-sm">
              Watch the battle unfold. Check each player&apos;s positions, leverage, and trading style.
              The player ahead isn&apos;t always the best wager — comebacks happen!
            </p>
          </div>
          <div className="card p-4">
            <h3 className="font-medium mb-2">3. Place Your Wager</h3>
            <p className="text-text-secondary text-sm">
              Choose which player to back and enter your wager amount. Your odds are locked in
              for 30 seconds while you complete the on-chain transaction.
            </p>
          </div>
          <div className="card p-4">
            <h3 className="font-medium mb-2">4. Collect Winnings</h3>
            <p className="text-text-secondary text-sm">
              If your player wins, claim your winnings from the Claims tab.
              Payouts are automatic and on-chain verified.
            </p>
          </div>
        </div>
      </section>

      {/* Understanding Odds */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-4">Understanding Odds</h2>
        <p className="text-text-secondary mb-4">
          Odds represent your potential payout multiplier. They&apos;re calculated based on:
        </p>

        <ul className="list-disc list-inside space-y-2 text-text-secondary mb-4">
          <li><strong>Current P&L differential</strong> — The bigger the lead, the worse the odds for the favorite</li>
          <li><strong>Total amount wager on each side</strong> — More money on one side = worse odds for that side</li>
        </ul>

        <div className="card p-4 mb-4">
          <h3 className="font-medium mb-3">Example</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="p-3 rounded bg-success-muted">
              <div className="font-medium text-success mb-1">Player A (Leading)</div>
              <div className="text-text-secondary text-sm">P&L: +25%</div>
              <div className="text-text-secondary text-sm">Odds: <span className="font-mono">1.3x</span></div>
            </div>
            <div className="p-3 rounded bg-danger-muted">
              <div className="font-medium text-danger mb-1">Player B (Trailing)</div>
              <div className="text-text-secondary text-sm">P&L: -5%</div>
              <div className="text-text-secondary text-sm">Odds: <span className="font-mono">3.2x</span></div>
            </div>
          </div>
          <p className="text-text-secondary text-sm mt-4">
            Wagerting 1 SOL on Player A pays 1.3 SOL if they win.
            Wagerting 1 SOL on Player B pays 3.2 SOL if they stage a comeback.
          </p>
        </div>

        <DocsCallout type="info" title="Odds Range">
          Odds range from 1.1x (heavy favorite) to 5.0x (big underdog).
          The system prevents extreme odds to ensure fair payouts.
        </DocsCallout>
      </section>

      {/* Odds Lock */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-4">Odds Lock Mechanism</h2>
        <p className="text-text-secondary mb-4">
          When you place a wager, your odds are <strong>locked for 30 seconds</strong>. This prevents
          odds manipulation and ensures you get the odds you expect.
        </p>

        <div className="card p-4">
          <div className="space-y-3">
            <div className="flex gap-4">
              <div className="w-6 h-6 rounded-full bg-accent flex items-center justify-center text-xs font-bold">1</div>
              <p className="text-text-secondary text-sm">Click &quot;Place Wager&quot; and select your amount</p>
            </div>
            <div className="flex gap-4">
              <div className="w-6 h-6 rounded-full bg-accent flex items-center justify-center text-xs font-bold">2</div>
              <p className="text-text-secondary text-sm">Review your locked odds and potential payout</p>
            </div>
            <div className="flex gap-4">
              <div className="w-6 h-6 rounded-full bg-accent flex items-center justify-center text-xs font-bold">3</div>
              <p className="text-text-secondary text-sm">Confirm the transaction in your wallet within 30 seconds</p>
            </div>
            <div className="flex gap-4">
              <div className="w-6 h-6 rounded-full bg-accent flex items-center justify-center text-xs font-bold">4</div>
              <p className="text-text-secondary text-sm">Your wager is recorded at the locked odds</p>
            </div>
          </div>
        </div>

        <DocsCallout type="warning" title="Lock Expiry">
          If you don&apos;t complete the transaction within 30 seconds, the lock expires and you&apos;ll
          need to start over. Current odds may have changed!
        </DocsCallout>
      </section>

      {/* Claiming Winnings */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-4">Claiming Winnings</h2>
        <p className="text-text-secondary mb-4">
          When a battle ends and your player wins:
        </p>

        <ol className="list-decimal list-inside space-y-2 text-text-secondary mb-4">
          <li>Go to the Spectate page and open the <strong>Claims</strong> tab</li>
          <li>You&apos;ll see all your unclaimed winning wagers</li>
          <li>Click &quot;Claim&quot; to receive your payout</li>
          <li>Confirm the transaction in your wallet</li>
          <li>Funds are transferred to your wallet</li>
        </ol>

        <DocsCallout type="tip">
          There&apos;s no time limit on claiming winnings, but we recommend claiming promptly.
          Unclaimed wagers are visible in your Claims tab indefinitely.
        </DocsCallout>
      </section>

      {/* Wager Outcomes */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-4">Possible Outcomes</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="card p-4 border-success/30">
            <h3 className="font-medium text-success mb-2">Win</h3>
            <p className="text-text-secondary text-sm">
              Your player won the battle. Claim your wager amount × odds (minus 5% fee).
            </p>
          </div>
          <div className="card p-4 border-danger/30">
            <h3 className="font-medium text-danger mb-2">Lose</h3>
            <p className="text-text-secondary text-sm">
              Your player lost. Your wager goes to the winning pool. No additional fees.
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
              <strong>Watch before wagerting</strong> — Observe trading styles and patterns before placing wagers.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="text-accent">•</span>
            <span className="text-text-secondary">
              <strong>Consider time remaining</strong> — Large comebacks are possible early, less likely late.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="text-accent">•</span>
            <span className="text-text-secondary">
              <strong>Check leverage levels</strong> — High leverage traders can swing wildly either direction.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="text-accent">•</span>
            <span className="text-text-secondary">
              <strong>Value underdog odds</strong> — 3x+ odds on a skilled trailing player can be profitable.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="text-accent">•</span>
            <span className="text-text-secondary">
              <strong>Don&apos;t chase</strong> — One bad wager doesn&apos;t need to lead to more.
            </span>
          </li>
        </ul>
      </section>
    </div>
  );
}
