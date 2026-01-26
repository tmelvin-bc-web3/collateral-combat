import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import {
  DraftTournament,
  DraftTournamentTier,
  DraftTournamentStatus,
  DraftEntry,
  DraftPick,
  PowerUpUsage,
  PowerUpType,
  Memecoin,
  DRAFT_TIER_TO_LAMPORTS,
} from '../types';

const DATA_DIR = path.join(__dirname, '../../data');
const DB_PATH = path.join(DATA_DIR, 'draft.db');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Initialize database
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

// Create tables
db.exec(`
  -- Tournaments (one per week per tier)
  CREATE TABLE IF NOT EXISTS draft_tournaments (
    id TEXT PRIMARY KEY,
    tier TEXT NOT NULL,
    entry_fee_usd INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'upcoming',
    week_start_utc INTEGER NOT NULL,
    week_end_utc INTEGER NOT NULL,
    draft_deadline_utc INTEGER NOT NULL,
    total_entries INTEGER DEFAULT 0,
    prize_pool_usd REAL DEFAULT 0,
    created_at INTEGER NOT NULL,
    settled_at INTEGER
  );

  -- Tournament entries
  CREATE TABLE IF NOT EXISTS draft_entries (
    id TEXT PRIMARY KEY,
    tournament_id TEXT NOT NULL,
    wallet_address TEXT NOT NULL,
    entry_fee_paid REAL NOT NULL,
    draft_completed INTEGER DEFAULT 0,
    final_score REAL,
    final_rank INTEGER,
    payout_usd REAL,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (tournament_id) REFERENCES draft_tournaments(id),
    UNIQUE(tournament_id, wallet_address)
  );

  -- Drafted coins for each entry
  CREATE TABLE IF NOT EXISTS draft_picks (
    id TEXT PRIMARY KEY,
    entry_id TEXT NOT NULL,
    coin_id TEXT NOT NULL,
    coin_symbol TEXT NOT NULL,
    coin_name TEXT NOT NULL,
    coin_logo_url TEXT,
    pick_order INTEGER NOT NULL,
    price_at_draft REAL NOT NULL,
    price_at_end REAL,
    percent_change REAL,
    boost_multiplier REAL DEFAULT 1.0,
    is_frozen INTEGER DEFAULT 0,
    frozen_at_price REAL,
    frozen_percent_change REAL,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (entry_id) REFERENCES draft_entries(id)
  );

  -- Power-up usage tracking
  CREATE TABLE IF NOT EXISTS draft_powerups (
    id TEXT PRIMARY KEY,
    entry_id TEXT NOT NULL,
    powerup_type TEXT NOT NULL,
    used_at INTEGER NOT NULL,
    target_pick_id TEXT,
    details TEXT,
    FOREIGN KEY (entry_id) REFERENCES draft_entries(id),
    FOREIGN KEY (target_pick_id) REFERENCES draft_picks(id)
  );

  -- Track available coins for drafting (cached from CMC)
  CREATE TABLE IF NOT EXISTS memecoin_pool (
    id TEXT PRIMARY KEY,
    symbol TEXT NOT NULL,
    name TEXT NOT NULL,
    market_cap_rank INTEGER NOT NULL,
    current_price REAL NOT NULL,
    price_change_24h REAL,
    logo_url TEXT,
    last_updated INTEGER NOT NULL
  );

  -- Indexes for performance
  CREATE INDEX IF NOT EXISTS idx_entries_tournament ON draft_entries(tournament_id);
  CREATE INDEX IF NOT EXISTS idx_entries_wallet ON draft_entries(wallet_address);
  CREATE INDEX IF NOT EXISTS idx_picks_entry ON draft_picks(entry_id);
  CREATE INDEX IF NOT EXISTS idx_powerups_entry ON draft_powerups(entry_id);
  CREATE INDEX IF NOT EXISTS idx_tournaments_status ON draft_tournaments(status);
  CREATE INDEX IF NOT EXISTS idx_tournaments_week ON draft_tournaments(week_start_utc);
`);

