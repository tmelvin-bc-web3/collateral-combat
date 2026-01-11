import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { priceService } from './services/priceService';
import { battleManager } from './services/battleManager';
import { spectatorService } from './services/spectatorService';
import { battleSimulator } from './services/battleSimulator';
import { predictionService } from './services/predictionService';
import { coinMarketCapService } from './services/coinMarketCapService';
import { draftTournamentManager } from './services/draftTournamentManager';
import { progressionService } from './services/progressionService';
import { getProfile, upsertProfile, getProfiles, deleteProfile, isUsernameTaken, ProfilePictureType } from './db/database';
import { WHITELISTED_TOKENS } from './tokens';
import { BattleConfig, ServerToClientEvents, ClientToServerEvents, PredictionSide, DraftTournamentTier } from './types';

const app = express();
const httpServer = createServer(app);

const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: {
    origin: true, // Allow all origins in development
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

app.use(cors({
  origin: true, // Allow all origins in development
  credentials: true,
}));
app.use(express.json());

// REST API Routes

// Get all whitelisted tokens
app.get('/api/tokens', (req, res) => {
  res.json(WHITELISTED_TOKENS);
});

// Get current prices
app.get('/api/prices', (req, res) => {
  res.json({
    prices: priceService.getAllPrices(),
    lastUpdate: priceService.getLastUpdate(),
  });
});

// Get price history for a symbol
app.get('/api/prices/history/:symbol', (req, res) => {
  const duration = parseInt(req.query.duration as string) || 60000;
  const history = priceService.getPriceHistory(req.params.symbol.toUpperCase(), duration);
  res.json(history);
});

// Get active battles
app.get('/api/battles', (req, res) => {
  res.json(battleManager.getActiveBattles());
});

// Get live battles for spectators (must be before :id route)
app.get('/api/battles/live', (req, res) => {
  res.json(spectatorService.getLiveBattles());
});

// Get recent completed battles
app.get('/api/battles/recent', (req, res) => {
  const limit = parseInt(req.query.limit as string) || 10;
  res.json(battleManager.getRecentBattles(limit));
});

// Get specific battle
app.get('/api/battles/:id', (req, res) => {
  const battle = battleManager.getBattle(req.params.id);
  if (!battle) {
    return res.status(404).json({ error: 'Battle not found' });
  }
  res.json(battle);
});

// Get player's current battle
app.get('/api/player/:wallet/battle', (req, res) => {
  const battle = battleManager.getPlayerBattle(req.params.wallet);
  res.json(battle || null);
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: Date.now(),
    priceServiceLastUpdate: priceService.getLastUpdate(),
  });
});

// Profile endpoints

// Check if username is available
app.get('/api/username/check/:username', (req, res) => {
  const username = req.params.username;
  const excludeWallet = req.query.wallet as string | undefined;

  if (!username || username.length > 20) {
    return res.status(400).json({ error: 'Invalid username' });
  }

  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    return res.status(400).json({ error: 'Username can only contain letters, numbers, and underscores' });
  }

  const taken = isUsernameTaken(username, excludeWallet);
  res.json({ available: !taken, username });
});

app.get('/api/profile/:wallet', (req, res) => {
  const profile = getProfile(req.params.wallet);
  if (!profile) {
    return res.json({
      walletAddress: req.params.wallet,
      pfpType: 'default',
      updatedAt: 0,
    });
  }
  res.json(profile);
});

