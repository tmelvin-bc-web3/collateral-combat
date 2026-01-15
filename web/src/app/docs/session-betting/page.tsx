import DocsCallout from '@/components/docs/DocsCallout';

export default function SessionBettingPage() {
  return (
    <div className="animate-fadeIn">
      <h1 className="text-3xl font-bold mb-4">Session Wagering</h1>
      <p className="text-text-secondary text-lg mb-8">
        Wager instantly without signing every transaction. Deposit once, wager freely.
      </p>

      {/* The Problem */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-4">The Problem</h2>
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
                  one wallet signature.
                </p>
                <div className="bg-bg-tertiary rounded p-3 font-mono text-xs text-text-secondary">
                  Wallet &rarr; User Balance PDA (program-controlled)
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
                  The session key signs transactions automatically &mdash; no wallet popups!
                  Place wagers as fast as you can click.
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
                <td className="py-3 px-4">Claim Winnings</td>
                <td className="py-3 px-4 text-success">Wallet OR Session</td>
                <td className="py-3 px-4">Low risk (goes to your balance)</td>
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
              No Withdrawal Access
            </h3>
            <p className="text-text-secondary text-sm">
              Session keys can only wager and claim &mdash; never withdraw. Your funds are protected
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
              Instant Revocation
            </h3>
            <p className="text-text-secondary text-sm">
              Revoke your session anytime with one click. The session key immediately becomes
              invalid for all future wagers.
            </p>
          </div>
          <div className="card p-4">
            <h3 className="font-medium mb-2 flex items-center gap-2">
              <span className="text-success">&#x2713;</span>
              On-Chain Validation
            </h3>
            <p className="text-text-secondary text-sm">
              The Solana program verifies session validity on every wager. Expired or revoked
              sessions are rejected at the blockchain level.
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
              <span className="text-text-secondary">Per-user deposited funds</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-border-primary">
              <span className="font-medium">Session Token</span>
              <span className="text-text-secondary">Authorized session key + expiry</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-border-primary">
              <span className="font-medium">Wagering Round</span>
              <span className="text-text-secondary">Round state and prize pools</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="font-medium">Player Position</span>
              <span className="text-text-secondary">Individual wager records</span>
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
            <h3 className="font-medium mb-2">Can I use session wagering on mobile?</h3>
            <p className="text-text-secondary text-sm">
              Yes! Session wagering works on any device with a Solana wallet. It&apos;s especially
              useful on mobile where wallet popups are more disruptive.
            </p>
          </div>

          <div className="card p-4">
            <h3 className="font-medium mb-2">Is there a fee for creating a session?</h3>
            <p className="text-text-secondary text-sm">
              Just the standard Solana transaction fee (~0.000005 SOL). There&apos;s no platform
              fee for session creation.
            </p>
          </div>

          <div className="card p-4">
            <h3 className="font-medium mb-2">Can I have multiple active sessions?</h3>
            <p className="text-text-secondary text-sm">
              No, only one session per wallet at a time. Creating a new session will replace
              the old one.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
