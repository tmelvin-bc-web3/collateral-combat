// LDS (Last Degen Standing) Database
// Tracks games, players, rounds, and predictions for the battle royale elimination game

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

const DATA_DIR = path.join(__dirname, '../../data');
const DB_PATH = path.join(DATA_DIR, 'lds.db');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Initialize database
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

// ============================================
// Types
// ============================================

export type LDSGameStatus = 'registering' | 'starting' | 'in_progress' | 'completed' | 'cancelled';
export type LDSPlayerStatus = 'alive' | 'eliminated' | 'winner';
export type LDSPrediction = 'up' | 'down';
export type LDSRoundResult = 'up' | 'down';

export interface LDSGameRecord {
  id: string;
  status: LDSGameStatus;
  entryFeeLamports: number;
  scheduledStartTime: number;
  actualStartTime: number | null;
  endTime: number | null;
  currentRound: number;
  prizePoolLamports: number;
  rakeLamports: number;
  playerCount: number;
  createdAt: number;
}

export interface LDSPlayerRecord {
  id: string;
  gameId: string;
  walletAddress: string;
  status: LDSPlayerStatus;
  eliminatedAtRound: number | null;
  placement: number | null;
  payoutLamports: number;
  isFreeBet: boolean;
  joinedAt: number;
}

export interface LDSRoundRecord {
  id: string;
  gameId: string;
  roundNumber: number;
  startPrice: number;
  endPrice: number | null;
  result: LDSRoundResult | null;
  playersAliveBefore: number;
  playersAliveAfter: number | null;
  predictionDeadline: number;
  startedAt: number;
  resolvedAt: number | null;
}

export interface LDSPredictionRecord {
  id: string;
  gameId: string;
  roundNumber: number;
  walletAddress: string;
  prediction: LDSPrediction | null;
  correct: boolean | null;
  eliminated: boolean | null;
  predictedAt: number | null;
}

export interface LDSHistoryRecord {
  gameId: string;
  walletAddress: string;
  playerCount: number;
  placement: number;
  payoutLamports: number;
  entryFeeLamports: number;
  roundsSurvived: number;
  playedAt: number;
}

// ============================================
// Schema
// ============================================

db.exec(`
  -- Games table
  CREATE TABLE IF NOT EXISTS lds_games (
    id TEXT PRIMARY KEY,
    status TEXT NOT NULL DEFAULT 'registering',
    entry_fee_lamports INTEGER NOT NULL,
    scheduled_start_time INTEGER NOT NULL,
    actual_start_time INTEGER,
    end_time INTEGER,
    current_round INTEGER DEFAULT 0,
    prize_pool_lamports INTEGER DEFAULT 0,
    rake_lamports INTEGER DEFAULT 0,
    player_count INTEGER DEFAULT 0,
    created_at INTEGER NOT NULL
  );

  -- Players table
  CREATE TABLE IF NOT EXISTS lds_players (
    id TEXT PRIMARY KEY,
    game_id TEXT NOT NULL,
    wallet_address TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'alive',
    eliminated_at_round INTEGER,
    placement INTEGER,
    payout_lamports INTEGER DEFAULT 0,
    is_free_bet INTEGER DEFAULT 0,
    joined_at INTEGER NOT NULL,
    FOREIGN KEY (game_id) REFERENCES lds_games(id),
    UNIQUE(game_id, wallet_address)
  );

  -- Rounds table
  CREATE TABLE IF NOT EXISTS lds_rounds (
    id TEXT PRIMARY KEY,
    game_id TEXT NOT NULL,
    round_number INTEGER NOT NULL,
    start_price REAL NOT NULL,
    end_price REAL,
    result TEXT,
    players_alive_before INTEGER NOT NULL,
    players_alive_after INTEGER,
    prediction_deadline INTEGER NOT NULL,
    started_at INTEGER NOT NULL,
    resolved_at INTEGER,
    FOREIGN KEY (game_id) REFERENCES lds_games(id),
    UNIQUE(game_id, round_number)
  );

  -- Predictions table
  CREATE TABLE IF NOT EXISTS lds_predictions (
    id TEXT PRIMARY KEY,
    game_id TEXT NOT NULL,
    round_number INTEGER NOT NULL,
    wallet_address TEXT NOT NULL,
    prediction TEXT,
    correct INTEGER,
    eliminated INTEGER,
    predicted_at INTEGER,
    FOREIGN KEY (game_id) REFERENCES lds_games(id),
    UNIQUE(game_id, round_number, wallet_address)
  );

  -- Indexes for performance
  CREATE INDEX IF NOT EXISTS idx_lds_games_status ON lds_games(status);
  CREATE INDEX IF NOT EXISTS idx_lds_games_scheduled ON lds_games(scheduled_start_time);
  CREATE INDEX IF NOT EXISTS idx_lds_players_game ON lds_players(game_id);
  CREATE INDEX IF NOT EXISTS idx_lds_players_wallet ON lds_players(wallet_address);
  CREATE INDEX IF NOT EXISTS idx_lds_players_status ON lds_players(game_id, status);
  CREATE INDEX IF NOT EXISTS idx_lds_rounds_game ON lds_rounds(game_id);
  CREATE INDEX IF NOT EXISTS idx_lds_predictions_game_round ON lds_predictions(game_id, round_number);
  CREATE INDEX IF NOT EXISTS idx_lds_predictions_wallet ON lds_predictions(wallet_address);
`);