app.put('/api/profile/:wallet', (req, res) => {
  try {
    const { pfpType, presetId, nftMint, nftImageUrl, username } = req.body;

    if (!pfpType || !['preset', 'nft', 'default'].includes(pfpType)) {
      return res.status(400).json({ error: 'Invalid pfpType' });
    }

    if (pfpType === 'preset' && !presetId) {
      return res.status(400).json({ error: 'presetId required for preset type' });
    }

    if (pfpType === 'nft' && (!nftMint || !nftImageUrl)) {
      return res.status(400).json({ error: 'nftMint and nftImageUrl required for nft type' });
    }

    // Validate username if provided
    if (username !== undefined && username !== null && username !== '') {
      if (typeof username !== 'string' || username.length > 20) {
        return res.status(400).json({ error: 'Username must be 20 characters or less' });
      }
      if (!/^[a-zA-Z0-9_]+$/.test(username)) {
        return res.status(400).json({ error: 'Username can only contain letters, numbers, and underscores' });
      }
      // Check if username is already taken by another user
      if (isUsernameTaken(username, req.params.wallet)) {
        return res.status(409).json({ error: 'Username is already taken' });
      }
    }

    const profile = upsertProfile({
      walletAddress: req.params.wallet,
      username: username || undefined,
      pfpType: pfpType as ProfilePictureType,
      presetId: pfpType === 'preset' ? presetId : undefined,
      nftMint: pfpType === 'nft' ? nftMint : undefined,
      nftImageUrl: pfpType === 'nft' ? nftImageUrl : undefined,
    });

    res.json(profile);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/profiles', (req, res) => {
  const walletsParam = req.query.wallets as string;
  if (!walletsParam) {
    return res.status(400).json({ error: 'wallets query parameter required' });
  }

  const wallets = walletsParam.split(',').filter(w => w.length > 0);
  if (wallets.length === 0) {
    return res.json([]);
  }

  const profiles = getProfiles(wallets);
  res.json(profiles);
});

app.delete('/api/profile/:wallet', (req, res) => {
  const deleted = deleteProfile(req.params.wallet);
  res.json({ deleted });
});

// Simulator endpoints (for testing)
app.post('/api/simulator/start', (req, res) => {
  const numBattles = parseInt(req.query.battles as string) || 3;
  battleSimulator.start(numBattles);
  res.json({ status: 'started', battles: numBattles });
});

app.post('/api/simulator/stop', (req, res) => {
  battleSimulator.stop();
  res.json({ status: 'stopped' });
});

app.get('/api/simulator/status', (req, res) => {
  res.json(battleSimulator.getStatus());
});

// Prediction endpoints
app.get('/api/prediction/:asset/current', (req, res) => {
  const round = predictionService.getCurrentRound(req.params.asset);
  res.json(round || null);
});

app.get('/api/prediction/:asset/recent', (req, res) => {
  const limit = parseInt(req.query.limit as string) || 10;
  res.json(predictionService.getRecentRounds(req.params.asset, limit));
});

app.get('/api/prediction/:asset/stats', (req, res) => {
  res.json(predictionService.getStats(req.params.asset) || null);
});

app.get('/api/prediction/assets', (req, res) => {
  res.json(predictionService.getActiveAssets());
});

app.post('/api/prediction/:asset/start', (req, res) => {
  predictionService.start(req.params.asset);
  res.json({ status: 'started', asset: req.params.asset });
});

app.post('/api/prediction/:asset/stop', (req, res) => {
  predictionService.stop(req.params.asset);
  res.json({ status: 'stopped', asset: req.params.asset });
});

// ===================
// Draft Tournament Endpoints
// ===================

// Get all active tournaments
app.get('/api/draft/tournaments', (req, res) => {
  res.json(draftTournamentManager.getAllActiveTournaments());
});

// Get tournament by tier (for current week)
app.get('/api/draft/tournaments/tier/:tier', (req, res) => {
  const tier = ('$' + req.params.tier) as DraftTournamentTier;
  if (!['$5', '$25', '$100'].includes(tier)) {
    return res.status(400).json({ error: 'Invalid tier. Use 5, 25, or 100' });
  }
  const tournament = draftTournamentManager.getTournamentForTier(tier);
  res.json(tournament);
});

// Get specific tournament
app.get('/api/draft/tournaments/:id', (req, res) => {
  const tournament = draftTournamentManager.getTournament(req.params.id);
  if (!tournament) {
    return res.status(404).json({ error: 'Tournament not found' });
  }
  res.json(tournament);
});

// Get tournament leaderboard
app.get('/api/draft/tournaments/:id/leaderboard', (req, res) => {
  const tournament = draftTournamentManager.getTournament(req.params.id);
  if (!tournament) {
    return res.status(404).json({ error: 'Tournament not found' });
  }
  res.json(draftTournamentManager.getLeaderboard(req.params.id));
});

// Enter tournament
app.post('/api/draft/tournaments/:id/enter', (req, res) => {
  try {
    const { walletAddress } = req.body;
    if (!walletAddress) {
      return res.status(400).json({ error: 'walletAddress required' });
    }
    const entry = draftTournamentManager.enterTournament(req.params.id, walletAddress);
    res.json(entry);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Get entry by ID
app.get('/api/draft/entries/:entryId', (req, res) => {
  const entry = draftTournamentManager.getEntry(req.params.entryId);
  if (!entry) {
    return res.status(404).json({ error: 'Entry not found' });
  }
  res.json(entry);
});

// Get entries for wallet
app.get('/api/draft/entries/wallet/:wallet', (req, res) => {
  res.json(draftTournamentManager.getEntriesForWallet(req.params.wallet));
});

// Start draft session
app.post('/api/draft/entries/:entryId/start', (req, res) => {
  try {
    const session = draftTournamentManager.startDraft(req.params.entryId);
    res.json(session);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Make a draft pick
app.post('/api/draft/entries/:entryId/pick', (req, res) => {
  try {
    const { roundNumber, coinId } = req.body;
    if (!roundNumber || !coinId) {
      return res.status(400).json({ error: 'roundNumber and coinId required' });
    }
    const pick = draftTournamentManager.makePick(req.params.entryId, roundNumber, coinId);
    res.json(pick);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Initiate swap power-up
app.post('/api/draft/entries/:entryId/powerup/swap', (req, res) => {
  try {
    const { pickId } = req.body;
    if (!pickId) {
      return res.status(400).json({ error: 'pickId required' });
    }
    const result = draftTournamentManager.useSwap(req.params.entryId, pickId);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Select coin for swap
app.post('/api/draft/entries/:entryId/powerup/swap/select', (req, res) => {
  try {
    const { pickId, newCoinId } = req.body;
    if (!pickId || !newCoinId) {
      return res.status(400).json({ error: 'pickId and newCoinId required' });
    }
    const pick = draftTournamentManager.selectSwapCoin(req.params.entryId, pickId, newCoinId);
    res.json(pick);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Use boost power-up
app.post('/api/draft/entries/:entryId/powerup/boost', (req, res) => {
  try {
    const { pickId } = req.body;
    if (!pickId) {
      return res.status(400).json({ error: 'pickId required' });
    }
    const pick = draftTournamentManager.useBoost(req.params.entryId, pickId);
    res.json(pick);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Use freeze power-up
app.post('/api/draft/entries/:entryId/powerup/freeze', (req, res) => {
  try {
    const { pickId } = req.body;
    if (!pickId) {
      return res.status(400).json({ error: 'pickId required' });
    }
    const pick = draftTournamentManager.useFreeze(req.params.entryId, pickId);
    res.json(pick);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Get all memecoins
app.get('/api/draft/memecoins', (req, res) => {
  res.json(coinMarketCapService.getAllMemecoins());
});

// Get memecoin prices
app.get('/api/draft/memecoins/prices', (req, res) => {
  res.json(coinMarketCapService.getAllPrices());
});

// ===================
// Progression Endpoints
// ===================

// Get user progression (level, XP, title)
app.get('/api/progression/:wallet', (req, res) => {
  const progression = progressionService.getProgression(req.params.wallet);
  res.json(progression);
});

// Get XP history
app.get('/api/progression/:wallet/history', (req, res) => {
  const limit = parseInt(req.query.limit as string) || 20;
  const history = progressionService.getXpHistory(req.params.wallet, limit);
  res.json(history);
});

// Get available & active perks
app.get('/api/progression/:wallet/perks', (req, res) => {
  const perks = progressionService.getAvailablePerks(req.params.wallet);
  res.json(perks);
});

// Activate a perk
app.post('/api/progression/:wallet/perks/:id/activate', (req, res) => {
  try {
    const perkId = parseInt(req.params.id);
    if (isNaN(perkId)) {
      return res.status(400).json({ error: 'Invalid perk ID' });
    }
    const perk = progressionService.activatePerk(req.params.wallet, perkId);
    if (!perk) {
      return res.status(404).json({ error: 'Perk not found or already used' });
    }
    res.json(perk);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Get unlocked cosmetics
app.get('/api/progression/:wallet/cosmetics', (req, res) => {
  const cosmetics = progressionService.getUnlockedCosmetics(req.params.wallet);
  res.json(cosmetics);
});

// Get current rake % for user (returns both Draft and Oracle rates)
app.get('/api/progression/:wallet/rake', (req, res) => {
  const draftRake = progressionService.getActiveRakeReduction(req.params.wallet);
  const oracleRake = progressionService.getActiveOracleRakeReduction(req.params.wallet);
  res.json({
    rakePercent: draftRake,  // Legacy: Draft rake
    draftRakePercent: draftRake,
    oracleRakePercent: oracleRake
  });
});

// ============= Free Bet Endpoints =============

// Get free bet balance
app.get('/api/progression/:wallet/free-bets', (req, res) => {
  const balance = progressionService.getFreeBetBalance(req.params.wallet);
  res.json(balance);
});

// Get free bet transaction history
app.get('/api/progression/:wallet/free-bets/history', (req, res) => {
  const limit = parseInt(req.query.limit as string) || 50;
  const history = progressionService.getFreeBetTransactionHistory(req.params.wallet, limit);
  res.json(history);
});

// Use free bet credit (for Oracle predictions)
app.post('/api/progression/:wallet/free-bets/use', (req, res) => {
  const { gameMode, description } = req.body;

  if (!gameMode || !['oracle', 'battle', 'draft', 'spectator'].includes(gameMode)) {
    return res.status(400).json({ error: 'Invalid game mode' });
  }

  const result = progressionService.useFreeBetCredit(
    req.params.wallet,
    gameMode,
    description
  );

  if (!result.success) {
    return res.status(400).json({ error: 'No free bets available', balance: result.balance });
  }

  res.json({ success: true, balance: result.balance });
});

// ===================
// Streak Endpoints
// ===================

// Get user streak info
app.get('/api/progression/:wallet/streak', (req, res) => {
  const streak = progressionService.getStreak(req.params.wallet);
  const bonusPercent = Math.round(progressionService.getStreakBonus(streak.currentStreak) * 100);
  const atRisk = progressionService.isStreakAtRisk(req.params.wallet);

  res.json({
    ...streak,
    bonusPercent,
    atRisk,
  });
});

// WebSocket handling
io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);

  let currentBattleId: string | null = null;
  let walletAddress: string | null = null;

  // Create a new battle
  socket.on('create_battle', (config: BattleConfig, wallet: string) => {
    try {
      walletAddress = wallet;
      const battle = battleManager.createBattle(config, wallet);
      currentBattleId = battle.id;
      socket.join(battle.id);
      socket.emit('battle_update', battle);
    } catch (error: any) {
      socket.emit('error', error.message);
    }
  });

  // Join existing battle
  socket.on('join_battle', (battleId: string, wallet: string) => {
    try {
      walletAddress = wallet;
      const battle = battleManager.joinBattle(battleId, wallet);
      if (battle) {
        currentBattleId = battleId;
        socket.join(battleId);
        io.to(battleId).emit('battle_update', battle);

        if (battle.status === 'active') {
          io.to(battleId).emit('battle_started', battle);
        }
      }
    } catch (error: any) {
      socket.emit('error', error.message);
    }
  });

  // Queue for matchmaking
  socket.on('queue_matchmaking', (config: BattleConfig, wallet: string) => {
    try {
      walletAddress = wallet;
      battleManager.queueForMatchmaking(config, wallet);

      const status = battleManager.getQueueStatus(config);
      socket.emit('matchmaking_status', {
        position: status.position,
        estimated: status.playersInQueue > 1 ? 5 : 30, // seconds
      });
    } catch (error: any) {
      socket.emit('error', error.message);
    }
  });

  // Open a perp position
  socket.on('open_position', (battleId: string, asset: string, side: any, leverage: any, size: number) => {
    try {
      if (!walletAddress) {
        throw new Error('Not authenticated');
      }

      const position = battleManager.openPosition(battleId, walletAddress, asset, side, leverage, size);
      if (position) {
        socket.emit('position_opened', position);

        const battle = battleManager.getBattle(battleId);
        if (battle) {
          socket.emit('battle_update', battle);
        }
      }
    } catch (error: any) {
      socket.emit('error', error.message);
    }
  });

  // Close a perp position
  socket.on('close_position', (battleId: string, positionId: string) => {
    try {
      if (!walletAddress) {
        throw new Error('Not authenticated');
      }

      const trade = battleManager.closePosition(battleId, walletAddress, positionId);
      if (trade) {
        socket.emit('position_closed', trade);

        const battle = battleManager.getBattle(battleId);
        if (battle) {
          socket.emit('battle_update', battle);
        }
      }
    } catch (error: any) {
      socket.emit('error', error.message);
    }
  });

  // Start solo practice
  socket.on('start_solo_practice', (config: BattleConfig, wallet: string) => {
    try {
      walletAddress = wallet;
      const battle = battleManager.createSoloPractice(config, wallet);
      currentBattleId = battle.id;
      socket.join(battle.id);
      socket.emit('battle_update', battle);
      socket.emit('battle_started', battle);
    } catch (error: any) {
      socket.emit('error', error.message);
    }
  });

  // Leave battle/matchmaking
  socket.on('leave_battle', (battleId: string) => {
    if (walletAddress) {
      battleManager.leaveMatchmaking(walletAddress);
    }
    if (currentBattleId) {
      socket.leave(currentBattleId);
      currentBattleId = null;
    }
  });

  // Subscribe to price updates
  socket.on('subscribe_prices', (tokens: string[]) => {
    socket.join('price_updates');
  });

  // Spectator events
  socket.on('subscribe_live_battles', () => {
    socket.join('live_battles');
    socket.emit('live_battles', spectatorService.getLiveBattles());
  });

  socket.on('unsubscribe_live_battles', () => {
    socket.leave('live_battles');
  });

  socket.on('spectate_battle', (battleId: string) => {
    socket.join(`spectate_${battleId}`);
    spectatorService.joinSpectate(battleId, socket.id);
  });

  socket.on('leave_spectate', (battleId: string) => {
    socket.leave(`spectate_${battleId}`);
    spectatorService.leaveSpectate(battleId, socket.id);
  });

  socket.on('place_bet', (battleId: string, backedPlayer: string, amount: number, wallet: string) => {
    try {
      const bet = spectatorService.placeBet(battleId, backedPlayer, amount, wallet);
      socket.emit('bet_placed', bet);
    } catch (error: any) {
      socket.emit('error', error.message);
    }
  });

  socket.on('get_my_bets', (wallet: string) => {
    const bets = spectatorService.getUserBets(wallet);
    // Send bets back - could be a separate event or part of initial load
  });

  // Prediction events
  socket.on('subscribe_prediction', (asset: string) => {
    socket.join(`prediction_${asset}`);
    const currentRound = predictionService.getCurrentRound(asset);
    if (currentRound) {
      socket.emit('prediction_round', currentRound);
    }
    const recentRounds = predictionService.getRecentRounds(asset, 10);
    socket.emit('prediction_history', recentRounds);
  });

  socket.on('unsubscribe_prediction', (asset: string) => {
    socket.leave(`prediction_${asset}`);
  });

  socket.on('place_prediction', (asset: string, side: PredictionSide, amount: number, wallet: string) => {
    try {
      const bet = predictionService.placeBet(asset, side, amount, wallet);
      socket.emit('prediction_bet_placed', bet);
    } catch (error: any) {
      socket.emit('error', error.message);
    }
  });

  // ===================
  // Draft Tournament Events
  // ===================

  socket.on('join_draft_lobby', (tier: DraftTournamentTier) => {
    socket.join(`draft_lobby_${tier}`);
    const tournament = draftTournamentManager.getTournamentForTier(tier);
    if (tournament) {
      socket.emit('draft_tournament_update' as any, tournament);
    }
  });

  socket.on('leave_draft_lobby', () => {
    socket.leave('draft_lobby_$5');
    socket.leave('draft_lobby_$25');
    socket.leave('draft_lobby_$100');
  });

  socket.on('subscribe_draft_tournament', (tournamentId: string) => {
    socket.join(`draft_tournament_${tournamentId}`);
    const leaderboard = draftTournamentManager.getLeaderboard(tournamentId);
    socket.emit('draft_leaderboard_update' as any, { tournamentId, leaderboard });
  });

  socket.on('unsubscribe_draft_tournament', (tournamentId: string) => {
    socket.leave(`draft_tournament_${tournamentId}`);
  });

  socket.on('start_draft', (entryId: string) => {
    try {
      const session = draftTournamentManager.startDraft(entryId);
      socket.emit('draft_session_update' as any, session);
      // Send the current round options (not always round 0)
      const currentRoundIndex = session.currentRound - 1;
      if (session.rounds.length > currentRoundIndex && currentRoundIndex >= 0) {
        socket.emit('draft_round_options' as any, session.rounds[currentRoundIndex]);
      }
    } catch (error: any) {
      socket.emit('draft_error' as any, error.message);
    }
  });

  socket.on('make_draft_pick', (entryId: string, roundNumber: number, coinId: string) => {
    try {
      const pick = draftTournamentManager.makePick(entryId, roundNumber, coinId);
      socket.emit('draft_pick_confirmed' as any, pick);

      const session = draftTournamentManager.getDraftSession(entryId);
      if (session) {
        socket.emit('draft_session_update' as any, session);
        if (session.status === 'in_progress' && session.rounds.length > roundNumber) {
          socket.emit('draft_round_options' as any, session.rounds[roundNumber]);
        }
      }

      if (roundNumber >= 6) {
        const entry = draftTournamentManager.getEntry(entryId);
        if (entry) {
          socket.emit('draft_completed' as any, entry);
        }
      }
    } catch (error: any) {
      socket.emit('draft_error' as any, error.message);
    }
  });

  socket.on('use_powerup_swap', (entryId: string, pickId: string) => {
    try {
      const result = draftTournamentManager.useSwap(entryId, pickId);
      socket.emit('draft_swap_options' as any, { pickId, options: result.options });
    } catch (error: any) {
      socket.emit('draft_error' as any, error.message);
    }
  });

  socket.on('select_swap_coin', (entryId: string, pickId: string, newCoinId: string) => {
    try {
      const pick = draftTournamentManager.selectSwapCoin(entryId, pickId, newCoinId);
      socket.emit('powerup_used' as any, { entryId, type: 'swap', pick });
    } catch (error: any) {
      socket.emit('draft_error' as any, error.message);
    }
  });

  socket.on('use_powerup_boost', (entryId: string, pickId: string) => {
    try {
      const pick = draftTournamentManager.useBoost(entryId, pickId);
      socket.emit('powerup_used' as any, { entryId, type: 'boost', pick });
    } catch (error: any) {
      socket.emit('draft_error' as any, error.message);
    }
  });

  socket.on('use_powerup_freeze', (entryId: string, pickId: string) => {
    try {
      const pick = draftTournamentManager.useFreeze(entryId, pickId);
      socket.emit('powerup_used' as any, { entryId, type: 'freeze', pick });
    } catch (error: any) {
      socket.emit('draft_error' as any, error.message);
    }
  });

  // ===================
  // Progression Events
  // ===================

  socket.on('subscribe_progression', (wallet: string) => {
    walletAddress = wallet;
    socket.join(`progression_${wallet}`);
    // Send current progression state
    const progression = progressionService.getProgression(wallet);
    socket.emit('progression_update' as any, progression);
  });

  socket.on('unsubscribe_progression', (wallet: string) => {
    socket.leave(`progression_${wallet}`);
  });

  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
    if (walletAddress) {
      battleManager.leaveMatchmaking(walletAddress);
    }
  });
});

// Subscribe to price updates and broadcast
priceService.subscribe((prices) => {
  io.to('price_updates').emit('price_update', prices);
  battleManager.updateAllAccounts();
});

// Subscribe to battle updates and broadcast
battleManager.subscribe((battle) => {
  io.to(battle.id).emit('battle_update', battle);

  if (battle.status === 'active' && battle.startedAt && Date.now() - battle.startedAt < 1000) {
    io.to(battle.id).emit('battle_started', battle);
  }

  if (battle.status === 'completed') {
    io.to(battle.id).emit('battle_ended', battle);
  }
});

// Subscribe to spectator service events and broadcast
spectatorService.subscribe((event, data) => {
  switch (event) {
    case 'live_battles':
      io.to('live_battles').emit('live_battles', data);
      break;
    case 'spectator_battle_update':
      io.to('live_battles').emit('spectator_battle_update', data);
      io.to(`spectate_${data.id}`).emit('spectator_battle_update', data);
      break;
    case 'odds_update':
      io.to(`spectate_${data.battleId}`).emit('odds_update', data);
      io.to('live_battles').emit('odds_update', data);
      break;
    case 'bet_placed':
      io.to(`spectate_${data.battleId}`).emit('bet_placed', data);
      break;
    case 'bet_settled':
      io.to(`spectate_${data.battleId}`).emit('bet_settled', data);
      break;
    case 'spectator_count':
      io.to(`spectate_${data.battleId}`).emit('spectator_count', data);
      io.to('live_battles').emit('spectator_count', data);
      break;
  }
});

// Subscribe to prediction service events and broadcast
predictionService.subscribe((event, data) => {
  switch (event) {
    case 'round_started':
      io.to(`prediction_${data.asset}`).emit('prediction_round', data);
      break;
    case 'round_locked':
      io.to(`prediction_${data.asset}`).emit('prediction_round', data);
      break;
    case 'round_settled':
      io.to(`prediction_${data.asset}`).emit('prediction_round', data);
      io.to(`prediction_${data.asset}`).emit('prediction_settled', data);
      break;
    case 'bet_placed':
      io.to(`prediction_${data.round.asset}`).emit('prediction_round', data.round);
      break;
  }
});

// Subscribe to draft tournament events and broadcast
draftTournamentManager.subscribe((event, data) => {
  switch (event) {
    case 'tournament_status_changed':
      // Broadcast to all tier lobbies
      io.to(`draft_lobby_${data.tier}`).emit('draft_tournament_update' as any, data);
      io.to(`draft_tournament_${data.id}`).emit('draft_tournament_update' as any, data);
      break;
    case 'entry_created':
      io.to(`draft_tournament_${data.tournamentId}`).emit('draft_tournament_update' as any,
        draftTournamentManager.getTournament(data.tournamentId));
      break;
    case 'draft_completed':
      io.to(`draft_tournament_${data.tournamentId}`).emit('draft_completed' as any, data);
      break;
    case 'score_update':
      io.to(`draft_tournament_${data.tournamentId}`).emit('draft_score_update' as any, data);
      break;
    case 'leaderboard_update':
      io.to(`draft_tournament_${data.tournamentId}`).emit('draft_leaderboard_update' as any, data);
      break;
    case 'powerup_used':
      io.to(`draft_tournament_${data.entry?.tournamentId || ''}`).emit('powerup_used' as any, data);
      break;
    case 'tournament_settled':
      io.to(`draft_tournament_${data.tournament.id}`).emit('draft_tournament_update' as any, data.tournament);
      io.to(`draft_tournament_${data.tournament.id}`).emit('draft_leaderboard_update' as any, {
        tournamentId: data.tournament.id,
        leaderboard: data.leaderboard
      });
      break;
  }
});

// Subscribe to memecoin price updates
coinMarketCapService.subscribe((prices) => {
  io.to('draft_prices').emit('memecoin_prices_update' as any, prices);
});

// Subscribe to progression events and broadcast to user
progressionService.subscribe((event, data) => {
  switch (event) {
    case 'xp_gained':
      // Broadcast to the specific user's progression room
      io.to(`progression_${data.walletAddress}`).emit('xp_gained' as any, {
        amount: data.amount,
        newTotal: data.newTotal,
        source: data.source,
        description: data.description
      });
      break;
    case 'level_up':
      // Broadcast level up celebration to the specific user
      io.to(`progression_${data.walletAddress}`).emit('level_up' as any, {
        previousLevel: data.previousLevel,
        newLevel: data.newLevel,
        newTitle: data.newTitle,
        unlockedPerks: data.unlockedPerks,
        unlockedCosmetics: data.unlockedCosmetics
      });
      break;
    case 'perk_activated':
      io.to(`progression_${data.walletAddress}`).emit('perk_activated' as any, data.perk);
      break;
    case 'perk_expired':
      io.to(`progression_${data.walletAddress}`).emit('perk_expired' as any, { perkId: data.perkId });
      break;
  }
});

// Start server
const PORT = process.env.PORT || 3001;

async function start() {
  // Start price service
  await priceService.start(5000); // Update prices every 5 seconds

  // Start CoinMarketCap service for memecoins
  await coinMarketCapService.start();

  // Start draft tournament manager
  draftTournamentManager.start();

  httpServer.listen(PORT, () => {
    console.log(`
╔═══════════════════════════════════════════════════════════╗
║                      SOL BATTLES                          ║
║                   Backend Server                          ║
╠═══════════════════════════════════════════════════════════╣
║  REST API:    http://localhost:${PORT}/api                   ║
║  WebSocket:   ws://localhost:${PORT}                         ║
╠═══════════════════════════════════════════════════════════╣
║  Endpoints:                                               ║
║    GET  /api/tokens         - Whitelisted tokens          ║
║    GET  /api/prices         - Current prices              ║
║    GET  /api/battles        - Active battles              ║
║    GET  /api/battles/live   - Live battles (spectator)    ║
║    GET  /api/health         - Health check                ║
║    POST /api/simulator/start - Start battle simulator     ║
║    POST /api/simulator/stop  - Stop battle simulator      ║
╚═══════════════════════════════════════════════════════════╝
    `);

    // Auto-start simulator in development mode
    if (process.env.NODE_ENV !== 'production' && process.env.DISABLE_SIMULATOR !== 'true') {
      console.log('\n🎮 Auto-starting battle simulator for development...\n');
      setTimeout(() => {
        battleSimulator.start(3);
      }, 2000);
    }

    // Auto-start prediction game for SOL
    console.log('\n🎯 Starting prediction game for SOL...\n');
    setTimeout(() => {
      predictionService.start('SOL');
    }, 3000);
  });
}

start().catch(console.error);
