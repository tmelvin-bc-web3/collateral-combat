import DocsCallout from '@/components/docs/DocsCallout';

export default function LDSPage() {
  return (
    <div className="animate-fadeIn">
      <h1 className="text-3xl font-bold mb-4">Last Degen Standing</h1>
      <p className="text-text-secondary text-lg mb-8">
        Battle royale elimination where wrong predictions mean elimination. Be the last player standing to claim the prize pool.
      </p>

      {/* How It Works */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-4">How It Works</h2>
        <div className="space-y-4">
          <div className="card p-4">
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded bg-bg-tertiary flex items-center justify-center font-bold text-accent">1</div>
              <div>
                <h3 className="font-medium mb-1">Join the Lobby</h3>
                <p className="text-text-secondary text-sm">
                  Pay the 0.1 SOL entry fee to join the game. Games start every 10 minutes with a minimum of 3 players
                  and maximum of 50. If not enough players join, entry fees are refunded.
                </p>
              </div>
            </div>
          </div>
          <div className="card p-4">
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded bg-bg-tertiary flex items-center justify-center font-bold text-accent">2</div>
              <div>
                <h3 className="font-medium mb-1">Make Your Prediction</h3>
                <p className="text-text-secondary text-sm">
                  Each round lasts 30 seconds. You have 25 seconds to predict if SOL will go
                  <span className="text-success"> UP</span> or <span className="text-danger">DOWN</span>.
                  If you don&apos;t predict in time, you&apos;re automatically eliminated!
                </p>
              </div>
            </div>
          </div>
          <div className="card p-4">
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded bg-bg-tertiary flex items-center justify-center font-bold text-accent">3</div>
              <div>
                <h3 className="font-medium mb-1">Survive or Die</h3>
                <p className="text-text-secondary text-sm">
                  At the end of each round, the SOL price is checked. If you predicted correctly, you survive.
                  If you predicted wrong, you&apos;re eliminated. If the price doesn&apos;t change, everyone survives.
                </p>
              </div>
            </div>
          </div>
          <div className="card p-4">
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded bg-bg-tertiary flex items-center justify-center font-bold text-accent">4</div>
              <div>
                <h3 className="font-medium mb-1">Claim Victory</h3>
                <p className="text-text-secondary text-sm">
                  Be the last player standing to win the prize pool! If multiple players survive all 15 rounds,
                  the prize is split evenly. Winnings are automatically credited to your balance.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Prize Structure */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-4">Prize Structure</h2>
        <p className="text-text-secondary mb-4">
          Prize distribution depends on how many players entered the game. Larger games have deeper payout structures.
        </p>

        <div className="space-y-4">
          <div className="card p-4">
            <h3 className="font-medium mb-3">3-9 Players</h3>
            <div className="text-sm text-text-secondary">
              <span className="text-success font-medium">Winner takes all (100%)</span>
            </div>
          </div>
          <div className="card p-4">
            <h3 className="font-medium mb-3">10-19 Players</h3>
            <div className="grid grid-cols-3 gap-2 text-sm">
              <div className="text-center">
                <div className="text-warning font-medium">1st</div>
                <div className="text-text-secondary">60%</div>
              </div>
              <div className="text-center">
                <div className="text-text-primary font-medium">2nd</div>
                <div className="text-text-secondary">25%</div>
              </div>
              <div className="text-center">
                <div className="text-amber-600 font-medium">3rd</div>
                <div className="text-text-secondary">15%</div>
              </div>
            </div>
          </div>
          <div className="card p-4">
            <h3 className="font-medium mb-3">20-34 Players</h3>
            <div className="grid grid-cols-5 gap-2 text-sm">
              <div className="text-center">
                <div className="text-warning font-medium">1st</div>
                <div className="text-text-secondary">45%</div>
              </div>
              <div className="text-center">
                <div className="text-text-primary font-medium">2nd</div>
                <div className="text-text-secondary">25%</div>
              </div>
              <div className="text-center">
                <div className="text-amber-600 font-medium">3rd</div>
                <div className="text-text-secondary">15%</div>
              </div>
              <div className="text-center">
                <div className="text-text-tertiary font-medium">4th</div>
                <div className="text-text-secondary">10%</div>
              </div>
              <div className="text-center">
                <div className="text-text-tertiary font-medium">5th</div>
                <div className="text-text-secondary">5%</div>
              </div>
            </div>
          </div>
          <div className="card p-4">
            <h3 className="font-medium mb-3">35-50 Players</h3>
            <div className="grid grid-cols-7 gap-1 text-sm">
              <div className="text-center">
                <div className="text-warning font-medium">1st</div>
                <div className="text-text-secondary">35%</div>
              </div>
              <div className="text-center">
                <div className="text-text-primary font-medium">2nd</div>
                <div className="text-text-secondary">20%</div>
              </div>
              <div className="text-center">
                <div className="text-amber-600 font-medium">3rd</div>
                <div className="text-text-secondary">15%</div>
              </div>
              <div className="text-center">
                <div className="text-text-tertiary font-medium">4th</div>
                <div className="text-text-secondary">10%</div>
              </div>
              <div className="text-center">
                <div className="text-text-tertiary font-medium">5th</div>
                <div className="text-text-secondary">8%</div>
              </div>
              <div className="text-center">
                <div className="text-text-tertiary font-medium">6th</div>
                <div className="text-text-secondary">7%</div>
              </div>
              <div className="text-center">
                <div className="text-text-tertiary font-medium">7th</div>
                <div className="text-text-secondary">5%</div>
              </div>
            </div>
          </div>
        </div>

        <DocsCallout type="info" title="Platform Fee">
          A 5% fee is taken from the total prize pool before distribution.
        </DocsCallout>
      </section>

      {/* Elimination Rules */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-4">Elimination Rules</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="card p-4 border-danger/30">
            <h3 className="font-medium text-danger mb-2">You Get Eliminated If:</h3>
            <ul className="space-y-2 text-text-secondary text-sm">
              <li className="flex gap-2">
                <span className="text-danger">&#x2716;</span>
                You predict UP but price goes down
              </li>
              <li className="flex gap-2">
                <span className="text-danger">&#x2716;</span>
                You predict DOWN but price goes up
              </li>
              <li className="flex gap-2">
                <span className="text-danger">&#x2716;</span>
                You don&apos;t submit a prediction in time
              </li>
            </ul>
          </div>
          <div className="card p-4 border-success/30">
            <h3 className="font-medium text-success mb-2">You Survive If:</h3>
            <ul className="space-y-2 text-text-secondary text-sm">
              <li className="flex gap-2">
                <span className="text-success">&#x2714;</span>
                You predict UP and price goes up
              </li>
              <li className="flex gap-2">
                <span className="text-success">&#x2714;</span>
                You predict DOWN and price goes down
              </li>
              <li className="flex gap-2">
                <span className="text-success">&#x2714;</span>
                Price stays exactly the same (rare)
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Technical Details */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-4">Technical Details</h2>

        <div className="card p-4 mb-4">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between py-1">
              <span className="text-text-tertiary">Entry Fee</span>
              <span>0.1 SOL</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-text-tertiary">Players</span>
              <span>3-50 players</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-text-tertiary">Game Frequency</span>
              <span>Every 10 minutes</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-text-tertiary">Round Duration</span>
              <span>30 seconds</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-text-tertiary">Prediction Window</span>
              <span>25 seconds</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-text-tertiary">Max Rounds</span>
              <span>15 rounds</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-text-tertiary">Platform Fee</span>
              <span>5%</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-text-tertiary">Price Oracle</span>
              <span>Pyth Network (verified)</span>
            </div>
          </div>
        </div>

        <DocsCallout type="info" title="Price Verification">
          All prices are sourced from our backend feeds and verified against Pyth Network oracles
          for transparency. You can view the verification status on each game.
        </DocsCallout>
      </section>

      {/* Strategy Tips */}
      <section>
        <h2 className="text-xl font-semibold mb-4">Strategy Tips</h2>
        <ul className="space-y-3">
          <li className="flex gap-3">
            <span className="text-accent">&#x2022;</span>
            <span className="text-text-secondary">
              <strong>Always predict!</strong> — Missing a prediction means automatic elimination. Better to guess than forfeit.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="text-accent">&#x2022;</span>
            <span className="text-text-secondary">
              <strong>Watch momentum</strong> — If SOL has been trending up, it might continue. Or it might reverse. Consider the market context.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="text-accent">&#x2022;</span>
            <span className="text-text-secondary">
              <strong>Late game pressure</strong> — As players get eliminated, the stakes increase. Stay focused in the final rounds.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="text-accent">&#x2022;</span>
            <span className="text-text-secondary">
              <strong>Stalemate strategy</strong> — If you reach round 15 with multiple survivors, prize is split evenly.
              Sometimes survival is better than risk.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="text-accent">&#x2022;</span>
            <span className="text-text-secondary">
              <strong>Bigger lobbies = more value</strong> — Full lobbies mean bigger prize pools and deeper payout structures.
            </span>
          </li>
        </ul>
      </section>
    </div>
  );
}
