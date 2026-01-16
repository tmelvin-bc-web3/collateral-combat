import DocsCallout from '@/components/docs/DocsCallout';

export default function GettingStartedPage() {
  return (
    <div className="animate-fadeIn">
      <h1 className="text-3xl font-bold mb-4">Getting Started</h1>
      <p className="text-text-secondary text-lg mb-8">
        Get up and running with DegenDome in minutes.
      </p>

      {/* Step 1 */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center font-bold">1</div>
          <h2 className="text-xl font-semibold">Connect Your Wallet</h2>
        </div>
        <div className="ml-11">
          <p className="text-text-secondary mb-4">
            DegenDome supports Solana wallets including Phantom, Solflare, and Backpack.
            Click the &quot;Connect Wallet&quot; button in the top right corner to get started.
          </p>
          <DocsCallout type="tip">
            Make sure you have some SOL in your wallet for deposits and transaction fees.
          </DocsCallout>
        </div>
      </div>

      {/* Step 2 - Deposit */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center font-bold">2</div>
          <h2 className="text-xl font-semibold">Deposit SOL</h2>
        </div>
        <div className="ml-11">
          <p className="text-text-secondary mb-4">
            DegenDome uses a unified on-chain balance system. Deposit SOL once and use it across all game modes.
          </p>
          <ol className="list-decimal list-inside space-y-2 text-text-secondary mb-4">
            <li>Click your balance in the header (or &quot;Deposit&quot; button)</li>
            <li>Enter the amount of SOL you want to deposit</li>
            <li>Confirm the transaction in your wallet</li>
            <li>Your balance is now ready for wagering!</li>
          </ol>
          <DocsCallout type="info" title="Your Funds Are Secure">
            Your deposited SOL is stored in a personal on-chain vault (PDA) that only you can withdraw from.
            The platform cannot access your funds.
          </DocsCallout>
        </div>
      </div>

      {/* Step 3 - Session Key (Optional) */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center font-bold">3</div>
          <h2 className="text-xl font-semibold">Create a Session (Recommended)</h2>
        </div>
        <div className="ml-11">
          <p className="text-text-secondary mb-4">
            For instant wagering without wallet popups, create a session key. This is optional but highly recommended
            for fast-paced games like Oracle predictions.
          </p>
          <ol className="list-decimal list-inside space-y-2 text-text-secondary mb-4">
            <li>Click your balance in the header</li>
            <li>Go to the <strong>Session</strong> tab</li>
            <li>Click &quot;Create Session (24h)&quot;</li>
            <li>Sign once &mdash; that&apos;s your last wallet popup!</li>
          </ol>
          <DocsCallout type="tip" title="Why Sessions?">
            With a session, you can place wagers instantly without any wallet popups.
            See <a href="/docs/session-betting" className="text-accent hover:underline">Session Wagering</a> for more details.
          </DocsCallout>
        </div>
      </div>

      {/* Step 4 */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center font-bold">4</div>
          <h2 className="text-xl font-semibold">Choose Your Game Mode</h2>
        </div>
        <div className="ml-11">
          <p className="text-text-secondary mb-4">
            Pick the game mode that suits your style:
          </p>
          <div className="space-y-3">
            <div className="card p-4">
              <h3 className="font-medium text-accent mb-1">Oracle (Predictions)</h3>
              <p className="text-text-secondary text-sm">
                Quick 30-second rounds. Perfect for beginners. Predict if price goes up or down.
                Uses Pyth oracle for tamper-proof prices.
              </p>
            </div>
            <div className="card p-4">
              <h3 className="font-medium text-accent mb-1">Battle Mode</h3>
              <p className="text-text-secondary text-sm">
                1v1 trading competitions. More strategic, uses leverage. Best P&L wins.
              </p>
            </div>
            <div className="card p-4">
              <h3 className="font-medium text-accent mb-1">Draft</h3>
              <p className="text-text-secondary text-sm">
                Weekly memecoin tournaments. Draft 6 coins and compete for the week.
              </p>
            </div>
            <div className="card p-4">
              <h3 className="font-medium text-accent mb-1">Spectate</h3>
              <p className="text-text-secondary text-sm">
                Watch live battles and wager on the outcome. Great for learning.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Step 5 */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center font-bold">5</div>
          <h2 className="text-xl font-semibold">Place Your First Wager</h2>
        </div>
        <div className="ml-11">
          <p className="text-text-secondary mb-4">
            For beginners, we recommend starting with <strong>Oracle</strong> predictions:
          </p>
          <ol className="list-decimal list-inside space-y-2 text-text-secondary">
            <li>Navigate to the Predict page</li>
            <li>Wait for the current round to end and a new one to begin</li>
            <li>Select your wager amount (0.01, 0.05, 0.1, 0.25, or 0.5 SOL)</li>
            <li>Click <span className="text-success">Long</span> if you think price will go up, or <span className="text-danger">Short</span> if down</li>
            <li>Your funds are locked instantly on-chain</li>
            <li>Watch the 30-second round play out!</li>
          </ol>
          <DocsCallout type="info" title="How Payouts Work">
            If you win, your payout is automatically credited to your balance.
            The platform takes a 5% fee from the losing pool. If it&apos;s a tie (push), you get your wager back.
          </DocsCallout>
        </div>
      </div>

      {/* Step 6 */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center font-bold">6</div>
          <h2 className="text-xl font-semibold">Level Up & Earn Perks</h2>
        </div>
        <div className="ml-11">
          <p className="text-text-secondary mb-4">
            Every wager you make earns you XP. As you level up, you unlock:
          </p>
          <ul className="list-disc list-inside space-y-2 text-text-secondary">
            <li><strong>Reduced Fees</strong> - Lower platform fee on winnings</li>
            <li><strong>Free Wagers</strong> - Earned at level milestones</li>
            <li><strong>Cosmetics</strong> - Profile borders and avatars</li>
            <li><strong>Titles</strong> - Show off your rank to others</li>
          </ul>
          <p className="text-text-secondary mt-4">
            Check the <a href="/docs/progression" className="text-accent hover:underline">Progression</a> page for full details.
          </p>
        </div>
      </div>

      {/* Tips */}
      <div className="card p-6">
        <h2 className="font-semibold mb-4">Pro Tips</h2>
        <ul className="space-y-3">
          <li className="flex gap-3">
            <span className="text-accent">&#x2022;</span>
            <span className="text-text-secondary text-sm">
              Start with small wagers (0.01-0.05 SOL) until you understand the mechanics.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="text-accent">&#x2022;</span>
            <span className="text-text-secondary text-sm">
              Create a session key for instant wagering &mdash; no more wallet popups!
            </span>
          </li>
          <li className="flex gap-3">
            <span className="text-accent">&#x2022;</span>
            <span className="text-text-secondary text-sm">
              Play daily to build your streak and earn bonus XP.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="text-accent">&#x2022;</span>
            <span className="text-text-secondary text-sm">
              Watch live battles before spectator wagering to understand the dynamics.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="text-accent">&#x2022;</span>
            <span className="text-text-secondary text-sm">
              Early wagers in Oracle get an &quot;Early Bird&quot; bonus &mdash; wager early in the round!
            </span>
          </li>
        </ul>
      </div>
    </div>
  );
}
