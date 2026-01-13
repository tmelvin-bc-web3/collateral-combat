import { v4 as uuidv4 } from 'uuid';
import {
  Battle,
  BattleConfig,
  BattlePlayer,
  BattleStatus,
  PlayerAccount,
  PerpPosition,
  TradeRecord,
  PositionSide,
  Leverage,
  SignedTradeMessage,
  SignedTradePayload,
  SignedTrade,
} from '../types';
import { priceService } from './priceService';
import { progressionService } from './progressionService';
import { PublicKey } from '@solana/web3.js';
import nacl from 'tweetnacl';
import bs58 from 'bs58';

const RAKE_PERCENT = 5; // 5% platform fee
const STARTING_BALANCE = 1000; // $1000 starting balance
const MAINTENANCE_MARGIN = 0.05; // 5% maintenance margin for liquidation

class BattleManager {
  private battles: Map<string, Battle> = new Map();
  private playerBattles: Map<string, string> = new Map(); // wallet -> battleId
  private matchmakingQueue: Map<string, { config: BattleConfig; walletAddress: string; timestamp: number }[]> = new Map();
  private battleTimers: Map<string, NodeJS.Timeout> = new Map();
  private listeners: Set<(battle: Battle) => void> = new Set();

  constructor() {
    // Start matchmaking loop
    setInterval(() => this.processMatchmaking(), 1000);
  }

  // Create a new battle
  createBattle(config: BattleConfig, creatorWallet: string): Battle {
    const battle: Battle = {
      id: uuidv4(),
      config,
      status: 'waiting',
      players: [],
      createdAt: Date.now(),
      prizePool: 0,
    };

    this.battles.set(battle.id, battle);
    this.joinBattle(battle.id, creatorWallet);

    console.log(`Battle ${battle.id} created by ${creatorWallet}`);
    return battle;
  }

  // Join an existing battle
  joinBattle(battleId: string, walletAddress: string): Battle | null {
    const battle = this.battles.get(battleId);
    if (!battle) {
      throw new Error('Battle not found');
    }

    if (battle.status !== 'waiting') {
      throw new Error('Battle already started or completed');
    }

    if (battle.players.length >= battle.config.maxPlayers) {
      throw new Error('Battle is full');
    }

    if (battle.players.some(p => p.walletAddress === walletAddress)) {
      throw new Error('Already in this battle');
    }

    // Check if player is in another active battle
    const existingBattle = this.playerBattles.get(walletAddress);
    if (existingBattle) {
      const existing = this.battles.get(existingBattle);
      if (existing && (existing.status === 'waiting' || existing.status === 'active')) {
        throw new Error('Already in another active battle');
      }
    }

    // Create player with starting account
    const player: BattlePlayer = {
      walletAddress,
      account: this.createInitialAccount(),
      trades: [],
    };

    battle.players.push(player);
    battle.prizePool += battle.config.entryFee;
    this.playerBattles.set(walletAddress, battleId);

    // Start battle if full
    if (battle.players.length === battle.config.maxPlayers) {
      this.startBattle(battleId);
    }

    this.notifyListeners(battle);
    return battle;
  }

  // Create initial account with $1000 balance
  private createInitialAccount(): PlayerAccount {
    return {
      balance: STARTING_BALANCE,
      startingBalance: STARTING_BALANCE,
      positions: [],
      closedPnl: 0,
      totalPnlPercent: 0,
    };
  }

  // Start a battle
  private startBattle(battleId: string): void {
    const battle = this.battles.get(battleId);
    if (!battle) return;

    battle.status = 'active';
    battle.startedAt = Date.now();

    // Set timer for battle end
    const timer = setTimeout(() => {
      this.endBattle(battleId);
    }, battle.config.duration * 1000);

    this.battleTimers.set(battleId, timer);

    console.log(`Battle ${battleId} started! Duration: ${battle.config.duration}s`);
    this.notifyListeners(battle);
  }

