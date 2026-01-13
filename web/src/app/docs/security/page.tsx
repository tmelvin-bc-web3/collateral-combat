import DocsCallout from '@/components/docs/DocsCallout';

export default function SecurityPage() {
  return (
    <div className="animate-fadeIn">
      <h1 className="text-3xl font-bold mb-4">Security & Technical</h1>
      <p className="text-text-secondary text-lg mb-8">
        How DegenDome ensures fair play, trustless settlement, and secure operations.
      </p>

      {/* Trust Model */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-4">Our Trust Model</h2>
        <p className="text-text-secondary mb-4">
          DegenDome is designed to minimize trust requirements. While not fully decentralized,
          we use cryptographic verification and on-chain settlement to ensure fair outcomes.
        </p>

        <div className="space-y-4">
          <div className="card p-4 border-success/30">
            <h3 className="font-medium text-success mb-2">What&apos;s Trustless</h3>
            <ul className="list-disc list-inside space-y-1 text-text-secondary text-sm">
              <li>Battle settlement is verified on-chain via Solana smart contracts</li>
              <li>All trades are cryptographically signed by your wallet</li>
              <li>Prediction round outcomes are determined by verifiable price feeds</li>
              <li>Payouts are automatic and transparent</li>
            </ul>
          </div>
          <div className="card p-4 border-yellow-500/30">
            <h3 className="font-medium text-yellow-400 mb-2">What Requires Trust</h3>
            <ul className="list-disc list-inside space-y-1 text-text-secondary text-sm">
              <li>Price feed accuracy (we use reliable sources but verify independently)</li>
              <li>Server availability and real-time game coordination</li>
              <li>Fair matchmaking (random opponent selection)</li>
            </ul>
          </div>
        </div>
      </section>

      {/* On-Chain Settlement */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-4">On-Chain Settlement</h2>
        <p className="text-text-secondary mb-4">
          Battle Mode results are settled using Solana smart contracts. This ensures transparent
          and verifiable outcomes.
        </p>

        <h3 className="font-medium mb-3">Battle Program</h3>
        <div className="card p-4 mb-4">
          <div className="space-y-2 text-sm">
            <div>
              <span className="text-text-tertiary">Program ID:</span>
              <code className="ml-2 text-accent font-mono text-xs break-all">
                GJPVHcvCAwbaCNXuiADj8a5AjeFy9LQuJeU4G8kpBiA9
              </code>
            </div>
            <div>
              <span className="text-text-tertiary">Network:</span>
              <span className="ml-2">Solana Mainnet</span>
            </div>
          </div>
        </div>

        <h3 className="font-medium mb-3">Prediction Program</h3>
        <div className="card p-4 mb-4">
          <div className="space-y-2 text-sm">
            <div>
              <span className="text-text-tertiary">Program ID:</span>
              <code className="ml-2 text-accent font-mono text-xs break-all">
                9fDpLYmAR1WtaVwSczxz1BZqQGiSRavT6kAMLSCAh1dF
              </code>
            </div>
            <div>
              <span className="text-text-tertiary">Network:</span>
              <span className="ml-2">Solana Mainnet</span>
            </div>
          </div>
        </div>

        <h3 className="font-medium mb-3">Settlement Flow</h3>
        <div className="card p-4">
          <div className="space-y-3">
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded bg-bg-tertiary flex items-center justify-center text-sm font-bold">1</div>
              <div>
                <p className="text-text-secondary text-sm">
                  <strong>Battle Ends</strong> — Final P&L calculated for both players
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded bg-bg-tertiary flex items-center justify-center text-sm font-bold">2</div>
              <div>
                <p className="text-text-secondary text-sm">
                  <strong>Winner Determined</strong> — Player with highest P&L % wins
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded bg-bg-tertiary flex items-center justify-center text-sm font-bold">3</div>
              <div>
                <p className="text-text-secondary text-sm">
                  <strong>On-Chain Call</strong> — settle_battle instruction sent to Battle Program
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded bg-bg-tertiary flex items-center justify-center text-sm font-bold">4</div>
              <div>
                <p className="text-text-secondary text-sm">
                  <strong>Prize Distribution</strong> — Winner receives 95% of prize pool automatically
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Signed Trades */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-4">Signed Trades (Trustless Verification)</h2>
        <p className="text-text-secondary mb-4">
          Every trade you make in Battle Mode is cryptographically signed by your wallet.
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

      {/* PDAs */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-4">Program Derived Addresses (PDAs)</h2>
        <p className="text-text-secondary mb-4">
          Our smart contracts use PDAs to store battle and trade data on-chain. PDAs are
          deterministically generated addresses that the program controls.
        </p>

        <div className="card p-4">
          <div className="space-y-3 text-sm">
            <div className="flex justify-between items-center py-2 border-b border-border-primary">
              <span className="font-medium">Config PDA</span>
              <span className="text-text-secondary">Program-level configuration</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-border-primary">
              <span className="font-medium">Battle PDA</span>
              <span className="text-text-secondary">Per-battle account (indexed by battle ID)</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="font-medium">Trade Log PDA</span>
              <span className="text-text-secondary">Per-player per-battle trading history</span>
            </div>
          </div>
        </div>
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

      {/* Price Feeds */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-4">Price Feeds</h2>
        <p className="text-text-secondary mb-4">
          Real-time prices power all game modes. We aggregate from multiple sources
          for accuracy and reliability.
        </p>

        <div className="card p-4">
          <div className="space-y-2 text-sm text-text-secondary">
            <p><strong>Update Frequency:</strong> Every 5 seconds</p>
            <p><strong>Supported Assets:</strong> SOL, BTC, ETH, WIF, BONK, JUP, RAY, JTO</p>
            <p><strong>Data Sources:</strong> Aggregated from major exchanges and oracles</p>
          </div>
        </div>
      </section>

      {/* Verification */}
      <section>
        <h2 className="text-xl font-semibold mb-4">Verify Yourself</h2>
        <p className="text-text-secondary mb-4">
          You can independently verify our smart contracts and transactions:
        </p>

        <ul className="space-y-3">
          <li className="flex gap-3">
            <span className="text-accent">•</span>
            <span className="text-text-secondary">
              <strong>View contracts on Solscan:</strong> Search for our program IDs on{' '}
              <a href="https://solscan.io" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
                solscan.io
              </a>
            </span>
          </li>
          <li className="flex gap-3">
            <span className="text-accent">•</span>
            <span className="text-text-secondary">
              <strong>Check settlement transactions:</strong> Every battle settlement is an on-chain transaction
            </span>
          </li>
          <li className="flex gap-3">
            <span className="text-accent">•</span>
            <span className="text-text-secondary">
              <strong>Verify your signatures:</strong> Your signed trades can be verified using standard ED25519 libraries
            </span>
          </li>
        </ul>
      </section>
    </div>
  );
}