// ============================================
// Prepared Statements
// ============================================

const stmts = {
  // Games
  insertGame: db.prepare(`
    INSERT INTO lds_games (id, status, entry_fee_lamports, scheduled_start_time, prize_pool_lamports, player_count, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `),
  getGame: db.prepare(`SELECT * FROM lds_games WHERE id = ?`),
  getActiveGame: db.prepare(`SELECT * FROM lds_games WHERE status IN ('registering', 'starting', 'in_progress') ORDER BY scheduled_start_time ASC LIMIT 1`),
  getNextScheduledGame: db.prepare(`SELECT * FROM lds_games WHERE status = 'registering' AND scheduled_start_time > ? ORDER BY scheduled_start_time ASC LIMIT 1`),
  getRegisteringGame: db.prepare(`SELECT * FROM lds_games WHERE status = 'registering' ORDER BY scheduled_start_time ASC LIMIT 1`),
  updateGameStatus: db.prepare(`UPDATE lds_games SET status = ? WHERE id = ?`),
  updateGameStart: db.prepare(`UPDATE lds_games SET status = 'in_progress', actual_start_time = ?, current_round = 1 WHERE id = ?`),
  updateGameEnd: db.prepare(`UPDATE lds_games SET status = 'completed', end_time = ? WHERE id = ?`),
  updateGameRound: db.prepare(`UPDATE lds_games SET current_round = ? WHERE id = ?`),
  updateGamePrizePool: db.prepare(`UPDATE lds_games SET prize_pool_lamports = ?, rake_lamports = ?, player_count = ? WHERE id = ?`),
  incrementPlayerCount: db.prepare(`UPDATE lds_games SET player_count = player_count + 1, prize_pool_lamports = prize_pool_lamports + ? WHERE id = ?`),
  decrementPlayerCount: db.prepare(`UPDATE lds_games SET player_count = player_count - 1, prize_pool_lamports = prize_pool_lamports - ? WHERE id = ?`),
  getRecentGames: db.prepare(`SELECT * FROM lds_games WHERE status = 'completed' ORDER BY end_time DESC LIMIT ?`),

  // Players
  insertPlayer: db.prepare(`
    INSERT INTO lds_players (id, game_id, wallet_address, status, payout_lamports, is_free_bet, joined_at)
    VALUES (?, ?, ?, 'alive', 0, ?, ?)
  `),
  getPlayer: db.prepare(`SELECT * FROM lds_players WHERE game_id = ? AND wallet_address = ?`),
  getPlayers: db.prepare(`SELECT * FROM lds_players WHERE game_id = ?`),
  getAlivePlayers: db.prepare(`SELECT * FROM lds_players WHERE game_id = ? AND status = 'alive'`),
  getAlivePlayerCount: db.prepare(`SELECT COUNT(*) as count FROM lds_players WHERE game_id = ? AND status = 'alive'`),
  updatePlayerStatus: db.prepare(`UPDATE lds_players SET status = ?, eliminated_at_round = ? WHERE game_id = ? AND wallet_address = ?`),
  updatePlayerPayout: db.prepare(`UPDATE lds_players SET placement = ?, payout_lamports = ? WHERE game_id = ? AND wallet_address = ?`),
  setPlayerWinner: db.prepare(`UPDATE lds_players SET status = 'winner', placement = 1 WHERE game_id = ? AND wallet_address = ?`),
  removePlayer: db.prepare(`DELETE FROM lds_players WHERE game_id = ? AND wallet_address = ?`),
  isPlayerInAnyGame: db.prepare(`
    SELECT p.* FROM lds_players p
    JOIN lds_games g ON p.game_id = g.id
    WHERE p.wallet_address = ? AND g.status IN ('registering', 'starting', 'in_progress')
  `),
  getPlayerHistory: db.prepare(`
    SELECT p.*, g.player_count as total_players, g.entry_fee_lamports, g.end_time
    FROM lds_players p
    JOIN lds_games g ON p.game_id = g.id
    WHERE p.wallet_address = ? AND g.status = 'completed'
    ORDER BY g.end_time DESC
    LIMIT ?
  `),

  // Rounds
  insertRound: db.prepare(`
    INSERT INTO lds_rounds (id, game_id, round_number, start_price, players_alive_before, prediction_deadline, started_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `),
  getRound: db.prepare(`SELECT * FROM lds_rounds WHERE game_id = ? AND round_number = ?`),
  getRounds: db.prepare(`SELECT * FROM lds_rounds WHERE game_id = ? ORDER BY round_number ASC`),
  getCurrentRound: db.prepare(`SELECT * FROM lds_rounds WHERE game_id = ? ORDER BY round_number DESC LIMIT 1`),
  updateRoundResult: db.prepare(`
    UPDATE lds_rounds SET end_price = ?, result = ?, players_alive_after = ?, resolved_at = ?
    WHERE game_id = ? AND round_number = ?
  `),

  // Predictions
  insertPrediction: db.prepare(`
    INSERT INTO lds_predictions (id, game_id, round_number, wallet_address, prediction, predicted_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `),
  upsertPrediction: db.prepare(`
    INSERT INTO lds_predictions (id, game_id, round_number, wallet_address, prediction, predicted_at)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(game_id, round_number, wallet_address)
    DO UPDATE SET prediction = excluded.prediction, predicted_at = excluded.predicted_at
  `),
  getPrediction: db.prepare(`SELECT * FROM lds_predictions WHERE game_id = ? AND round_number = ? AND wallet_address = ?`),
  getPredictions: db.prepare(`SELECT * FROM lds_predictions WHERE game_id = ? AND round_number = ?`),
  getPredictionCount: db.prepare(`SELECT COUNT(*) as count FROM lds_predictions WHERE game_id = ? AND round_number = ? AND prediction IS NOT NULL`),
  updatePredictionResult: db.prepare(`
    UPDATE lds_predictions SET correct = ?, eliminated = ?
    WHERE game_id = ? AND round_number = ? AND wallet_address = ?
  `),

  // Leaderboard
  getLeaderboard: db.prepare(`
    SELECT
      wallet_address,
      COUNT(*) as games_played,
      SUM(CASE WHEN placement = 1 THEN 1 ELSE 0 END) as wins,
      SUM(payout_lamports) as total_winnings,
      SUM(CASE WHEN payout_lamports > 0 THEN 1 ELSE 0 END) as in_the_money
    FROM lds_players p
    JOIN lds_games g ON p.game_id = g.id
    WHERE g.status = 'completed'
    GROUP BY wallet_address
    ORDER BY total_winnings DESC
    LIMIT ?
  `),
};

