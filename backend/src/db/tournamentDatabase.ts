import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

const DATA_DIR = path.join(__dirname, '../../data');
const DB_PATH = path.join(DATA_DIR, 'tournaments.db');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

// Schema
db.exec(`
  -- Bracket Tournaments
  CREATE TABLE IF NOT EXISTS tournaments (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    format TEXT NOT NULL DEFAULT 'single_elimination',
    size INTEGER NOT NULL,
    entry_fee_lamports INTEGER NOT NULL,
    scheduled_start_time INTEGER NOT NULL,
    registration_opens INTEGER NOT NULL,
    registration_closes INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'upcoming',
    prize_pool_lamports INTEGER DEFAULT 0,
    created_at INTEGER NOT NULL
  );

  -- Tournament registrations
  CREATE TABLE IF NOT EXISTS tournament_registrations (
    tournament_id TEXT NOT NULL,
    wallet_address TEXT NOT NULL,
    seed INTEGER,
    entry_fee_paid_lamports INTEGER NOT NULL,
    registered_at INTEGER NOT NULL,
    PRIMARY KEY (tournament_id, wallet_address),
    FOREIGN KEY (tournament_id) REFERENCES tournaments(id)
  );

  -- Tournament matches (bracket structure)
  CREATE TABLE IF NOT EXISTS tournament_matches (
    id TEXT PRIMARY KEY,
    tournament_id TEXT NOT NULL,
    round INTEGER NOT NULL,
    position INTEGER NOT NULL,
    player1_wallet TEXT,
    player2_wallet TEXT,
    winner_wallet TEXT,
    battle_id TEXT,
    scheduled_time INTEGER,
    status TEXT NOT NULL DEFAULT 'pending',
    FOREIGN KEY (tournament_id) REFERENCES tournaments(id),
    UNIQUE(tournament_id, round, position)
  );

  -- Tournament payouts
  CREATE TABLE IF NOT EXISTS tournament_payouts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tournament_id TEXT NOT NULL,
    wallet_address TEXT NOT NULL,
    place INTEGER NOT NULL,
    payout_lamports INTEGER NOT NULL,
    tx_signature TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at INTEGER NOT NULL,
    FOREIGN KEY (tournament_id) REFERENCES tournaments(id)
  );

  CREATE INDEX IF NOT EXISTS idx_tournaments_status ON tournaments(status);
  CREATE INDEX IF NOT EXISTS idx_tournaments_start ON tournaments(scheduled_start_time);
  CREATE INDEX IF NOT EXISTS idx_matches_tournament ON tournament_matches(tournament_id);
  CREATE INDEX IF NOT EXISTS idx_matches_status ON tournament_matches(status);

  -- Tournament leaderboard (aggregated stats)
  CREATE TABLE IF NOT EXISTS tournament_leaderboard (
    wallet_address TEXT PRIMARY KEY,
    tournaments_entered INTEGER DEFAULT 0,
    tournaments_won INTEGER DEFAULT 0,
    total_matches_played INTEGER DEFAULT 0,
    total_matches_won INTEGER DEFAULT 0,
    total_earnings_lamports INTEGER DEFAULT 0,
    best_finish INTEGER,
    last_tournament_at INTEGER,
    updated_at INTEGER NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_leaderboard_earnings ON tournament_leaderboard(total_earnings_lamports DESC);
  CREATE INDEX IF NOT EXISTS idx_leaderboard_wins ON tournament_leaderboard(tournaments_won DESC);
`);

// Types
export type TournamentStatus = 'upcoming' | 'registration_open' | 'in_progress' | 'completed' | 'cancelled';
export type TournamentMatchStatus = 'pending' | 'ready' | 'in_progress' | 'completed';

export interface Tournament {
  id: string;
  name: string;
  format: 'single_elimination';
  size: 8 | 16;
  entryFeeLamports: number;
  scheduledStartTime: number;
  registrationOpens: number;
  registrationCloses: number;
  status: TournamentStatus;
  prizePoolLamports: number;
  createdAt: number;
}

export interface TournamentRegistration {
  tournamentId: string;
  walletAddress: string;
  seed: number | null;
  entryFeePaidLamports: number;
  registeredAt: number;
}

export interface TournamentMatch {
  id: string;
  tournamentId: string;
  round: number;
  position: number;
  player1Wallet: string | null;
  player2Wallet: string | null;
  winnerWallet: string | null;
  battleId: string | null;
  scheduledTime: number | null;
  status: TournamentMatchStatus;
}