// Re-export types for backward compatibility
export type { DraftTournament, DraftTournamentTier, DraftTournamentStatus, DraftEntry, DraftPick, PowerUpUsage, PowerUpType, Memecoin };

// ===================
// Tournament Operations
// ===================

const insertTournament = db.prepare(`
  INSERT INTO draft_tournaments (id, tier, entry_fee_usd, status, week_start_utc, week_end_utc, draft_deadline_utc, total_entries, prize_pool_usd, created_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const getTournamentById = db.prepare(`
  SELECT * FROM draft_tournaments WHERE id = ?
`);

const getTournamentsByStatus = db.prepare(`
  SELECT * FROM draft_tournaments WHERE status = ?
`);

const getTournamentByTierAndWeek = db.prepare(`
  SELECT * FROM draft_tournaments WHERE tier = ? AND week_start_utc = ?
`);

const getActiveTournaments = db.prepare(`
  SELECT * FROM draft_tournaments WHERE status IN ('upcoming', 'drafting', 'active')
`);

const updateTournamentStatus = db.prepare(`
  UPDATE draft_tournaments SET status = ? WHERE id = ?
`);

const updateTournamentSettled = db.prepare(`
  UPDATE draft_tournaments SET status = 'completed', settled_at = ? WHERE id = ?
`);

const incrementTournamentEntries = db.prepare(`
  UPDATE draft_tournaments
  SET total_entries = total_entries + 1, prize_pool_usd = prize_pool_usd + ?
  WHERE id = ?
`);

export function createTournament(
  tier: DraftTournamentTier,
  weekStartUtc: number,
  weekEndUtc: number,
  draftDeadlineUtc: number
): DraftTournament {
  const id = uuidv4();
  // Use the lamports mapping from types.ts
  const entryFeeLamports = DRAFT_TIER_TO_LAMPORTS[tier];
  const now = Date.now();

  // Note: DB columns still named _usd for backwards compat, but values are now lamports
  insertTournament.run(id, tier, entryFeeLamports, 'upcoming', weekStartUtc, weekEndUtc, draftDeadlineUtc, 0, 0, now);

  return {
    id,
    tier,
    entryFeeLamports,
    status: 'upcoming',
    weekStartUtc,
    weekEndUtc,
    draftDeadlineUtc,
    totalEntries: 0,
    prizePoolLamports: 0,
    createdAt: now,
  };
}

export function getTournament(id: string): DraftTournament | null {
  const row = getTournamentById.get(id) as any;
  if (!row) return null;
  return mapTournamentRow(row);
}

export function getTournamentForTierAndWeek(tier: DraftTournamentTier, weekStartUtc: number): DraftTournament | null {
  const row = getTournamentByTierAndWeek.get(tier, weekStartUtc) as any;
  if (!row) return null;
  return mapTournamentRow(row);
}

export function getAllActiveTournaments(): DraftTournament[] {
  const rows = getActiveTournaments.all() as any[];
  return rows.map(mapTournamentRow);
}

export function setTournamentStatus(id: string, status: DraftTournamentStatus): void {
  updateTournamentStatus.run(status, id);
}

export function settleTournament(id: string): void {
  updateTournamentSettled.run(Date.now(), id);
}

function mapTournamentRow(row: any): DraftTournament {
  return {
    id: row.id,
    tier: row.tier as DraftTournamentTier,
    // Map DB column (still named _usd) to new lamports property
    entryFeeLamports: row.entry_fee_usd,
    status: row.status as DraftTournamentStatus,
    weekStartUtc: row.week_start_utc,
    weekEndUtc: row.week_end_utc,
    draftDeadlineUtc: row.draft_deadline_utc,
    totalEntries: row.total_entries,
    prizePoolLamports: row.prize_pool_usd,
    createdAt: row.created_at,
    settledAt: row.settled_at || undefined,
  };
}

// ===================
// Entry Operations
// ===================

const insertEntry = db.prepare(`
  INSERT INTO draft_entries (id, tournament_id, wallet_address, entry_fee_paid, draft_completed, created_at)
  VALUES (?, ?, ?, ?, 0, ?)
`);

const getEntryById = db.prepare(`
  SELECT * FROM draft_entries WHERE id = ?
`);

const getEntryByTournamentAndWallet = db.prepare(`
  SELECT * FROM draft_entries WHERE tournament_id = ? AND wallet_address = ?
`);

const getEntriesByTournament = db.prepare(`
  SELECT * FROM draft_entries WHERE tournament_id = ? ORDER BY final_score DESC
`);

const getEntriesByWallet = db.prepare(`
  SELECT * FROM draft_entries WHERE wallet_address = ? ORDER BY created_at DESC
`);

const updateEntryDraftCompleted = db.prepare(`
  UPDATE draft_entries SET draft_completed = 1 WHERE id = ?
`);

const updateEntryScore = db.prepare(`
  UPDATE draft_entries SET final_score = ? WHERE id = ?
`);

const updateEntryRankAndPayout = db.prepare(`
  UPDATE draft_entries SET final_rank = ?, payout_usd = ? WHERE id = ?
`);

export function createEntry(tournamentId: string, walletAddress: string, entryFeePaidLamports: number): DraftEntry {
  const id = uuidv4();
  const now = Date.now();

  insertEntry.run(id, tournamentId, walletAddress, entryFeePaidLamports, now);
  // Note: We no longer auto-increment prize pool here - done separately via incrementPrizePool

  return {
    id,
    tournamentId,
    walletAddress,
    entryFeePaidLamports,
    draftCompleted: false,
    picks: [],
    powerUpsUsed: [],
    createdAt: now,
  };
}

// Increment prize pool for a tournament (called when entry fee is collected)
export function incrementPrizePool(tournamentId: string, amountLamports: number): void {
  incrementTournamentEntries.run(amountLamports, tournamentId);
}

export function getEntry(id: string): DraftEntry | null {
  const row = getEntryById.get(id) as any;
  if (!row) return null;
  return mapEntryRow(row);
}

export function getEntryForTournamentAndWallet(tournamentId: string, walletAddress: string): DraftEntry | null {
  const row = getEntryByTournamentAndWallet.get(tournamentId, walletAddress) as any;
  if (!row) return null;
  return mapEntryRow(row);
}

export function getEntriesForTournament(tournamentId: string): DraftEntry[] {
  const rows = getEntriesByTournament.all(tournamentId) as any[];
  return rows.map(mapEntryRow);
}

export function getEntriesForWallet(walletAddress: string): DraftEntry[] {
  const rows = getEntriesByWallet.all(walletAddress) as any[];
  return rows.map(mapEntryRow);
}

export function markDraftCompleted(entryId: string): void {
  updateEntryDraftCompleted.run(entryId);
}

export function setEntryScore(entryId: string, score: number): void {
  updateEntryScore.run(score, entryId);
}

export function setEntryRankAndPayout(entryId: string, rank: number, payout: number): void {
  updateEntryRankAndPayout.run(rank, payout, entryId);
}

function mapEntryRow(row: any): DraftEntry {
  return {
    id: row.id,
    tournamentId: row.tournament_id,
    walletAddress: row.wallet_address,
    // Map to new property name
    entryFeePaidLamports: row.entry_fee_paid,
    draftCompleted: Boolean(row.draft_completed),
    picks: [], // Populated by getFullEntry in manager
    powerUpsUsed: [], // Populated by getFullEntry in manager
    finalScore: row.final_score ?? undefined,
    finalRank: row.final_rank ?? undefined,
    payoutLamports: row.payout_usd ?? undefined, // Map old column to new name
    createdAt: row.created_at,
  };
}

// ===================
// Pick Operations
// ===================

const insertPick = db.prepare(`
  INSERT INTO draft_picks (id, entry_id, coin_id, coin_symbol, coin_name, coin_logo_url, pick_order, price_at_draft, boost_multiplier, is_frozen, created_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1.0, 0, ?)
`);

const getPickById = db.prepare(`
  SELECT * FROM draft_picks WHERE id = ?
`);

const getPicksByEntry = db.prepare(`
  SELECT * FROM draft_picks WHERE entry_id = ? ORDER BY pick_order
`);

const updatePickBoost = db.prepare(`
  UPDATE draft_picks SET boost_multiplier = 2.0 WHERE id = ?
`);

const updatePickFreeze = db.prepare(`
  UPDATE draft_picks SET is_frozen = 1, frozen_at_price = ?, frozen_percent_change = ? WHERE id = ?
`);

const updatePickPriceAtEnd = db.prepare(`
  UPDATE draft_picks SET price_at_end = ?, percent_change = ? WHERE id = ?
`);

const replacePick = db.prepare(`
  UPDATE draft_picks SET coin_id = ?, coin_symbol = ?, coin_name = ?, coin_logo_url = ?, price_at_draft = ? WHERE id = ?
`);

export function createPick(
  entryId: string,
  coinId: string,
  coinSymbol: string,
  coinName: string,
  coinLogoUrl: string | undefined,
  pickOrder: number,
  priceAtDraft: number
): DraftPick {
  const id = uuidv4();
  const now = Date.now();

  insertPick.run(id, entryId, coinId, coinSymbol, coinName, coinLogoUrl || null, pickOrder, priceAtDraft, now);

  return {
    id,
    entryId,
    coinId,
    coinSymbol,
    coinName,
    coinLogoUrl,
    pickOrder,
    priceAtDraft,
    boostMultiplier: 1.0,
    isFrozen: false,
    createdAt: now,
  };
}

export function getPick(id: string): DraftPick | null {
  const row = getPickById.get(id) as any;
  if (!row) return null;
  return mapPickRow(row);
}

export function getPicksForEntry(entryId: string): DraftPick[] {
  const rows = getPicksByEntry.all(entryId) as any[];
  return rows.map(mapPickRow);
}

export function boostPick(pickId: string): void {
  updatePickBoost.run(pickId);
}

export function freezePick(pickId: string, currentPrice: number, currentPercentChange: number): void {
  updatePickFreeze.run(currentPrice, currentPercentChange, pickId);
}

export function swapPick(
  pickId: string,
  newCoinId: string,
  newCoinSymbol: string,
  newCoinName: string,
  newCoinLogoUrl: string | undefined,
  newPriceAtDraft: number
): void {
  replacePick.run(newCoinId, newCoinSymbol, newCoinName, newCoinLogoUrl || null, newPriceAtDraft, pickId);
}

export function updatePickEndPrice(pickId: string, priceAtEnd: number, percentChange: number): void {
  updatePickPriceAtEnd.run(priceAtEnd, percentChange, pickId);
}

function mapPickRow(row: any): DraftPick {
  return {
    id: row.id,
    entryId: row.entry_id,
    coinId: row.coin_id,
    coinSymbol: row.coin_symbol,
    coinName: row.coin_name,
    coinLogoUrl: row.coin_logo_url || undefined,
    pickOrder: row.pick_order,
    priceAtDraft: row.price_at_draft,
    priceAtEnd: row.price_at_end ?? undefined,
    percentChange: row.percent_change ?? undefined,
    boostMultiplier: row.boost_multiplier,
    isFrozen: Boolean(row.is_frozen),
    frozenAtPrice: row.frozen_at_price ?? undefined,
    frozenPercentChange: row.frozen_percent_change ?? undefined,
    createdAt: row.created_at,
  };
}

// ===================
// Power-up Operations
// ===================

const insertPowerup = db.prepare(`
  INSERT INTO draft_powerups (id, entry_id, powerup_type, used_at, target_pick_id, details)
  VALUES (?, ?, ?, ?, ?, ?)
`);

const getPowerupsByEntry = db.prepare(`
  SELECT * FROM draft_powerups WHERE entry_id = ?
`);

const getPowerupByEntryAndType = db.prepare(`
  SELECT * FROM draft_powerups WHERE entry_id = ? AND powerup_type = ?
`);

export function recordPowerupUsage(
  entryId: string,
  powerupType: PowerUpType,
  targetPickId?: string,
  details?: object
): PowerUpUsage {
  const id = uuidv4();
  const now = Date.now();

  insertPowerup.run(id, entryId, powerupType, now, targetPickId || null, details ? JSON.stringify(details) : null);

  return {
    id,
    entryId,
    powerupType,
    usedAt: now,
    targetPickId,
    details: details ? JSON.stringify(details) : undefined,
  };
}

export function getPowerupsForEntry(entryId: string): PowerUpUsage[] {
  const rows = getPowerupsByEntry.all(entryId) as any[];
  return rows.map(mapPowerupRow);
}

export function hasPowerupBeenUsed(entryId: string, powerupType: PowerUpType): boolean {
  const row = getPowerupByEntryAndType.get(entryId, powerupType);
  return row !== undefined;
}

function mapPowerupRow(row: any): PowerUpUsage {
  return {
    id: row.id,
    entryId: row.entry_id,
    powerupType: row.powerup_type as PowerUpType,
    usedAt: row.used_at,
    targetPickId: row.target_pick_id || undefined,
    details: row.details || undefined,
  };
}

// ===================
// Memecoin Pool Operations
// ===================

const upsertMemecoin = db.prepare(`
  INSERT OR REPLACE INTO memecoin_pool (id, symbol, name, market_cap_rank, current_price, price_change_24h, logo_url, last_updated)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);

