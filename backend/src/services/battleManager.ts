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
  ReadyCheckState,
  ReadyCheckResponse,
  ReadyCheckUpdate,
  ReadyCheckCancelled,
} from '../types';
import { priceService } from './priceService';
import { progressionService } from './progressionService';
import { balanceService } from './balanceService';
import * as userStatsDb from '../db/userStatsDatabase';
import { PublicKey } from '@solana/web3.js';
import nacl from 'tweetnacl';
import bs58 from 'bs58';

// Lamports per SOL for entry fee conversion
const LAMPORTS_PER_SOL = 1_000_000_000;

const RAKE_PERCENT = 5; // 5% platform fee
const STARTING_BALANCE = 1000; // $1000 starting balance
const MAINTENANCE_MARGIN = 0.05; // 5% maintenance margin for liquidation

// Ready check constants
const READY_CHECK_TIMEOUT_MS = 30000; // 30 seconds

// Ready check event types
type ReadyCheckEventType = 'match_found' | 'ready_check_update' | 'ready_check_cancelled';
type ReadyCheckEventData = {
  match_found: { battleId: string; player1Wallet: string; player2Wallet: string; config: BattleConfig; expiresAt: number };
  ready_check_update: ReadyCheckUpdate;
  ready_check_cancelled: ReadyCheckCancelled;
};

class BattleManager {
  private battles: Map<string, Battle> = new Map();
  private playerBattles: Map<string, string> = new Map(); // wallet -> battleId
  private matchmakingQueue: Map<string, { config: BattleConfig; walletAddress: string; timestamp: number }[]> = new Map();
  private battleTimers: Map<string, NodeJS.Timeout> = new Map();
  private listeners: Set<(battle: Battle) => void> = new Set();

  // Ready check tracking
  private readyChecks: Map<string, ReadyCheckState> = new Map();
  private readyCheckTimers: Map<string, NodeJS.Timeout> = new Map();
  private readyCheckListeners: Set<(event: ReadyCheckEventType, data: any) => void> = new Set();

  // Wallet to socket mapping for notifications
  private walletToSocketId: Map<string, string> = new Map();

  // Track wallets in ready check to prevent re-queueing
  private walletsInReadyCheck: Set<string> = new Set();

  constructor() {
    // Start matchmaking loop
    setInterval(() => this.processMatchmaking(), 1000);
  }

  // Create a new battle
  async createBattle(config: BattleConfig, creatorWallet: string): Promise<Battle> {
    const battle: Battle = {
      id: uuidv4(),
      config,
      status: 'waiting',
      players: [],
      createdAt: Date.now(),
      prizePool: 0,
    };

    this.battles.set(battle.id, battle);
    await this.joinBattle(battle.id, creatorWallet);

    console.log(`Battle ${battle.id} created by ${creatorWallet}`);
    return battle;
  }