export interface TournamentLeaderboardEntry {
  rank: number;
  walletAddress: string;
  tournamentsEntered: number;
  tournamentsWon: number;
  totalMatchesPlayed: number;
  totalMatchesWon: number;
  totalEarningsLamports: number;
  bestFinish: number | null;
  lastTournamentAt: number | null;
}

// Prepared statements
const insertTournament = db.prepare(`
  INSERT INTO tournaments (id, name, format, size, entry_fee_lamports, scheduled_start_time, registration_opens, registration_closes, status, prize_pool_lamports, created_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const getTournamentById = db.prepare(`SELECT * FROM tournaments WHERE id = ?`);
const getUpcomingTournaments = db.prepare(`
  SELECT * FROM tournaments WHERE status IN ('upcoming', 'registration_open') ORDER BY scheduled_start_time ASC
`);
const getActiveTournaments = db.prepare(`
  SELECT * FROM tournaments WHERE status = 'in_progress'
`);
const updateTournamentStatus = db.prepare(`UPDATE tournaments SET status = ? WHERE id = ?`);
const updatePrizePool = db.prepare(`UPDATE tournaments SET prize_pool_lamports = ? WHERE id = ?`);

const insertRegistration = db.prepare(`
  INSERT INTO tournament_registrations (tournament_id, wallet_address, seed, entry_fee_paid_lamports, registered_at)
  VALUES (?, ?, ?, ?, ?)
`);
const getRegistrations = db.prepare(`
  SELECT * FROM tournament_registrations WHERE tournament_id = ? ORDER BY registered_at ASC
`);
const getRegistrationCount = db.prepare(`
  SELECT COUNT(*) as count FROM tournament_registrations WHERE tournament_id = ?
`);
const isPlayerRegistered = db.prepare(`
  SELECT 1 FROM tournament_registrations WHERE tournament_id = ? AND wallet_address = ?
`);
const updateSeedStmt = db.prepare(`
  UPDATE tournament_registrations SET seed = ? WHERE tournament_id = ? AND wallet_address = ?
`);

const insertMatch = db.prepare(`
  INSERT INTO tournament_matches (id, tournament_id, round, position, player1_wallet, player2_wallet, winner_wallet, battle_id, scheduled_time, status)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);
const getMatches = db.prepare(`
  SELECT * FROM tournament_matches WHERE tournament_id = ? ORDER BY round ASC, position ASC
`);
const getMatchById = db.prepare(`SELECT * FROM tournament_matches WHERE id = ?`);
const getMatchByRoundPosition = db.prepare(`
  SELECT * FROM tournament_matches WHERE tournament_id = ? AND round = ? AND position = ?
`);
const updateMatchWinnerStmt = db.prepare(`
  UPDATE tournament_matches SET winner_wallet = ?, status = 'completed' WHERE id = ?
`);
const updateMatchStatusStmt = db.prepare(`UPDATE tournament_matches SET status = ? WHERE id = ?`);
const updateMatchBattle = db.prepare(`UPDATE tournament_matches SET battle_id = ?, status = 'in_progress' WHERE id = ?`);
const setMatchPlayersStmt = db.prepare(`
  UPDATE tournament_matches SET player1_wallet = ?, player2_wallet = ? WHERE id = ?
`);
const updatePlayer1Stmt = db.prepare(`UPDATE tournament_matches SET player1_wallet = ? WHERE id = ?`);
const updatePlayer2Stmt = db.prepare(`UPDATE tournament_matches SET player2_wallet = ? WHERE id = ?`);

// Leaderboard prepared statements
const getLeaderboardStmt = db.prepare(`
  SELECT * FROM tournament_leaderboard
  ORDER BY total_earnings_lamports DESC
  LIMIT ? OFFSET ?
`);

const getLeaderboardByWinsStmt = db.prepare(`
  SELECT * FROM tournament_leaderboard
  ORDER BY tournaments_won DESC, total_earnings_lamports DESC
  LIMIT ? OFFSET ?
`);

const getPlayerStatsStmt = db.prepare(`
  SELECT * FROM tournament_leaderboard WHERE wallet_address = ?
`);