// ============================================
// Game Functions
// ============================================

export function createGame(
  entryFeeLamports: number,
  scheduledStartTime: number
): LDSGameRecord {
  const id = `lds_${uuidv4()}`;
  const now = Date.now();

  stmts.insertGame.run(id, 'registering', entryFeeLamports, scheduledStartTime, 0, 0, now);

  return {
    id,
    status: 'registering',
    entryFeeLamports,
    scheduledStartTime,
    actualStartTime: null,
    endTime: null,
    currentRound: 0,
    prizePoolLamports: 0,
    rakeLamports: 0,
    playerCount: 0,
    createdAt: now,
  };
}

export function getGame(gameId: string): LDSGameRecord | null {
  const row = stmts.getGame.get(gameId) as any;
  return row ? rowToGame(row) : null;
}

export function getActiveGame(): LDSGameRecord | null {
  const row = stmts.getActiveGame.get() as any;
  return row ? rowToGame(row) : null;
}

export function getRegisteringGame(): LDSGameRecord | null {
  const row = stmts.getRegisteringGame.get() as any;
  return row ? rowToGame(row) : null;
}

export function getNextScheduledGame(): LDSGameRecord | null {
  const row = stmts.getNextScheduledGame.get(Date.now()) as any;
  return row ? rowToGame(row) : null;
}

