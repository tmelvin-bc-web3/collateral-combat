import DocsCallout from '@/components/docs/DocsCallout';

export default function SessionBettingPage() {
  return (
    <div className="animate-fadeIn">
      <h1 className="text-3xl font-bold mb-4">Session Wagering</h1>
      <p className="text-text-secondary text-lg mb-8">
        Deposit once, play everywhere. A unified balance system with instant wagering across all game modes.
      </p>

      {/* Unified Balance System */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-4">Unified Balance System</h2>
        <p className="text-text-secondary mb-4">
          DegenDome uses a single on-chain balance for all game modes. Deposit SOL once and use it for:
        </p>
        <div className="grid md:grid-cols-2 gap-4 mb-4">
          <div className="card p-4">
            <h3 className="font-medium text-accent mb-2">Oracle Predictions</h3>
            <p className="text-text-secondary text-sm">30-second price prediction rounds</p>
          </div>
          <div className="card p-4">
            <h3 className="font-medium text-accent mb-2">Battle Mode</h3>
            <p className="text-text-secondary text-sm">1v1 trading competitions</p>
          </div>
          <div className="card p-4">
            <h3 className="font-medium text-accent mb-2">Draft Tournaments</h3>
            <p className="text-text-secondary text-sm">Weekly memecoin competitions</p>
          </div>
          <div className="card p-4">
            <h3 className="font-medium text-accent mb-2">Spectator Wagering</h3>
            <p className="text-text-secondary text-sm">Wager on live battles</p>
          </div>
        </div>
        <DocsCallout type="info" title="One Balance, All Games">
          Your winnings from any game mode are automatically credited to your balance. No need to claim or transfer between modes.
        </DocsCallout>
      </section>

      {/* The Problem */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-4">The Problem Session Keys Solve</h2>
        <p className="text-text-secondary mb-4">
          Normally, every Solana transaction requires a wallet signature. For fast-paced wagering,
          this means constant popups interrupting your flow:
        </p>
        <div className="card p-4 border-red-500/30 mb-4">
          <p className="text-text-secondary text-sm">
            Click wager &rarr; Popup &rarr; Sign &rarr; Wait &rarr; Click wager &rarr; Popup &rarr; Sign &rarr; Wait...
          </p>
        </div>
        <p className="text-text-secondary">
          This is slow, annoying, and breaks your concentration during time-sensitive predictions.
        </p>
      </section>

      {/* The Solution */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-4">The Solution: Session Keys</h2>
        <p className="text-text-secondary mb-4">
          Session wagering lets you authorize a temporary key that can place wagers on your behalf.
          You sign once, then wager freely for up to 24 hours.
        </p>
        <div className="card p-4 border-success/30">
          <p className="text-text-secondary text-sm">
            Deposit once &rarr; Create session &rarr; Wager instantly &rarr; Wager instantly &rarr; Wager instantly...
          </p>
        </div>
      </section>

      {/* How It Works */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-4">How It Works</h2>

        <div className="space-y-4">
          {/* Step 1 */}
          <div className="card p-4">
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center text-accent font-bold flex-shrink-0">
                1
              </div>
              <div>
                <h3 className="font-medium mb-2">Deposit SOL</h3>
                <p className="text-text-secondary text-sm mb-2">
                  Transfer SOL from your wallet to your on-chain wagering balance. This requires
                  one wallet signature. Your funds are stored in a PDA (Program Derived Address)
                  that only you can withdraw from.
                </p>
                <div className="bg-bg-tertiary rounded p-3 font-mono text-xs text-text-secondary">
                  Wallet &rarr; User Vault PDA (your personal on-chain balance)
                </div>
              </div>
            </div>
          </div>

          {/* Step 2 */}
          <div className="card p-4">
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center text-accent font-bold flex-shrink-0">
                2
              </div>
              <div>
                <h3 className="font-medium mb-2">Create Session</h3>
                <p className="text-text-secondary text-sm mb-2">
                  A temporary keypair is generated and stored in your browser. You sign once to
                  authorize this keypair for up to 24 hours.
                </p>
                <div className="bg-bg-tertiary rounded p-3 font-mono text-xs text-text-secondary">
                  Session Token: valid_until, session_key, authority
                </div>
              </div>
            </div>
          </div>

          {/* Step 3 */}
          <div className="card p-4">
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-lg bg-success/20 flex items-center justify-center text-success font-bold flex-shrink-0">
                3
              </div>
              <div>
                <h3 className="font-medium mb-2">Wager Instantly</h3>
                <p className="text-text-secondary text-sm mb-2">
                  Place wagers across any game mode without wallet popups. Your balance is verified
                  on-chain and funds are locked immediately when you wager.
                </p>
                <div className="bg-success/10 border border-success/30 rounded p-3 text-sm text-success">
                  No popups. No waiting. Instant wagers.
                </div>
              </div>
            </div>
          </div>

          {/* Step 4 */}
          <div className="card p-4">
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-lg bg-bg-tertiary flex items-center justify-center font-bold flex-shrink-0">
                4
              </div>
              <div>
                <h3 className="font-medium mb-2">Automatic Payouts</h3>
                <p className="text-text-secondary text-sm mb-2">
                  When you win, your payout is automatically credited to your balance. No claiming
                  required &mdash; funds appear in your balance immediately after settlement.
                </p>
              </div>
            </div>
          </div>

          {/* Step 5 */}
          <div className="card p-4">
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-lg bg-bg-tertiary flex items-center justify-center font-bold flex-shrink-0">
                5
              </div>
              <div>
                <h3 className="font-medium mb-2">Withdraw Anytime</h3>
                <p className="text-text-secondary text-sm mb-2">
                  When you&apos;re done, withdraw your balance back to your wallet. Withdrawals
                  always require your wallet signature for security.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Fund Locking Security */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-4">On-Chain Fund Locking</h2>
        <p className="text-text-secondary mb-4">
          When you place a wager, your funds are immediately locked on-chain. This prevents
          any possibility of wagering with funds you don&apos;t have.
        </p>

        <div className="card p-4 mb-4">
          <h3 className="font-medium mb-3">Wager Flow</h3>
          <div className="space-y-3 text-sm">
            <div className="flex gap-4">
              <div className="w-6 h-6 rounded bg-bg-tertiary flex items-center justify-center text-xs font-bold">1</div>
              <p className="text-text-secondary">Backend verifies your on-chain balance</p>
            </div>
            <div className="flex gap-4">
              <div className="w-6 h-6 rounded bg-bg-tertiary flex items-center justify-center text-xs font-bold">2</div>
              <p className="text-text-secondary">Funds transferred from your vault to global vault (on-chain)</p>
            </div>
            <div className="flex gap-4">
              <div className="w-6 h-6 rounded bg-bg-tertiary flex items-center justify-center text-xs font-bold">3</div>
              <p className="text-text-secondary">Wager confirmed &mdash; funds are locked</p>
            </div>
            <div className="flex gap-4">
              <div className="w-6 h-6 rounded bg-bg-tertiary flex items-center justify-center text-xs font-bold">4</div>
              <p className="text-text-secondary">If you win: payout credited from global vault to your vault</p>
            </div>
          </div>
        </div>

        <DocsCallout type="info" title="Tamper-Proof Wagering">
          Because funds are locked on-chain immediately, you cannot withdraw after placing a wager.
          This ensures fair play for all participants.
        </DocsCallout>
      </section>

      {/* Security */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-4">Security Model</h2>
        <p className="text-text-secondary mb-4">
          Session keys are designed with security as the top priority. Even if compromised,
          your funds remain safe.
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-primary">
                <th className="text-left py-3 px-4">Action</th>
                <th className="text-left py-3 px-4">Who Can Do It</th>
                <th className="text-left py-3 px-4">Why</th>
              </tr>
            </thead>
            <tbody className="text-text-secondary">
              <tr className="border-b border-border-primary">
                <td className="py-3 px-4">Deposit</td>
                <td className="py-3 px-4 text-yellow-400">Wallet only</td>
                <td className="py-3 px-4">Moving funds in</td>
              </tr>
              <tr className="border-b border-border-primary">
                <td className="py-3 px-4">Create Session</td>
                <td className="py-3 px-4 text-yellow-400">Wallet only</td>
                <td className="py-3 px-4">Authorizing a key</td>
              </tr>
              <tr className="border-b border-border-primary">
                <td className="py-3 px-4">Place Wager</td>
                <td className="py-3 px-4 text-success">Wallet OR Session</td>
                <td className="py-3 px-4">Core feature</td>
              </tr>
              <tr className="border-b border-border-primary">
                <td className="py-3 px-4">Receive Winnings</td>
                <td className="py-3 px-4 text-success">Automatic</td>
                <td className="py-3 px-4">Credited to balance on settlement</td>
              </tr>
              <tr className="border-b border-border-primary">
                <td className="py-3 px-4 font-medium">Withdraw</td>
                <td className="py-3 px-4 text-red-400 font-medium">Wallet ONLY</td>
                <td className="py-3 px-4 font-medium">Protects your funds</td>
              </tr>
              <tr>
                <td className="py-3 px-4">Revoke Session</td>
                <td className="py-3 px-4 text-yellow-400">Wallet only</td>
                <td className="py-3 px-4">Emergency stop</td>
              </tr>
            </tbody>
          </table>
        </div>

        <DocsCallout type="info" title="Key Security Feature">
          Session keys can NEVER withdraw funds. Even if someone steals your session key,
          they cannot take your money &mdash; withdrawals always require your wallet signature.
        </DocsCallout>
      </section>

      {/* Key Features */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-4">Key Security Features</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="card p-4">
            <h3 className="font-medium mb-2 flex items-center gap-2">
              <span className="text-success">&#x2713;</span>
              Immediate Fund Locking
            </h3>
            <p className="text-text-secondary text-sm">
              Funds are locked on-chain the moment you place a wager. No possibility of
              withdrawing wagered funds before settlement.
            </p>
          </div>
          <div className="card p-4">
            <h3 className="font-medium mb-2 flex items-center gap-2">
              <span className="text-success">&#x2713;</span>
              No Withdrawal Access
            </h3>
            <p className="text-text-secondary text-sm">
              Session keys can only wager &mdash; never withdraw. Your funds are protected
              even if the session key is compromised.
            </p>
          </div>
          <div className="card p-4">
            <h3 className="font-medium mb-2 flex items-center gap-2">
              <span className="text-success">&#x2713;</span>
              24-Hour Maximum
            </h3>
            <p className="text-text-secondary text-sm">
              Sessions automatically expire after 24 hours maximum. You choose the duration
              when creating a session.
            </p>
          </div>
          <div className="card p-4">
            <h3 className="font-medium mb-2 flex items-center gap-2">
              <span className="text-success">&#x2713;</span>
              On-Chain Validation
            </h3>
            <p className="text-text-secondary text-sm">
              All balances are verified directly from the Solana blockchain. Cannot be faked
              or manipulated.
            </p>
          </div>
        </div>
      </section>

      {/* On-Chain Program */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-4">On-Chain Program</h2>
        <p className="text-text-secondary mb-4">
          Session wagering is powered by a Solana smart contract built with the Anchor framework.
        </p>

        <div className="card p-4 mb-4">
          <div className="space-y-2 text-sm">
            <div>
              <span className="text-text-tertiary">Program ID:</span>
              <code className="ml-2 text-accent font-mono text-xs break-all">
                4EMMUfMMx61ynFq53fi8nsXBdDRcB1KuDuAmjsYMAKAA
              </code>
            </div>
            <div>
              <span className="text-text-tertiary">Network:</span>
              <span className="ml-2">Solana (Devnet)</span>
            </div>
            <div>
              <span className="text-text-tertiary">Framework:</span>
              <span className="ml-2">Anchor 0.31.1</span>
            </div>
            <div>
              <span className="text-text-tertiary">Price Oracle:</span>
              <span className="ml-2">Pyth Network</span>
            </div>
          </div>
        </div>

        <h3 className="font-medium mb-3">Program Accounts (PDAs)</h3>
        <div className="card p-4">
          <div className="space-y-3 text-sm">
            <div className="flex justify-between items-center py-2 border-b border-border-primary">
              <span className="font-medium">Game State</span>
              <span className="text-text-secondary">Global configuration and authority</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-border-primary">
              <span className="font-medium">User Balance</span>
              <span className="text-text-secondary">Per-user balance tracking</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-border-primary">
              <span className="font-medium">User Vault</span>
              <span className="text-text-secondary">Per-user SOL storage</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-border-primary">
              <span className="font-medium">Global Vault</span>
              <span className="text-text-secondary">Locked wager funds and payout pool</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-border-primary">
              <span className="font-medium">Session Token</span>
              <span className="text-text-secondary">Authorized session key + expiry</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-border-primary">
              <span className="font-medium">Betting Round</span>
              <span className="text-text-secondary">On-chain round state with Pyth prices</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="font-medium">Betting Pool</span>
              <span className="text-text-secondary">Long/Short pool totals per round</span>
            </div>
          </div>
        </div>
      </section>

      {/* Using Session Wagering */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-4">Using Session Wagering</h2>

        <h3 className="font-medium mb-3">From the Wallet Balance Modal</h3>
        <ol className="list-decimal list-inside space-y-3 text-text-secondary mb-6">
          <li>Click your balance in the header to open the Wallet Balance modal</li>
          <li>Go to the <strong>Deposit</strong> tab and deposit SOL to your wagering balance</li>
          <li>Go to the <strong>Session</strong> tab and click &quot;Create Session (24h)&quot;</li>
          <li>Sign the transaction in your wallet &mdash; this is your last signature!</li>
          <li>You&apos;ll see a green dot indicating your session is active</li>
          <li>Now place wagers instantly without any popups</li>
        </ol>

        <DocsCallout type="tip" title="Pro Tip">
          Create a session before a fast round starts. That way you&apos;re ready to wager
          the moment the wagering window opens.
        </DocsCallout>
      </section>

      {/* FAQ */}
      <section>
        <h2 className="text-xl font-semibold mb-4">Frequently Asked Questions</h2>

        <div className="space-y-4">
          <div className="card p-4">
            <h3 className="font-medium mb-2">What happens if I close my browser?</h3>
            <p className="text-text-secondary text-sm">
              Your session key is stored in localStorage, so it persists across browser sessions.
              When you return, your session will still be active (if not expired).
            </p>
          </div>

          <div className="card p-4">
            <h3 className="font-medium mb-2">What if someone steals my session key?</h3>
            <p className="text-text-secondary text-sm">
              They could place wagers with your balance, but they cannot withdraw funds. You can
              also revoke the session immediately from your wallet to stop any further activity.
            </p>
          </div>

          <div className="card p-4">
            <h3 className="font-medium mb-2">Can I use my balance across all game modes?</h3>
            <p className="text-text-secondary text-sm">
              Yes! Your deposited balance works for Oracle predictions, Battle entry fees,
              Draft tournaments, and Spectator wagering. One deposit, all games.
            </p>
          </div>

          <div className="card p-4">
            <h3 className="font-medium mb-2">Are my funds safe if the backend goes down?</h3>
            <p className="text-text-secondary text-sm">
              Yes. Your funds are stored in your personal on-chain vault PDA. Only you can
              withdraw them using your wallet. The backend cannot access your funds.
            </p>
          </div>

          <div className="card p-4">
            <h3 className="font-medium mb-2">Is there a fee for creating a session?</h3>
            <p className="text-text-secondary text-sm">
              Just the standard Solana transaction fee (~0.000005 SOL). There&apos;s no platform
              fee for session creation.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