const upsertLeaderboardStmt = db.prepare(`
  INSERT INTO tournament_leaderboard (
    wallet_address, tournaments_entered, tournaments_won,
    total_matches_played, total_matches_won, total_earnings_lamports,
    best_finish, last_tournament_at, updated_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(wallet_address) DO UPDATE SET
    tournaments_entered = tournaments_entered + excluded.tournaments_entered,
    tournaments_won = tournaments_won + excluded.tournaments_won,
    total_matches_played = total_matches_played + excluded.total_matches_played,
    total_matches_won = total_matches_won + excluded.total_matches_won,
    total_earnings_lamports = total_earnings_lamports + excluded.total_earnings_lamports,
    best_finish = CASE
      WHEN excluded.best_finish IS NOT NULL AND (best_finish IS NULL OR excluded.best_finish < best_finish)
      THEN excluded.best_finish
      ELSE best_finish
    END,
    last_tournament_at = excluded.last_tournament_at,
    updated_at = excluded.updated_at
`);

const getLeaderboardCountStmt = db.prepare(`
  SELECT COUNT(*) as count FROM tournament_leaderboard
`);

// Functions
export function createTournament(
  name: string,
  size: 8 | 16,
  entryFeeLamports: number,
  scheduledStartTime: number,
  registrationOpens: number,
  registrationCloses: number
): Tournament {
  const id = uuidv4();
  const now = Date.now();

  insertTournament.run(
    id, name, 'single_elimination', size, entryFeeLamports,
    scheduledStartTime, registrationOpens, registrationCloses,
    'upcoming', 0, now
  );

  return {
    id, name, format: 'single_elimination', size,
    entryFeeLamports, scheduledStartTime, registrationOpens, registrationCloses,
    status: 'upcoming', prizePoolLamports: 0, createdAt: now
  };
}

export function getTournament(id: string): Tournament | null {
  const row = getTournamentById.get(id) as any;
  return row ? mapTournamentRow(row) : null;
}

export function getUpcoming(): Tournament[] {
  return (getUpcomingTournaments.all() as any[]).map(mapTournamentRow);
}

export function getActive(): Tournament[] {
  return (getActiveTournaments.all() as any[]).map(mapTournamentRow);
}

export function setStatus(id: string, status: TournamentStatus): void {
  updateTournamentStatus.run(status, id);
}

export function setPrizePool(id: string, lamports: number): void {
  updatePrizePool.run(lamports, id);
}

export function registerPlayer(tournamentId: string, wallet: string, feePaid: number): void {
  insertRegistration.run(tournamentId, wallet, null, feePaid, Date.now());
}

export function getPlayerCount(tournamentId: string): number {
  const row = getRegistrationCount.get(tournamentId) as any;
  return row?.count || 0;
}

export function isRegistered(tournamentId: string, wallet: string): boolean {
  return !!isPlayerRegistered.get(tournamentId, wallet);
}

export function getRegisteredPlayers(tournamentId: string): TournamentRegistration[] {
  return (getRegistrations.all(tournamentId) as any[]).map(mapRegistrationRow);
}

export function setSeed(tournamentId: string, wallet: string, seed: number): void {
  updateSeedStmt.run(seed, tournamentId, wallet);
}

export function createMatch(
  tournamentId: string,
  round: number,
  position: number,
  player1: string | null,
  player2: string | null,
  scheduledTime: number | null
): TournamentMatch {
  const id = uuidv4();
  insertMatch.run(id, tournamentId, round, position, player1, player2, null, null, scheduledTime, 'pending');
  return {
    id, tournamentId, round, position,
    player1Wallet: player1, player2Wallet: player2,
    winnerWallet: null, battleId: null, scheduledTime, status: 'pending'
  };
}

export function getMatchesByTournament(tournamentId: string): TournamentMatch[] {
  return (getMatches.all(tournamentId) as any[]).map(mapMatchRow);
}

export function getMatch(id: string): TournamentMatch | null {
  const row = getMatchById.get(id) as any;
  return row ? mapMatchRow(row) : null;
}

export function getMatchAtPosition(tournamentId: string, round: number, position: number): TournamentMatch | null {
  const row = getMatchByRoundPosition.get(tournamentId, round, position) as any;
  return row ? mapMatchRow(row) : null;
}

export function setMatchWinner(matchId: string, winnerWallet: string): void {
  updateMatchWinnerStmt.run(winnerWallet, matchId);
}

export function setMatchStatus(matchId: string, status: TournamentMatchStatus): void {
  updateMatchStatusStmt.run(status, matchId);
}

export function linkBattleToMatch(matchId: string, battleId: string): void {
  updateMatchBattle.run(battleId, matchId);
}

export function updateMatchPlayers(matchId: string, player1: string, player2: string): void {
  setMatchPlayersStmt.run(player1, player2, matchId);
}