  // Open a perp position
  openPosition(
    battleId: string,
    walletAddress: string,
    asset: string,
    side: PositionSide,
    leverage: Leverage,
    size: number
  ): PerpPosition | null {
    const battle = this.battles.get(battleId);
    if (!battle || battle.status !== 'active') {
      throw new Error('Battle not active');
    }

    const player = battle.players.find(p => p.walletAddress === walletAddress);
    if (!player) {
      throw new Error('Player not in battle');
    }

    // Validate size
    const margin = size / leverage; // Required margin
    if (margin > player.account.balance) {
      throw new Error('Insufficient balance');
    }

    if (size < 10) {
      throw new Error('Minimum position size is $10');
    }

    // Check if already has position in this asset
    const existingPosition = player.account.positions.find(p => p.asset === asset);
    if (existingPosition) {
      throw new Error('Already have position in this asset. Close it first.');
    }

    const currentPrice = priceService.getPrice(asset);
    if (currentPrice === 0) {
      throw new Error('Price not available for asset');
    }

    // Calculate liquidation price
    // For LONG: liq price = entry * (1 - 1/leverage + maintenance)
    // For SHORT: liq price = entry * (1 + 1/leverage - maintenance)
    const liquidationPrice = side === 'long'
      ? currentPrice * (1 - (1 / leverage) + MAINTENANCE_MARGIN)
      : currentPrice * (1 + (1 / leverage) - MAINTENANCE_MARGIN);

    const position: PerpPosition = {
      id: uuidv4(),
      asset,
      side,
      leverage,
      size,
      entryPrice: currentPrice,
      currentPrice,
      liquidationPrice,
      unrealizedPnl: 0,
      unrealizedPnlPercent: 0,
      openedAt: Date.now(),
    };

    // Deduct margin from balance
    player.account.balance -= margin;
    player.account.positions.push(position);

    // Record trade
    const trade: TradeRecord = {
      id: uuidv4(),
      timestamp: Date.now(),
      asset,
      side,
      leverage,
      size,
      entryPrice: currentPrice,
      type: 'open',
    };
    player.trades.push(trade);

    // Update account totals
    this.updateAccountValue(player);

    console.log(`${walletAddress} opened ${leverage}x ${side.toUpperCase()} ${asset} @ $${currentPrice.toFixed(2)}`);
    this.notifyListeners(battle);
    return position;
  }

  // Close a perp position
  closePosition(
    battleId: string,
    walletAddress: string,
    positionId: string
  ): TradeRecord | null {
    const battle = this.battles.get(battleId);
    if (!battle || battle.status !== 'active') {
      throw new Error('Battle not active');
    }

    const player = battle.players.find(p => p.walletAddress === walletAddress);
    if (!player) {
      throw new Error('Player not in battle');
    }

    const positionIndex = player.account.positions.findIndex(p => p.id === positionId);
    if (positionIndex === -1) {
      throw new Error('Position not found');
    }

    const position = player.account.positions[positionIndex];
    const currentPrice = priceService.getPrice(position.asset);

    // Calculate P&L
    const priceChange = (currentPrice - position.entryPrice) / position.entryPrice;
    const pnlPercent = position.side === 'long' ? priceChange : -priceChange;
    const pnl = position.size * pnlPercent * position.leverage;

    // Return margin + PnL to balance
    const margin = position.size / position.leverage;
    player.account.balance += margin + pnl;
    player.account.closedPnl += pnl;

    // Remove position
    player.account.positions.splice(positionIndex, 1);

    // Record trade
    const trade: TradeRecord = {
      id: uuidv4(),
      timestamp: Date.now(),
      asset: position.asset,
      side: position.side,
      leverage: position.leverage,
      size: position.size,
      entryPrice: position.entryPrice,
      exitPrice: currentPrice,
      pnl,
      type: 'close',
    };
    player.trades.push(trade);

    // Update account totals
    this.updateAccountValue(player);

    console.log(`${walletAddress} closed ${position.side.toUpperCase()} ${position.asset} for ${pnl >= 0 ? '+' : ''}$${pnl.toFixed(2)}`);
    this.notifyListeners(battle);
    return trade;
  }

  // Verify Ed25519 signature for a signed trade message
  verifyTradeSignature(
    message: SignedTradeMessage,
    signature: string,
    walletAddress: string
  ): boolean {
    try {
      const messageBytes = new TextEncoder().encode(JSON.stringify(message));
      const signatureBytes = bs58.decode(signature);
      const publicKeyBytes = new PublicKey(walletAddress).toBytes();

      return nacl.sign.detached.verify(messageBytes, signatureBytes, publicKeyBytes);
    } catch (err) {
      console.error('[BattleManager] Signature verification error:', err);
      return false;
    }
  }