const getAllMemecoins = db.prepare(`
  SELECT * FROM memecoin_pool ORDER BY market_cap_rank
`);

const getMemecoinById = db.prepare(`
  SELECT * FROM memecoin_pool WHERE id = ?
`);

const getRandomMemecoins = db.prepare(`
  SELECT * FROM memecoin_pool WHERE id NOT IN (SELECT value FROM json_each(?)) ORDER BY RANDOM() LIMIT ?
`);

export function upsertMemecoins(coins: Memecoin[]): void {
  const upsertMany = db.transaction((coins: Memecoin[]) => {
    for (const coin of coins) {
      upsertMemecoin.run(
        coin.id,
        coin.symbol,
        coin.name,
        coin.marketCapRank,
        coin.currentPrice,
        coin.priceChange24h || null,
        coin.logoUrl || null,
        coin.lastUpdated
      );
    }
  });
  upsertMany(coins);
}

export function getMemecoinPool(): Memecoin[] {
  const rows = getAllMemecoins.all() as any[];
  return rows.map(mapMemecoinRow);
}

export function getMemecoin(id: string): Memecoin | null {
  const row = getMemecoinById.get(id) as any;
  if (!row) return null;
  return mapMemecoinRow(row);
}

export function getRandomMemecoinOptions(excludeIds: string[], count: number): Memecoin[] {
  const rows = getRandomMemecoins.all(JSON.stringify(excludeIds), count) as any[];
  return rows.map(mapMemecoinRow);
}

function mapMemecoinRow(row: any): Memecoin {
  return {
    id: row.id,
    symbol: row.symbol,
    name: row.name,
    marketCapRank: row.market_cap_rank,
    currentPrice: row.current_price,
    priceChange24h: row.price_change_24h ?? undefined,
    logoUrl: row.logo_url || undefined,
    lastUpdated: row.last_updated,
  };
}