export function updateGameStatus(gameId: string, status: LDSGameStatus): void {
  stmts.updateGameStatus.run(status, gameId);
}

export function startGame(gameId: string): void {
  stmts.updateGameStart.run(Date.now(), gameId);
}

export function endGame(gameId: string): void {
  stmts.updateGameEnd.run(Date.now(), gameId);
}

export function updateGameRound(gameId: string, round: number): void {
  stmts.updateGameRound.run(round, gameId);
}

export function updateGamePrizePool(
  gameId: string,
  prizePoolLamports: number,
  rakeLamports: number,
  playerCount: number
): void {
  stmts.updateGamePrizePool.run(prizePoolLamports, rakeLamports, playerCount, gameId);
}

export function getRecentGames(limit: number = 10): LDSGameRecord[] {
  const rows = stmts.getRecentGames.all(limit) as any[];
  return rows.map(rowToGame);
}

function rowToGame(row: any): LDSGameRecord {
  return {
    id: row.id,
    status: row.status,
    entryFeeLamports: row.entry_fee_lamports,
    scheduledStartTime: row.scheduled_start_time,
    actualStartTime: row.actual_start_time,
    endTime: row.end_time,
    currentRound: row.current_round,
    prizePoolLamports: row.prize_pool_lamports,
    rakeLamports: row.rake_lamports,
    playerCount: row.player_count,
    createdAt: row.created_at,
  };
}

// ============================================
// Player Functions
// ============================================

export function addPlayer(gameId: string, walletAddress: string, entryFeeLamports: number, isFreeBet: boolean = false): LDSPlayerRecord {
  const id = `ldsp_${uuidv4()}`;
  const now = Date.now();

  // Use transaction for atomicity
  const addPlayerTx = db.transaction(() => {
    stmts.insertPlayer.run(id, gameId, walletAddress, isFreeBet ? 1 : 0, now);
    stmts.incrementPlayerCount.run(entryFeeLamports, gameId);
  });

  addPlayerTx();

  return {
    id,
    gameId,
    walletAddress,
    status: 'alive',
    eliminatedAtRound: null,
    placement: null,
    payoutLamports: 0,
    isFreeBet,
    joinedAt: now,
  };
}

export function getPlayer(gameId: string, walletAddress: string): LDSPlayerRecord | null {
  const row = stmts.getPlayer.get(gameId, walletAddress) as any;
  return row ? rowToPlayer(row) : null;
}

export function getPlayers(gameId: string): LDSPlayerRecord[] {
  const rows = stmts.getPlayers.all(gameId) as any[];
  return rows.map(rowToPlayer);
}

export function getAlivePlayers(gameId: string): LDSPlayerRecord[] {
  const rows = stmts.getAlivePlayers.all(gameId) as any[];
  return rows.map(rowToPlayer);
}