  // Open a signed position (for trustless settlement)
  openPositionSigned(
    payload: SignedTradePayload
  ): PerpPosition | null {
    const { message, signature, walletAddress } = payload;

    // Verify signature
    if (!this.verifyTradeSignature(message, signature, walletAddress)) {
      throw new Error('Invalid trade signature');
    }

    // Verify message fields
    if (message.version !== 1 || message.action !== 'open') {
      throw new Error('Invalid message format');
    }

    const battle = this.battles.get(message.battleId);
    if (!battle) {
      throw new Error('Battle not found');
    }

    // Verify the timestamp is within battle duration (with some slack)
    const now = Date.now();
    const timeDiff = Math.abs(now - message.timestamp);
    if (timeDiff > 60000) { // 60 second tolerance
      throw new Error('Trade timestamp too old');
    }

    // Open the position using the existing method
    const position = this.openPosition(
      message.battleId,
      walletAddress,
      message.asset,
      message.side,
      message.leverage,
      message.size
    );

    // Store the signed trade for on-chain settlement
    if (position) {
      const signedTrade: SignedTrade = {
        id: position.id,
        timestamp: message.timestamp,
        asset: message.asset,
        side: message.side,
        leverage: message.leverage,
        size: message.size,
        entryPrice: position.entryPrice,
        type: 'open',
        signature,
        signedMessage: JSON.stringify(message),
        verified: true,
        walletAddress,
      };
      this.storeSignedTrade(battle, signedTrade);
    }

    return position;
  }

  // Close a signed position (for trustless settlement)
  closePositionSigned(
    payload: SignedTradePayload
  ): TradeRecord | null {
    const { message, signature, walletAddress } = payload;

    // Verify signature
    if (!this.verifyTradeSignature(message, signature, walletAddress)) {
      throw new Error('Invalid trade signature');
    }

    // Verify message fields
    if (message.version !== 1 || message.action !== 'close') {
      throw new Error('Invalid message format');
    }

    if (!message.positionId) {
      throw new Error('Position ID required for close');
    }

    const battle = this.battles.get(message.battleId);
    if (!battle) {
      throw new Error('Battle not found');
    }

    // Verify timestamp
    const now = Date.now();
    const timeDiff = Math.abs(now - message.timestamp);
    if (timeDiff > 60000) {
      throw new Error('Trade timestamp too old');
    }

    // Close the position using existing method
    const trade = this.closePosition(
      message.battleId,
      walletAddress,
      message.positionId
    );

    // Store the signed trade
    if (trade) {
      const signedTrade: SignedTrade = {
        ...trade,
        signature,
        signedMessage: JSON.stringify(message),
        verified: true,
        walletAddress,
      };
      this.storeSignedTrade(battle, signedTrade);
    }

    return trade;
  }

  // Store a signed trade in the battle for later on-chain settlement
  private storeSignedTrade(battle: Battle, signedTrade: SignedTrade): void {
    if (!battle.signedTrades) {
      battle.signedTrades = [];
    }
    battle.signedTrades.push(signedTrade);
    console.log(`[BattleManager] Stored signed ${signedTrade.type} trade for ${signedTrade.walletAddress} (total: ${battle.signedTrades.length})`);
  }

  // Get all signed trades for a battle
  getSignedTrades(battleId: string): SignedTrade[] {
    const battle = this.battles.get(battleId);
    return battle?.signedTrades || [];
  }

  // Update account value with current prices
  private updateAccountValue(player: BattlePlayer): void {
    let totalUnrealizedPnl = 0;

    player.account.positions.forEach(position => {
      const currentPrice = priceService.getPrice(position.asset);
      position.currentPrice = currentPrice;

      // Calculate unrealized P&L
      const priceChange = (currentPrice - position.entryPrice) / position.entryPrice;
      const pnlPercent = position.side === 'long' ? priceChange : -priceChange;
      position.unrealizedPnlPercent = pnlPercent * position.leverage * 100;
      position.unrealizedPnl = position.size * pnlPercent * position.leverage;

      totalUnrealizedPnl += position.unrealizedPnl;

      // Check for liquidation
      if (position.side === 'long' && currentPrice <= position.liquidationPrice) {
        this.liquidatePosition(player, position);
      } else if (position.side === 'short' && currentPrice >= position.liquidationPrice) {
        this.liquidatePosition(player, position);
      }
    });

    // Calculate total account value (balance + unrealized P&L + margin in positions)
    const marginInPositions = player.account.positions.reduce(
      (sum, p) => sum + (p.size / p.leverage),
      0
    );
    const totalValue = player.account.balance + marginInPositions + totalUnrealizedPnl;
    player.account.totalPnlPercent = ((totalValue - player.account.startingBalance) / player.account.startingBalance) * 100;
  }

