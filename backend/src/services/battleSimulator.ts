import { battleManager } from './battleManager';
import { BattleConfig, BattleDuration } from '../types';

// Fake wallet addresses for simulation
const FAKE_WALLETS = [
  '7xKp9mN3qR2sT8vW4yZ1aB5cD6eF7gH8jK9mN3qR2sT8',
  '9aRt5uV2wX7yZ3bC8dE4fG6hJ1kL9mN0pQ2rS5tU8vW',
  '4bYu6iO9pA2sD5fG8hJ1kL4mN7oP0qR3sT6uV9wX2yZ',
  '2cDe8fG1hI4jK7lM0nO3pQ6rS9tU2vW5xY8zA1bC4dE',
  '8fGh2iJ5kL8mN1oP4qR7sT0uV3wX6yZ9aB2cD5eF8gH',
  '3iJk6lM9nO2pQ5rS8tU1vW4xY7zA0bC3dE6fG9hI2jK',
  '6lMn0oP3qR6sT9uV2wX5yZ8aB1cD4eF7gH0iJ3kL6mN',
  '1oOp4qR7sT0uV3wX6yZ9aB2cD5eF8gH1iJ4kL7mN0oP',
];

const ASSETS = ['SOL', 'BTC', 'ETH', 'WIF', 'BONK'];
const LEVERAGES = [2, 5, 10, 20] as const;

class BattleSimulator {
  private simulatedBattles: string[] = [];
  private intervals: NodeJS.Timeout[] = [];
  private isRunning = false;

  // Start simulation with N battles
  start(numBattles: number = 3): void {
    if (this.isRunning) {
      console.log('Simulator already running');
      return;
    }

    this.isRunning = true;
    console.log(`\n🎮 Starting battle simulator with ${numBattles} battles...\n`);

    // Create simulated battles
    for (let i = 0; i < numBattles; i++) {
      setTimeout(() => {
        this.createSimulatedBattle(i);
      }, i * 2000); // Stagger battle creation
    }

    // Simulate trading activity
    const tradingInterval = setInterval(() => {
      this.simulateTrading();
    }, 3000);
    this.intervals.push(tradingInterval);
  }

  // Stop simulation
  stop(): void {
    this.isRunning = false;
    this.intervals.forEach(interval => clearInterval(interval));
    this.intervals = [];
    this.simulatedBattles = [];
    console.log('\n🛑 Battle simulator stopped\n');
  }

  // Create a single simulated battle
  private async createSimulatedBattle(index: number): Promise<void> {
    const wallet1 = FAKE_WALLETS[index * 2] || FAKE_WALLETS[0];
    const wallet2 = FAKE_WALLETS[index * 2 + 1] || FAKE_WALLETS[1];

    const durations: BattleDuration[] = [1800, 3600];
    const config: BattleConfig = {
      entryFee: [0.1, 0.5, 1, 5][index % 4],
      duration: durations[index % 2],
      mode: 'paper',
      maxPlayers: 2,
    };

    try {
      // Create battle with first player
      const battle = await battleManager.createBattle(config, wallet1);

      // Join with second player (this starts the battle)
      await battleManager.joinBattle(battle.id, wallet2);

      this.simulatedBattles.push(battle.id);

      console.log(`✅ Simulated battle ${index + 1} created: ${battle.id.slice(0, 8)}...`);
      console.log(`   ${wallet1.slice(0, 8)}... vs ${wallet2.slice(0, 8)}...`);
      console.log(`   Entry: ${config.entryFee} SOL | Duration: ${config.duration / 60} min\n`);

      // Open initial positions for both players after a short delay
      setTimeout(() => {
        this.openInitialPositions(battle.id, wallet1, wallet2);
      }, 1000);
    } catch (error: any) {
      console.log(`❌ Failed to create simulated battle: ${error.message}`);
    }
  }

  // Open initial positions for a new battle
  private openInitialPositions(battleId: string, wallet1: string, wallet2: string): void {
    const battle = battleManager.getBattle(battleId);
    if (!battle || battle.status !== 'active') return;

    // Player 1 opens a position
    try {
      const asset1 = ASSETS[Math.floor(Math.random() * ASSETS.length)];
      const side1 = Math.random() > 0.5 ? 'long' : 'short';
      const leverage1 = LEVERAGES[Math.floor(Math.random() * LEVERAGES.length)];
      const size1 = [100, 200, 300, 500][Math.floor(Math.random() * 4)];

      battleManager.openPosition(battleId, wallet1, asset1, side1, leverage1, size1);
      console.log(`📈 ${wallet1.slice(0, 8)}... opened ${leverage1}x ${side1.toUpperCase()} ${asset1}`);
    } catch (e) {}

    // Player 2 opens a position
    try {
      const asset2 = ASSETS[Math.floor(Math.random() * ASSETS.length)];
      const side2 = Math.random() > 0.5 ? 'long' : 'short';
      const leverage2 = LEVERAGES[Math.floor(Math.random() * LEVERAGES.length)];
      const size2 = [100, 200, 300, 500][Math.floor(Math.random() * 4)];

      battleManager.openPosition(battleId, wallet2, asset2, side2, leverage2, size2);
      console.log(`📈 ${wallet2.slice(0, 8)}... opened ${leverage2}x ${side2.toUpperCase()} ${asset2}`);
    } catch (e) {}
  }

  // Simulate random trading activity
  private simulateTrading(): void {
    if (!this.isRunning) return;

    this.simulatedBattles.forEach(battleId => {
      const battle = battleManager.getBattle(battleId);
      if (!battle || battle.status !== 'active') return;

      // 30% chance of trading activity per battle per tick
      if (Math.random() > 0.3) return;

      const playerIndex = Math.floor(Math.random() * battle.players.length);
      const player = battle.players[playerIndex];
      if (!player) return;

      const hasOpenPosition = player.account.positions.length > 0;

      // Decide action: open new position or close existing
      if (hasOpenPosition && Math.random() > 0.6) {
        // Close a position
        const position = player.account.positions[0];
        try {
          battleManager.closePosition(battleId, player.walletAddress, position.id);
          console.log(`📉 ${player.walletAddress.slice(0, 8)}... closed ${position.side.toUpperCase()} ${position.asset}`);
        } catch (e) {}
      } else if (!hasOpenPosition || Math.random() > 0.5) {
        // Open a new position
        const availableAssets = ASSETS.filter(
          a => !player.account.positions.some(p => p.asset === a)
        );
        if (availableAssets.length === 0) return;

        const asset = availableAssets[Math.floor(Math.random() * availableAssets.length)];
        const side = Math.random() > 0.5 ? 'long' : 'short';
        const leverage = LEVERAGES[Math.floor(Math.random() * LEVERAGES.length)];
        const maxSize = Math.min(player.account.balance * leverage * 0.8, 500);
        const size = Math.max(50, Math.floor(maxSize * (0.3 + Math.random() * 0.7)));

        try {
          battleManager.openPosition(battleId, player.walletAddress, asset, side, leverage, size);
          console.log(`📈 ${player.walletAddress.slice(0, 8)}... opened ${leverage}x ${side.toUpperCase()} ${asset}`);
        } catch (e) {}
      }
    });
  }

  // Get status
  getStatus(): { running: boolean; battles: number } {
    return {
      running: this.isRunning,
      battles: this.simulatedBattles.length
    };
  }
}

// Singleton instance
export const battleSimulator = new BattleSimulator();