// Use transaction for atomic bracket advancement
export function advanceWinner(matchId: string, winnerWallet: string): TournamentMatch | null {
  const advanceTransaction = db.transaction((mId: string, wWallet: string) => {
    const match = getMatch(mId);
    if (!match) throw new Error('Match not found');

    // Set winner on current match
    setMatchWinner(mId, wWallet);

    // Find next round match
    const nextRound = match.round + 1;
    const nextPosition = Math.floor(match.position / 2);
    const nextMatch = getMatchAtPosition(match.tournamentId, nextRound, nextPosition);

    if (nextMatch) {
      // Determine if winner goes to player1 or player2 slot
      const isPlayer1Slot = match.position % 2 === 0;
      if (isPlayer1Slot) {
        updatePlayer1Stmt.run(wWallet, nextMatch.id);
      } else {
        updatePlayer2Stmt.run(wWallet, nextMatch.id);
      }

      // Check if next match is now ready (both players present)
      const updated = getMatch(nextMatch.id);
      if (updated && updated.player1Wallet && updated.player2Wallet) {
        setMatchStatus(nextMatch.id, 'ready');
      }
    }

    return nextMatch;
  });

  return advanceTransaction(matchId, winnerWallet);
}

// Leaderboard functions
export function getLeaderboard(
  limit: number = 50,
  offset: number = 0,
  sortBy: 'earnings' | 'wins' = 'earnings'
): TournamentLeaderboardEntry[] {
  const stmt = sortBy === 'wins' ? getLeaderboardByWinsStmt : getLeaderboardStmt;
  const rows = stmt.all(limit, offset) as any[];

  return rows.map((row, index) => ({
    rank: offset + index + 1,
    walletAddress: row.wallet_address,
    tournamentsEntered: row.tournaments_entered,
    tournamentsWon: row.tournaments_won,
    totalMatchesPlayed: row.total_matches_played,
    totalMatchesWon: row.total_matches_won,
    totalEarningsLamports: row.total_earnings_lamports,
    bestFinish: row.best_finish,
    lastTournamentAt: row.last_tournament_at
  }));
}

export function getPlayerTournamentStats(walletAddress: string): TournamentLeaderboardEntry | null {
  const row = getPlayerStatsStmt.get(walletAddress) as any;
  if (!row) return null;

  return {
    rank: 0, // Would need separate query to determine rank
    walletAddress: row.wallet_address,
    tournamentsEntered: row.tournaments_entered,
    tournamentsWon: row.tournaments_won,
    totalMatchesPlayed: row.total_matches_played,
    totalMatchesWon: row.total_matches_won,
    totalEarningsLamports: row.total_earnings_lamports,
    bestFinish: row.best_finish,
    lastTournamentAt: row.last_tournament_at
  };
}

export function updateLeaderboardEntry(
  walletAddress: string,
  tournamentsEntered: number,
  tournamentsWon: number,
  matchesPlayed: number,
  matchesWon: number,
  earnings: number,
  finish: number | null
): void {
  const now = Date.now();
  upsertLeaderboardStmt.run(
    walletAddress,
    tournamentsEntered,
    tournamentsWon,
    matchesPlayed,
    matchesWon,
    earnings,
    finish,
    now,
    now
  );
}

export function getLeaderboardCount(): number {
  const row = getLeaderboardCountStmt.get() as any;
  return row?.count || 0;
}

function mapTournamentRow(row: any): Tournament {
  return {
    id: row.id,
    name: row.name,
    format: row.format,
    size: row.size,
    entryFeeLamports: row.entry_fee_lamports,
    scheduledStartTime: row.scheduled_start_time,
    registrationOpens: row.registration_opens,
    registrationCloses: row.registration_closes,
    status: row.status,
    prizePoolLamports: row.prize_pool_lamports,
    createdAt: row.created_at
  };
}

function mapRegistrationRow(row: any): TournamentRegistration {
  return {
    tournamentId: row.tournament_id,
    walletAddress: row.wallet_address,
    seed: row.seed,
    entryFeePaidLamports: row.entry_fee_paid_lamports,
    registeredAt: row.registered_at
  };
}

function mapMatchRow(row: any): TournamentMatch {
  return {
    id: row.id,
    tournamentId: row.tournament_id,
    round: row.round,
    position: row.position,
    player1Wallet: row.player1_wallet,
    player2Wallet: row.player2_wallet,
    winnerWallet: row.winner_wallet,
    battleId: row.battle_id,
    scheduledTime: row.scheduled_time,
    status: row.status
  };
}