  // Liquidate a position
  private liquidatePosition(player: BattlePlayer, position: PerpPosition): void {
    const index = player.account.positions.findIndex(p => p.id === position.id);
    if (index === -1) return;

    // Position is liquidated - lose the margin
    const margin = position.size / position.leverage;
    player.account.closedPnl -= margin;

    // Remove position (margin is lost)
    player.account.positions.splice(index, 1);

    // Record liquidation as a trade
    const trade: TradeRecord = {
      id: uuidv4(),
      timestamp: Date.now(),
      asset: position.asset,
      side: position.side,
      leverage: position.leverage,
      size: position.size,
      entryPrice: position.entryPrice,
      exitPrice: position.liquidationPrice,
      pnl: -margin,
      type: 'close',
    };
    player.trades.push(trade);

    console.log(`LIQUIDATED: ${position.side.toUpperCase()} ${position.asset} - Lost $${margin.toFixed(2)}`);
  }

  // Update all accounts in active battles (called on price updates)
  updateAllAccounts(): void {
    this.battles.forEach(battle => {
      if (battle.status === 'active') {
        battle.players.forEach(player => {
          this.updateAccountValue(player);
        });
        this.notifyListeners(battle);
      }
    });
  }

  // End a battle
  private endBattle(battleId: string): void {
    const battle = this.battles.get(battleId);
    if (!battle || battle.status !== 'active') return;

    battle.status = 'completed';
    battle.endedAt = Date.now();

    // Close all open positions at current prices
    battle.players.forEach(player => {
      // Close each position
      const positionsToClose = [...player.account.positions];
      positionsToClose.forEach(position => {
        const currentPrice = priceService.getPrice(position.asset);
        const priceChange = (currentPrice - position.entryPrice) / position.entryPrice;
        const pnlPercent = position.side === 'long' ? priceChange : -priceChange;
        const pnl = position.size * pnlPercent * position.leverage;
        const margin = position.size / position.leverage;

        player.account.balance += margin + pnl;
        player.account.closedPnl += pnl;
      });
      player.account.positions = [];

      // Final P&L calculation
      this.updateAccountValue(player);
      player.finalPnl = player.account.totalPnlPercent;
    });

    // Sort by P&L and assign ranks
    const sorted = [...battle.players].sort((a, b) => (b.finalPnl || 0) - (a.finalPnl || 0));
    sorted.forEach((player, index) => {
      player.rank = index + 1;
    });

    // Winner is rank 1
    battle.winnerId = sorted[0]?.walletAddress;

    // Clear player battle mappings
    battle.players.forEach(player => {
      this.playerBattles.delete(player.walletAddress);
    });

    // Clear timer
    const timer = this.battleTimers.get(battleId);
    if (timer) {
      clearTimeout(timer);
      this.battleTimers.delete(battleId);
    }

    console.log(`Battle ${battleId} ended! Winner: ${battle.winnerId}`);
    this.notifyListeners(battle);

    // Award XP to participants
    this.awardBattleXp(battle);
  }

  // Award XP based on battle results
  private awardBattleXp(battle: Battle): void {
    const wager = battle.config.entryFee;

    battle.players.forEach(player => {
      const isWinner = player.rank === 1;
      const opponent = battle.players.find(p => p.walletAddress !== player.walletAddress);
      const opponentWallet = opponent?.walletAddress || 'opponent';
      const truncatedOpponent = opponentWallet.slice(0, 4) + '...' + opponentWallet.slice(-4);

      if (isWinner) {
        // Winner: 100 XP + (wager × 0.1)
        const xpAmount = 100 + Math.floor(wager * 0.1);
        progressionService.awardXp(
          player.walletAddress,
          xpAmount,
          'battle',
          battle.id,
          `Won battle vs ${truncatedOpponent}`
        );
      } else {
        // Loser: 25 XP + (wager × 0.05)
        const xpAmount = 25 + Math.floor(wager * 0.05);
        progressionService.awardXp(
          player.walletAddress,
          xpAmount,
          'battle',
          battle.id,
          `Battle vs ${truncatedOpponent}`
        );
      }
    });
  }

