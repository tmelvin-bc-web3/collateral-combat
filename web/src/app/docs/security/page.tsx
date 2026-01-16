import DocsCallout from '@/components/docs/DocsCallout';

export default function SecurityPage() {
  return (
    <div className="animate-fadeIn">
      <h1 className="text-3xl font-bold mb-4">Security & Technical</h1>
      <p className="text-text-secondary text-lg mb-8">
        How DegenDome ensures fair play, secure fund management, and verifiable outcomes.
      </p>

      {/* Trust Model */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-4">Our Trust Model</h2>
        <p className="text-text-secondary mb-4">
          DegenDome uses a hybrid architecture that combines on-chain security with off-chain efficiency.
          Your funds are always protected by Solana smart contracts.
        </p>

        <div className="space-y-4">
          <div className="card p-4 border-success/30">
            <h3 className="font-medium text-success mb-2">What&apos;s Trustless (On-Chain)</h3>
            <ul className="list-disc list-inside space-y-1 text-text-secondary text-sm">
              <li>User balances stored in personal vault PDAs</li>
              <li>Fund locking when wagers are placed</li>
              <li>Oracle round lifecycle (start, lock, settle)</li>
              <li>Price data from Pyth Network oracle</li>
              <li>Withdrawals require wallet signature</li>
              <li>Automatic payout crediting</li>
            </ul>
          </div>
          <div className="card p-4 border-yellow-500/30">
            <h3 className="font-medium text-yellow-400 mb-2">What&apos;s Managed (Backend)</h3>
            <ul className="list-disc list-inside space-y-1 text-text-secondary text-sm">
              <li>Individual wager tracking for efficiency</li>
              <li>Real-time game coordination</li>
              <li>Payout calculations and distribution</li>
              <li>Battle matchmaking</li>
            </ul>
          </div>
        </div>

        <DocsCallout type="info" title="Key Security Property">
          Even if the backend is compromised, an attacker cannot withdraw user funds.
          Withdrawals always require the user&apos;s wallet signature.
        </DocsCallout>
      </section>

      {/* Fund Security */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-4">Fund Security</h2>
        <p className="text-text-secondary mb-4">
          Your funds are protected by multiple layers of on-chain security.
        </p>

        <h3 className="font-medium mb-3">How Funds Are Protected</h3>
        <div className="card p-4 mb-4">
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded bg-success/20 flex items-center justify-center text-success text-sm font-bold flex-shrink-0">1</div>
              <div>
                <p className="font-medium">Deposit to Personal Vault</p>
                <p className="text-text-secondary text-sm">
                  Your SOL goes to a PDA (Program Derived Address) that only you control.
                  The backend cannot access it.
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded bg-success/20 flex items-center justify-center text-success text-sm font-bold flex-shrink-0">2</div>
              <div>
                <p className="font-medium">Immediate Fund Locking</p>
                <p className="text-text-secondary text-sm">
                  When you place a wager, funds are transferred on-chain from your vault to the global vault.
                  This prevents the &quot;bet then withdraw&quot; exploit.
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded bg-success/20 flex items-center justify-center text-success text-sm font-bold flex-shrink-0">3</div>
              <div>
                <p className="font-medium">On-Chain Balance Verification</p>
                <p className="text-text-secondary text-sm">
                  Before accepting any wager, the backend reads your actual on-chain balance.
                  Cannot be faked or manipulated.
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded bg-success/20 flex items-center justify-center text-success text-sm font-bold flex-shrink-0">4</div>
              <div>
                <p className="font-medium">Wallet-Only Withdrawals</p>
                <p className="text-text-secondary text-sm">
                  Only your wallet can withdraw funds. Session keys, the backend, and the authority
                  cannot withdraw on your behalf.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* On-Chain Programs */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-4">On-Chain Program</h2>
        <p className="text-text-secondary mb-4">
          All game modes use a single unified program for balance management and settlements.
        </p>

        <h3 className="font-medium mb-3">Session Betting Program</h3>
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
              <span className="ml-2">Solana Devnet</span>
            </div>
            <div>
              <span className="text-text-tertiary">Framework:</span>
              <span className="ml-2">Anchor 0.31.1</span>
            </div>
            <div>
              <span className="text-text-tertiary">Functions:</span>
              <span className="ml-2">Deposits, withdrawals, sessions, Oracle rounds, fund locking, payouts</span>
            </div>
          </div>
        </div>

        <DocsCallout type="info" title="Unified Architecture">
          Oracle, Battle, Draft, and Spectator modes all use the same Session Betting Program.
          One deposit works everywhere. One balance across all games.
        </DocsCallout>
      </section>

      {/* PDAs */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-4">Program Derived Addresses (PDAs)</h2>
        <p className="text-text-secondary mb-4">
          Our smart contracts use PDAs to store data and funds on-chain. PDAs are
          deterministically generated addresses controlled by the program.
        </p>

        <div className="card p-4">
          <div className="space-y-3 text-sm">
            <div className="flex justify-between items-center py-2 border-b border-border-primary">
              <span className="font-medium">Game State</span>
              <span className="text-text-secondary">Global configuration and authority</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-border-primary">
              <span className="font-medium">User Balance</span>
              <span className="text-text-secondary">Tracks deposited, withdrawn, won amounts</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-border-primary">
              <span className="font-medium">User Vault</span>
              <span className="text-text-secondary">Holds user&apos;s SOL (personal PDA)</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-border-primary">
              <span className="font-medium">Global Vault</span>
              <span className="text-text-secondary">Holds locked wager funds</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-border-primary">
              <span className="font-medium">Session Token</span>
              <span className="text-text-secondary">Authorized session key with expiry</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-border-primary">
              <span className="font-medium">Betting Round</span>
              <span className="text-text-secondary">Round state with Pyth prices</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="font-medium">Betting Pool</span>
              <span className="text-text-secondary">Long/Short pool totals</span>
            </div>
          </div>
        </div>
      </section>

      {/* Price Oracle */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-4">Pyth Network Oracle</h2>
        <p className="text-text-secondary mb-4">
          Price data for Oracle predictions comes from Pyth Network, a decentralized oracle
          used by major DeFi protocols.
        </p>

        <div className="card p-4 mb-4">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between py-1">
              <span className="text-text-tertiary">Oracle Provider</span>
              <span>Pyth Network</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-text-tertiary">Update Frequency</span>
              <span>~400ms</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-text-tertiary">Data Sources</span>
              <span>70+ institutional providers</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-text-tertiary">Max Price Age</span>
              <span>60 seconds</span>
            </div>
          </div>
        </div>

        <DocsCallout type="info" title="Tamper-Proof Prices">
          Pyth prices are verified on-chain during round lock and settlement.
          The backend cannot manipulate price data.
        </DocsCallout>
      </section>

      {/* Authority Security */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-4">Authority Security</h2>
        <p className="text-text-secondary mb-4">
          The program authority can manage rounds but cannot access user funds.
        </p>

        <div className="card p-4 mb-4">
          <h3 className="font-medium mb-3">What Authority Can Do</h3>
          <ul className="list-disc list-inside space-y-1 text-text-secondary text-sm">
            <li>Start, lock, and settle Oracle rounds</li>
            <li>Credit winnings to users after settlement</li>
            <li>Pause the program in emergencies</li>
            <li>Withdraw platform fees (5% of losing pools)</li>
            <li>Transfer authority (two-step process)</li>
          </ul>
        </div>

        <div className="card p-4 border-red-500/30">
          <h3 className="font-medium mb-3 text-red-400">What Authority CANNOT Do</h3>
          <ul className="list-disc list-inside space-y-1 text-text-secondary text-sm">
            <li>Withdraw user funds from personal vaults</li>
            <li>Force withdrawals without user signature</li>
            <li>Modify user balance records</li>
            <li>Manipulate Pyth oracle prices</li>
          </ul>
        </div>
      </section>

      {/* Signed Trades */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-4">Signed Trades (Battle Mode)</h2>
        <p className="text-text-secondary mb-4">
          Every trade in Battle Mode is cryptographically signed by your wallet.
          This creates an immutable record that can be verified by anyone.
        </p>

        <div className="card p-4 mb-4">
          <h3 className="font-medium mb-3">What&apos;s Signed</h3>
          <ul className="list-disc list-inside space-y-1 text-text-secondary text-sm">
            <li>Battle ID — Links trade to specific battle</li>
            <li>Action — Open or close position</li>
            <li>Asset, side, leverage, size — Trade parameters</li>
            <li>Timestamp — When the trade was made</li>
            <li>Nonce — Prevents replay attacks</li>
          </ul>
        </div>

        <h3 className="font-medium mb-3">Verification Process</h3>
        <p className="text-text-secondary mb-4">
          Signatures are verified using ED25519 (via tweetnacl). The server checks:
        </p>
        <ol className="list-decimal list-inside space-y-2 text-text-secondary text-sm">
          <li>Signature matches the message content</li>
          <li>Signer&apos;s public key matches the wallet address</li>
          <li>Nonce hasn&apos;t been used before (prevents replay)</li>
          <li>Timestamp is within acceptable range</li>
        </ol>

        <DocsCallout type="info" title="Why This Matters">
          Even if our servers were compromised, an attacker couldn&apos;t forge trades on your behalf
          without access to your wallet&apos;s private key. Your keys, your control.
        </DocsCallout>
      </section>

      {/* Platform Security */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-4">Platform Security</h2>

        <h3 className="font-medium mb-3">Rate Limiting</h3>
        <p className="text-text-secondary mb-4">
          API endpoints are protected by multi-tier rate limiting:
        </p>
        <div className="card p-4 mb-4">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between py-1">
              <span className="text-text-secondary">Global limit</span>
              <span>1000 requests/minute per IP</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-text-secondary">Standard endpoints</span>
              <span>100 requests/minute</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-text-secondary">Sensitive actions</span>
              <span>30 requests/minute</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-text-secondary">Write operations</span>
              <span>10 requests/minute</span>
            </div>
          </div>
        </div>

        <h3 className="font-medium mb-3">Wallet Authentication</h3>
        <p className="text-text-secondary mb-4">
          All authenticated requests require a valid Solana wallet address. The address
          is validated for format and used to authorize actions on your behalf.
        </p>

        <DocsCallout type="warning" title="Never Share Your Private Key">
          DegenDome will NEVER ask for your private key or seed phrase. All interactions
          use your wallet&apos;s signing capability without exposing your keys.
        </DocsCallout>
      </section>

      {/* Verification */}
      <section>
        <h2 className="text-xl font-semibold mb-4">Verify Yourself</h2>
        <p className="text-text-secondary mb-4">
          You can independently verify our smart contracts and transactions:
        </p>

        <ul className="space-y-3">
          <li className="flex gap-3">
            <span className="text-accent">&#x2022;</span>
            <span className="text-text-secondary">
              <strong>View contracts on Solscan:</strong> Search for our program IDs on{' '}
              <a href="https://solscan.io" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
                solscan.io
              </a>
            </span>
          </li>
          <li className="flex gap-3">
            <span className="text-accent">&#x2022;</span>
            <span className="text-text-secondary">
              <strong>Check your balance PDA:</strong> Your vault is at a deterministic address derived from your wallet
            </span>
          </li>
          <li className="flex gap-3">
            <span className="text-accent">&#x2022;</span>
            <span className="text-text-secondary">
              <strong>Verify round settlements:</strong> Every Oracle round settlement is an on-chain transaction
            </span>
          </li>
          <li className="flex gap-3">
            <span className="text-accent">&#x2022;</span>
            <span className="text-text-secondary">
              <strong>Check Pyth prices:</strong> Prices are verifiable on the Pyth Network explorer
            </span>
          </li>
        </ul>
      </section>
    </div>
  );
}