export function getAlivePlayerCount(gameId: string): number {
  const row = stmts.getAlivePlayerCount.get(gameId) as any;
  return row?.count || 0;
}

export function eliminatePlayer(gameId: string, walletAddress: string, round: number): void {
  stmts.updatePlayerStatus.run('eliminated', round, gameId, walletAddress);
}

export function setPlayerPayout(gameId: string, walletAddress: string, placement: number, payoutLamports: number): void {
  stmts.updatePlayerPayout.run(placement, payoutLamports, gameId, walletAddress);
}

export function setPlayerWinner(gameId: string, walletAddress: string): void {
  stmts.setPlayerWinner.run(gameId, walletAddress);
}

export function removePlayer(gameId: string, walletAddress: string, entryFeeLamports: number): boolean {
  const removePlayerTx = db.transaction(() => {
    const result = stmts.removePlayer.run(gameId, walletAddress);
    if (result.changes > 0) {
      stmts.decrementPlayerCount.run(entryFeeLamports, gameId);
    }
    return result.changes > 0;
  });

  return removePlayerTx();
}

export function isPlayerInAnyActiveGame(walletAddress: string): boolean {
  const row = stmts.isPlayerInAnyGame.get(walletAddress);
  return !!row;
}

export function getPlayerActiveGame(walletAddress: string): { gameId: string; status: LDSPlayerStatus } | null {
  const row = stmts.isPlayerInAnyGame.get(walletAddress) as any;
  return row ? { gameId: row.game_id, status: row.status } : null;
}

export function getPlayerHistory(walletAddress: string, limit: number = 20): LDSHistoryRecord[] {
  const rows = stmts.getPlayerHistory.all(walletAddress, limit) as any[];
  return rows.map(row => ({
    gameId: row.game_id,
    walletAddress: row.wallet_address,
    playerCount: row.total_players,
    placement: row.placement || 0,
    payoutLamports: row.payout_lamports,
    entryFeeLamports: row.entry_fee_lamports,
    roundsSurvived: row.eliminated_at_round || 0,
    playedAt: row.end_time,
  }));
}

function rowToPlayer(row: any): LDSPlayerRecord {
  return {
    id: row.id,
    gameId: row.game_id,
    walletAddress: row.wallet_address,
    status: row.status,
    eliminatedAtRound: row.eliminated_at_round,
    placement: row.placement,
    payoutLamports: row.payout_lamports,
    isFreeBet: row.is_free_bet === 1,
    joinedAt: row.joined_at,
  };
}

// ============================================
// Round Functions
// ============================================

export function createRound(
  gameId: string,
  roundNumber: number,
  startPrice: number,
  playersAliveBefore: number,
  predictionDeadline: number
): LDSRoundRecord {
  const id = `ldsr_${uuidv4()}`;
  const now = Date.now();

  stmts.insertRound.run(id, gameId, roundNumber, startPrice, playersAliveBefore, predictionDeadline, now);

  return {
    id,
    gameId,
    roundNumber,
    startPrice,
    endPrice: null,
    result: null,
    playersAliveBefore,
    playersAliveAfter: null,
    predictionDeadline,
    startedAt: now,
    resolvedAt: null,
  };
}

export function getRound(gameId: string, roundNumber: number): LDSRoundRecord | null {
  const row = stmts.getRound.get(gameId, roundNumber) as any;
  return row ? rowToRound(row) : null;
}

export function getRounds(gameId: string): LDSRoundRecord[] {
  const rows = stmts.getRounds.all(gameId) as any[];
  return rows.map(rowToRound);
}

export function getCurrentRound(gameId: string): LDSRoundRecord | null {
  const row = stmts.getCurrentRound.get(gameId) as any;
  return row ? rowToRound(row) : null;
}

export function resolveRound(
  gameId: string,
  roundNumber: number,
  endPrice: number,
  result: LDSRoundResult,
  playersAliveAfter: number
): void {
  stmts.updateRoundResult.run(endPrice, result, playersAliveAfter, Date.now(), gameId, roundNumber);
}