  // Queue for matchmaking
  queueForMatchmaking(config: BattleConfig, walletAddress: string): void {
    const key = this.getMatchmakingKey(config);
    const queue = this.matchmakingQueue.get(key) || [];

    if (queue.some(q => q.walletAddress === walletAddress)) {
      return;
    }

    queue.push({ config, walletAddress, timestamp: Date.now() });
    this.matchmakingQueue.set(key, queue);

    console.log(`${walletAddress} queued for matchmaking (${key})`);
  }

  // Leave matchmaking queue
  leaveMatchmaking(walletAddress: string): void {
    this.matchmakingQueue.forEach((queue, key) => {
      const filtered = queue.filter(q => q.walletAddress !== walletAddress);
      if (filtered.length !== queue.length) {
        this.matchmakingQueue.set(key, filtered);
        console.log(`${walletAddress} left matchmaking queue`);
      }
    });
  }

  // Process matchmaking
  private processMatchmaking(): void {
    this.matchmakingQueue.forEach((queue, key) => {
      if (queue.length >= 2) {
        const player1 = queue.shift()!;
        const player2 = queue.shift()!;

        const battle = this.createBattle(player1.config, player1.walletAddress);
        this.joinBattle(battle.id, player2.walletAddress);

        console.log(`Matched ${player1.walletAddress} vs ${player2.walletAddress}`);
      }
    });
  }

  private getMatchmakingKey(config: BattleConfig): string {
    return `${config.entryFee}-${config.duration}-${config.mode}`;
  }

  // Get battle by ID
  getBattle(battleId: string): Battle | undefined {
    return this.battles.get(battleId);
  }

  // Get player's current battle
  getPlayerBattle(walletAddress: string): Battle | undefined {
    const battleId = this.playerBattles.get(walletAddress);
    return battleId ? this.battles.get(battleId) : undefined;
  }

  // Get active battles (for lobby)
  getActiveBattles(): Battle[] {
    return Array.from(this.battles.values()).filter(
      b => b.status === 'waiting' || b.status === 'active'
    );
  }

  // Get recent completed battles
  getRecentBattles(limit: number = 10): Battle[] {
    return Array.from(this.battles.values())
      .filter(b => b.status === 'completed')
      .sort((a, b) => (b.endedAt || 0) - (a.endedAt || 0))
      .slice(0, limit);
  }

  // Get matchmaking queue status
  getQueueStatus(config: BattleConfig): { position: number; playersInQueue: number } {
    const key = this.getMatchmakingKey(config);
    const queue = this.matchmakingQueue.get(key) || [];
    return {
      position: queue.length,
      playersInQueue: queue.length,
    };
  }

  // Create a solo practice battle (no opponent needed)
  createSoloPractice(config: BattleConfig, walletAddress: string, onChainBattleId?: string): Battle {
    const battle: Battle = {
      id: uuidv4(),
      config: { ...config, maxPlayers: 1 },
      status: 'waiting',
      players: [],
      createdAt: Date.now(),
      prizePool: 0,
      onChainBattleId,
      onChainSettled: false,
    };

    this.battles.set(battle.id, battle);

    const player: BattlePlayer = {
      walletAddress,
      account: this.createInitialAccount(),
      trades: [],
    };

    battle.players.push(player);
    battle.prizePool = config.entryFee;
    this.playerBattles.set(walletAddress, battle.id);

    // Start immediately
    this.startBattle(battle.id);

    console.log(`Solo practice ${battle.id} started by ${walletAddress}${onChainBattleId ? ` (on-chain: ${onChainBattleId})` : ''}`);
    return battle;
  }

  // Calculate prize distribution (after rake)
  calculatePrize(battle: Battle, rank: number): number {
    const totalPrize = battle.prizePool * (1 - RAKE_PERCENT / 100);

    if (battle.config.maxPlayers === 2) {
      return rank === 1 ? totalPrize : 0;
    } else {
      const splits = [0.6, 0.3, 0.1];
      return rank <= 3 ? totalPrize * splits[rank - 1] : 0;
    }
  }

  // Subscribe to battle updates
  subscribe(listener: (battle: Battle) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(battle: Battle): void {
    this.listeners.forEach(listener => listener(battle));
  }
}

// Singleton instance
export const battleManager = new BattleManager();