  // Join an existing battle
  async joinBattle(battleId: string, walletAddress: string): Promise<Battle | null> {
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

    // Convert entry fee from SOL to lamports (entry fee is stored as SOL value)
    const entryFeeLamports = Math.floor(battle.config.entryFee * LAMPORTS_PER_SOL);

    // Check if user has sufficient balance in PDA
    const hasSufficient = await balanceService.hasSufficientBalance(walletAddress, entryFeeLamports);
    if (!hasSufficient) {
      const available = await balanceService.getAvailableBalance(walletAddress);
      throw new Error(`Insufficient balance. Need ${battle.config.entryFee} SOL, have ${(available / LAMPORTS_PER_SOL).toFixed(4)} SOL`);
    }

    // Create pending debit for entry fee
    const pendingId = await balanceService.debitPending(
      walletAddress,
      entryFeeLamports,
      'battle',
      battleId
    );

    // Create player with starting account
    const player: BattlePlayer = {
      walletAddress,
      account: this.createInitialAccount(),
      trades: [],
      pendingDebitId: pendingId, // Track pending debit for refunds if needed
    };

    battle.players.push(player);
    battle.prizePool += battle.config.entryFee;
    this.playerBattles.set(walletAddress, battleId);

    // Confirm the debit now that player is in battle
    balanceService.confirmDebit(pendingId);

    console.log(`[Battle] ${walletAddress} joined battle ${battleId}. Entry fee: ${battle.config.entryFee} SOL`);

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
  private async endBattle(battleId: string): Promise<void> {
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

    // Credit winner with prize pool (minus rake)
    const prizeAfterRake = battle.prizePool * (1 - RAKE_PERCENT / 100);
    if (battle.winnerId && battle.prizePool > 0) {
      const prizeLamports = Math.floor(prizeAfterRake * LAMPORTS_PER_SOL);
      try {
        const tx = await balanceService.creditWinnings(
          battle.winnerId,
          prizeLamports,
          'battle',
          battleId
        );
        console.log(`[Battle] Credited ${prizeLamports / LAMPORTS_PER_SOL} SOL to winner ${battle.winnerId}. TX: ${tx}`);
      } catch (error) {
        console.error(`[Battle] Failed to credit winner ${battle.winnerId}:`, error);
        // Log but continue - winner will need manual credit
      }
    }

    // Record battle results to user_wagers for win verification
    battle.players.forEach(player => {
      const isWinner = player.walletAddress === battle.winnerId;
      const entryFee = battle.config.entryFee;
      const profitLoss = isWinner ? (prizeAfterRake - entryFee) : -entryFee;

      try {
        userStatsDb.recordWager(
          player.walletAddress,
          'battle',
          entryFee,
          isWinner ? 'won' : 'lost',
          profitLoss,
          battleId
        );
      } catch (error) {
        console.error(`[Battle] Failed to record wager for ${player.walletAddress}:`, error);
      }
    });

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
    // Prevent re-queueing if already in a ready check
    if (this.walletsInReadyCheck.has(walletAddress)) {
      console.log(`[Matchmaking] ${walletAddress.slice(0, 8)}... already in ready check, cannot queue`);
      return;
    }

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
        // Filter out players who are already in a ready check
        const availablePlayers = queue.filter(
          q => !this.walletsInReadyCheck.has(q.walletAddress)
        );

        if (availablePlayers.length >= 2) {
          const player1 = availablePlayers[0];
          const player2 = availablePlayers[1];

          // Remove matched players from queue
          const idx1 = queue.findIndex(q => q.walletAddress === player1.walletAddress);
          const idx2 = queue.findIndex(q => q.walletAddress === player2.walletAddress);
          // Remove higher index first to avoid shifting issues
          if (idx1 > idx2) {
            queue.splice(idx1, 1);
            queue.splice(idx2, 1);
          } else {
            queue.splice(idx2, 1);
            queue.splice(idx1, 1);
          }

          // Create ready check instead of immediately starting battle
          this.createReadyCheck(player1.walletAddress, player2.walletAddress, player1.config);

          console.log(`[Matchmaking] Matched ${player1.walletAddress.slice(0, 8)}... vs ${player2.walletAddress.slice(0, 8)}... - awaiting ready check`);
        }
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

  // ==================== WALLET-SOCKET REGISTRATION ====================

  // Register wallet-to-socket mapping for targeted notifications
  registerWalletSocket(walletAddress: string, socketId: string): void {
    this.walletToSocketId.set(walletAddress, socketId);
    console.log(`[BattleManager] Registered socket ${socketId} for wallet ${walletAddress.slice(0, 8)}...`);
  }

  // Unregister wallet-socket mapping
  unregisterWalletSocket(walletAddress: string): void {
    this.walletToSocketId.delete(walletAddress);
    console.log(`[BattleManager] Unregistered socket for wallet ${walletAddress.slice(0, 8)}...`);
  }

  // Get socket ID for a wallet
  getSocketIdForWallet(walletAddress: string): string | undefined {
    return this.walletToSocketId.get(walletAddress);
  }

  // ==================== READY CHECK SYSTEM ====================

  // Subscribe to ready check events
  subscribeToReadyCheckEvents(listener: (event: ReadyCheckEventType, data: any) => void): () => void {
    this.readyCheckListeners.add(listener);
    return () => this.readyCheckListeners.delete(listener);
  }

  // Emit ready check events to all listeners
  private emitReadyCheckEvent<T extends ReadyCheckEventType>(
    event: T,
    data: ReadyCheckEventData[T]
  ): void {
    this.readyCheckListeners.forEach(listener => listener(event, data));
  }

  // Check if wallet is in a ready check
  isWalletInReadyCheck(walletAddress: string): boolean {
    return this.walletsInReadyCheck.has(walletAddress);
  }

  // Create a ready check between two matched players
  private async createReadyCheck(
    player1Wallet: string,
    player2Wallet: string,
    config: BattleConfig
  ): Promise<void> {
    // Create battle in waiting state
    const battle = await this.createBattle(config, player1Wallet);

    // Join second player (but don't start yet - battle will start via joinBattle if ready_check isn't used)
    // Override the normal flow - we need to manually add the second player
    const player2: BattlePlayer = {
      walletAddress: player2Wallet,
      account: this.createInitialAccount(),
      trades: [],
    };
    battle.players.push(player2);
    battle.prizePool += battle.config.entryFee;
    this.playerBattles.set(player2Wallet, battle.id);

    // Set status to ready_check instead of starting
    battle.status = 'ready_check';

    const now = Date.now();
    const expiresAt = now + READY_CHECK_TIMEOUT_MS;

    const readyCheck: ReadyCheckState = {
      battleId: battle.id,
      player1Wallet,
      player2Wallet,
      player1Ready: false,
      player2Ready: false,
      startedAt: now,
      expiresAt,
    };

    this.readyChecks.set(battle.id, readyCheck);
    this.walletsInReadyCheck.add(player1Wallet);
    this.walletsInReadyCheck.add(player2Wallet);

    // Set timeout for ready check expiration
    const timer = setTimeout(() => {
      this.handleReadyCheckTimeout(battle.id);
    }, READY_CHECK_TIMEOUT_MS);
    this.readyCheckTimers.set(battle.id, timer);

    // Emit match_found event for both players
    this.emitReadyCheckEvent('match_found', {
      battleId: battle.id,
      player1Wallet,
      player2Wallet,
      config,
      expiresAt,
    });

    console.log(`[BattleManager] Ready check started for battle ${battle.id}: ${player1Wallet.slice(0, 8)}... vs ${player2Wallet.slice(0, 8)}...`);
    this.notifyListeners(battle);
  }

  // Accept ready check
  acceptReadyCheck(battleId: string, walletAddress: string): boolean {
    const readyCheck = this.readyChecks.get(battleId);
    if (!readyCheck) {
      console.log(`[BattleManager] Ready check not found for battle ${battleId}`);
      return false;
    }

    // Check if expired
    if (Date.now() > readyCheck.expiresAt) {
      console.log(`[BattleManager] Ready check expired for battle ${battleId}`);
      return false;
    }

    // Mark player as ready
    if (walletAddress === readyCheck.player1Wallet) {
      readyCheck.player1Ready = true;
    } else if (walletAddress === readyCheck.player2Wallet) {
      readyCheck.player2Ready = true;
    } else {
      console.log(`[BattleManager] Wallet ${walletAddress} not in ready check for battle ${battleId}`);
      return false;
    }

    console.log(`[BattleManager] Player ${walletAddress.slice(0, 8)}... accepted ready check for battle ${battleId}`);

    // Emit update
    const timeRemaining = Math.max(0, Math.ceil((readyCheck.expiresAt - Date.now()) / 1000));
    this.emitReadyCheckEvent('ready_check_update', {
      battleId,
      player1Ready: readyCheck.player1Ready,
      player2Ready: readyCheck.player2Ready,
      timeRemaining,
    });

    // Check if both ready
    if (readyCheck.player1Ready && readyCheck.player2Ready) {
      this.completeReadyCheck(battleId);
    }

    return true;
  }

  // Decline ready check
  declineReadyCheck(battleId: string, walletAddress: string): boolean {
    const readyCheck = this.readyChecks.get(battleId);
    if (!readyCheck) {
      console.log(`[BattleManager] Ready check not found for battle ${battleId}`);
      return false;
    }

    // Determine who declined and who was ready
    const isPlayer1 = walletAddress === readyCheck.player1Wallet;
    const isPlayer2 = walletAddress === readyCheck.player2Wallet;

    if (!isPlayer1 && !isPlayer2) {
      console.log(`[BattleManager] Wallet ${walletAddress} not in ready check for battle ${battleId}`);
      return false;
    }

    const readyPlayer = isPlayer1
      ? (readyCheck.player2Ready ? readyCheck.player2Wallet : undefined)
      : (readyCheck.player1Ready ? readyCheck.player1Wallet : undefined);

    console.log(`[BattleManager] Player ${walletAddress.slice(0, 8)}... declined ready check for battle ${battleId}`);

    // Cancel the ready check
    this.cancelReadyCheck(battleId, 'declined', walletAddress, readyPlayer);

    return true;
  }

  // Handle ready check timeout
  private handleReadyCheckTimeout(battleId: string): void {
    const readyCheck = this.readyChecks.get(battleId);
    if (!readyCheck) return;

    // Determine who timed out (whoever wasn't ready)
    let timedOutPlayer: string | undefined;
    let readyPlayer: string | undefined;

    if (!readyCheck.player1Ready && !readyCheck.player2Ready) {
      // Both timed out
      timedOutPlayer = undefined; // Both
    } else if (!readyCheck.player1Ready) {
      timedOutPlayer = readyCheck.player1Wallet;
      readyPlayer = readyCheck.player2Wallet;
    } else if (!readyCheck.player2Ready) {
      timedOutPlayer = readyCheck.player2Wallet;
      readyPlayer = readyCheck.player1Wallet;
    }

    console.log(`[BattleManager] Ready check timed out for battle ${battleId}`);
    this.cancelReadyCheck(battleId, 'timeout', timedOutPlayer, readyPlayer);
  }

  // Complete ready check and start battle
  private completeReadyCheck(battleId: string): void {
    const readyCheck = this.readyChecks.get(battleId);
    if (!readyCheck) return;

    // Clear timer
    const timer = this.readyCheckTimers.get(battleId);
    if (timer) {
      clearTimeout(timer);
      this.readyCheckTimers.delete(battleId);
    }

    // Clean up ready check state
    this.readyChecks.delete(battleId);
    this.walletsInReadyCheck.delete(readyCheck.player1Wallet);
    this.walletsInReadyCheck.delete(readyCheck.player2Wallet);

    // Start the battle
    console.log(`[BattleManager] Both players ready, starting battle ${battleId}`);
    this.startBattle(battleId);
  }

  // Cancel ready check
  private cancelReadyCheck(
    battleId: string,
    reason: 'declined' | 'timeout',
    declinedOrTimedOutBy?: string,
    readyPlayer?: string
  ): void {
    const readyCheck = this.readyChecks.get(battleId);
    if (!readyCheck) return;

    // Clear timer
    const timer = this.readyCheckTimers.get(battleId);
    if (timer) {
      clearTimeout(timer);
      this.readyCheckTimers.delete(battleId);
    }

    // Cancel the battle
    const battle = this.battles.get(battleId);
    if (battle) {
      battle.status = 'cancelled';

      // Clear player battle mappings
      battle.players.forEach(player => {
        this.playerBattles.delete(player.walletAddress);
      });

      this.notifyListeners(battle);
    }

    // Clean up ready check state
    this.readyChecks.delete(battleId);
    this.walletsInReadyCheck.delete(readyCheck.player1Wallet);
    this.walletsInReadyCheck.delete(readyCheck.player2Wallet);

    // Emit cancelled event
    const cancelledData: ReadyCheckCancelled = {
      battleId,
      reason,
      readyPlayer,
    };

    if (reason === 'declined') {
      cancelledData.declinedBy = declinedOrTimedOutBy;
    } else {
      cancelledData.timedOutPlayer = declinedOrTimedOutBy;
    }

    this.emitReadyCheckEvent('ready_check_cancelled', cancelledData);
    console.log(`[BattleManager] Ready check cancelled for battle ${battleId}: ${reason}`);
  }

  // Get ready check state for a battle
  getReadyCheck(battleId: string): ReadyCheckState | undefined {
    return this.readyChecks.get(battleId);
  }
}

// Singleton instance
export const battleManager = new BattleManager();