function rowToRound(row: any): LDSRoundRecord {
  return {
    id: row.id,
    gameId: row.game_id,
    roundNumber: row.round_number,
    startPrice: row.start_price,
    endPrice: row.end_price,
    result: row.result,
    playersAliveBefore: row.players_alive_before,
    playersAliveAfter: row.players_alive_after,
    predictionDeadline: row.prediction_deadline,
    startedAt: row.started_at,
    resolvedAt: row.resolved_at,
  };
}

// ============================================
// Prediction Functions
// ============================================

export function recordPrediction(
  gameId: string,
  roundNumber: number,
  walletAddress: string,
  prediction: LDSPrediction
): void {
  const id = `ldspred_${uuidv4()}`;
  stmts.upsertPrediction.run(id, gameId, roundNumber, walletAddress, prediction, Date.now());
}

export function getPrediction(
  gameId: string,
  roundNumber: number,
  walletAddress: string
): LDSPredictionRecord | null {
  const row = stmts.getPrediction.get(gameId, roundNumber, walletAddress) as any;
  return row ? rowToPrediction(row) : null;
}

export function getPredictions(gameId: string, roundNumber: number): LDSPredictionRecord[] {
  const rows = stmts.getPredictions.all(gameId, roundNumber) as any[];
  return rows.map(rowToPrediction);
}

export function getPredictionCount(gameId: string, roundNumber: number): number {
  const row = stmts.getPredictionCount.get(gameId, roundNumber) as any;
  return row?.count || 0;
}

export function updatePredictionResult(
  gameId: string,
  roundNumber: number,
  walletAddress: string,
  correct: boolean,
  eliminated: boolean
): void {
  stmts.updatePredictionResult.run(correct ? 1 : 0, eliminated ? 1 : 0, gameId, roundNumber, walletAddress);
}

function rowToPrediction(row: any): LDSPredictionRecord {
  return {
    id: row.id,
    gameId: row.game_id,
    roundNumber: row.round_number,
    walletAddress: row.wallet_address,
    prediction: row.prediction,
    correct: row.correct === null ? null : row.correct === 1,
    eliminated: row.eliminated === null ? null : row.eliminated === 1,
    predictedAt: row.predicted_at,
  };
}

// ============================================
// Leaderboard Functions
// ============================================

export interface LDSLeaderboardEntry {
  walletAddress: string;
  gamesPlayed: number;
  wins: number;
  totalWinnings: number;
  inTheMoney: number;
  winRate: number;
}

export function getLeaderboard(limit: number = 50): LDSLeaderboardEntry[] {
  const rows = stmts.getLeaderboard.all(limit) as any[];
  return rows.map(row => ({
    walletAddress: row.wallet_address,
    gamesPlayed: row.games_played,
    wins: row.wins,
    totalWinnings: row.total_winnings,
    inTheMoney: row.in_the_money,
    winRate: row.games_played > 0 ? (row.wins / row.games_played) * 100 : 0,
  }));
}

// ============================================
// Utility Functions
// ============================================

export function getPlayerStats(walletAddress: string): {
  gamesPlayed: number;
  wins: number;
  totalWinnings: number;
  bestPlacement: number;
  avgPlacement: number;
} {
  const history = getPlayerHistory(walletAddress, 100);

  if (history.length === 0) {
    return {
      gamesPlayed: 0,
      wins: 0,
      totalWinnings: 0,
      bestPlacement: 0,
      avgPlacement: 0,
    };
  }

  const wins = history.filter(h => h.placement === 1).length;
  const totalWinnings = history.reduce((sum, h) => sum + h.payoutLamports, 0);
  const placements = history.filter(h => h.placement > 0).map(h => h.placement);
  const bestPlacement = placements.length > 0 ? Math.min(...placements) : 0;
  const avgPlacement = placements.length > 0 ? placements.reduce((a, b) => a + b, 0) / placements.length : 0;

  return {
    gamesPlayed: history.length,
    wins,
    totalWinnings,
    bestPlacement,
    avgPlacement: Math.round(avgPlacement * 10) / 10,
  };
}
