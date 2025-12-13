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
import { getProfile, upsertProfile, getProfiles, deleteProfile, ProfilePictureType } from './db/database';
import { WHITELISTED_TOKENS } from './tokens';
import { BattleConfig, ServerToClientEvents, ClientToServerEvents, PredictionSide } from './types';

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

// Start server
const PORT = process.env.PORT || 3001;

async function start() {
  // Start price service
  await priceService.start(5000); // Update prices every 5 seconds

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
