import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DATA_DIR = path.join(__dirname, '../../data');
const DB_PATH = path.join(DATA_DIR, 'events.db');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Initialize database
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

// Create tables
db.exec(`
  -- Scheduled Events (Fight Cards)
  CREATE TABLE IF NOT EXISTS events (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    scheduled_start_time INTEGER NOT NULL,
    registration_opens INTEGER NOT NULL,
    registration_closes INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'upcoming',
    entry_fee_lamports INTEGER NOT NULL,
    max_participants INTEGER NOT NULL,
    prize_pool_lamports INTEGER DEFAULT 0,
    created_at INTEGER NOT NULL,
    created_by TEXT NOT NULL
  );

  -- Featured battles within an event (the main card)
  CREATE TABLE IF NOT EXISTS event_battles (
    id TEXT PRIMARY KEY,
    event_id TEXT NOT NULL,
    position INTEGER NOT NULL,
    player1_wallet TEXT NOT NULL,
    player2_wallet TEXT NOT NULL,
    battle_id TEXT,
    is_main_event INTEGER DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'scheduled',
    FOREIGN KEY (event_id) REFERENCES events(id)
  );

  -- Event subscriptions for notifications
  CREATE TABLE IF NOT EXISTS event_subscriptions (
    wallet_address TEXT NOT NULL,
    event_id TEXT NOT NULL,
    notified INTEGER DEFAULT 0,
    subscribed_at INTEGER NOT NULL,
    PRIMARY KEY (wallet_address, event_id)
  );

  -- Indexes for performance
  CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
  CREATE INDEX IF NOT EXISTS idx_events_scheduled_start ON events(scheduled_start_time);
  CREATE INDEX IF NOT EXISTS idx_event_battles_event_id ON event_battles(event_id);
  CREATE INDEX IF NOT EXISTS idx_event_subscriptions_event_id ON event_subscriptions(event_id);
`);

// ===================
// Type Definitions
// ===================

export type EventStatus = 'upcoming' | 'registration_open' | 'in_progress' | 'completed' | 'cancelled';
export type EventBattleStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled';

export interface EventRecord {
  id: string;
  name: string;
  description: string | null;
  scheduledStartTime: number;
  registrationOpens: number;
  registrationCloses: number;
  status: EventStatus;
  entryFeeLamports: number;
  maxParticipants: number;
  prizePoolLamports: number;
  createdAt: number;
  createdBy: string;
}

export interface EventBattleRecord {
  id: string;
  eventId: string;
  position: number;
  player1Wallet: string;
  player2Wallet: string;
  battleId: string | null;
  isMainEvent: boolean;
  status: EventBattleStatus;
}

export interface EventSubscriptionRecord {
  walletAddress: string;
  eventId: string;
  notified: boolean;
  subscribedAt: number;
}

export interface CreateEventInput {
  id: string;
  name: string;
  description?: string;
  scheduledStartTime: number;
  registrationOpens: number;
  registrationCloses: number;
  entryFeeLamports: number;
  maxParticipants: number;
  createdBy: string;
}

export interface AddEventBattleInput {
  id: string;
  eventId: string;
  position: number;
  player1Wallet: string;
  player2Wallet: string;
  isMainEvent?: boolean;
}

// ===================
// Prepared Statements
// ===================

const insertEvent = db.prepare(`
  INSERT INTO events (id, name, description, scheduled_start_time, registration_opens,
    registration_closes, status, entry_fee_lamports, max_participants, prize_pool_lamports,
    created_at, created_by)
  VALUES (?, ?, ?, ?, ?, ?, 'upcoming', ?, ?, 0, ?, ?)
`);

const selectEventById = db.prepare(`
  SELECT * FROM events WHERE id = ?
`);

const selectUpcomingEvents = db.prepare(`
  SELECT * FROM events
  WHERE status IN ('upcoming', 'registration_open', 'in_progress')
  AND scheduled_start_time > ?
  ORDER BY scheduled_start_time ASC
  LIMIT ?
`);

const selectEventsByStatus = db.prepare(`
  SELECT * FROM events
  WHERE status = ?
  ORDER BY scheduled_start_time ASC
`);

const updateEventStatusStmt = db.prepare(`
  UPDATE events SET status = ? WHERE id = ?
`);

const updateEventPrizePoolStmt = db.prepare(`
  UPDATE events SET prize_pool_lamports = ? WHERE id = ?
`);

// Event battles
const insertEventBattle = db.prepare(`
  INSERT INTO event_battles (id, event_id, position, player1_wallet, player2_wallet, battle_id, is_main_event, status)
  VALUES (?, ?, ?, ?, ?, NULL, ?, 'scheduled')
`);

const selectEventBattles = db.prepare(`
  SELECT * FROM event_battles
  WHERE event_id = ?
  ORDER BY position ASC
`);

const updateBattleStatusStmt = db.prepare(`
  UPDATE event_battles SET status = ? WHERE id = ?
`);

const updateBattleBattleIdStmt = db.prepare(`
  UPDATE event_battles SET battle_id = ? WHERE id = ?
`);

// Subscriptions
const insertSubscription = db.prepare(`
  INSERT OR IGNORE INTO event_subscriptions (wallet_address, event_id, notified, subscribed_at)
  VALUES (?, ?, 0, ?)
`);

const deleteSubscription = db.prepare(`
  DELETE FROM event_subscriptions WHERE wallet_address = ? AND event_id = ?
`);

const selectEventSubscribers = db.prepare(`
  SELECT * FROM event_subscriptions WHERE event_id = ?
`);

const markSubscribersNotified = db.prepare(`
  UPDATE event_subscriptions SET notified = 1 WHERE event_id = ? AND notified = 0
`);

const selectUnnotifiedSubscribers = db.prepare(`
  SELECT es.*, e.name as event_name, e.scheduled_start_time
  FROM event_subscriptions es
  JOIN events e ON es.event_id = e.id
  WHERE es.notified = 0
  AND e.scheduled_start_time > ?
  AND e.scheduled_start_time < ?
  AND e.status = 'registration_open'
`);

const countEventSubscriptions = db.prepare(`
  SELECT COUNT(*) as count FROM event_subscriptions WHERE event_id = ?
`);

const isWalletSubscribed = db.prepare(`
  SELECT 1 FROM event_subscriptions WHERE wallet_address = ? AND event_id = ?
`);

// ===================
// Functions
// ===================

export function createEvent(input: CreateEventInput): EventRecord {
  const now = Date.now();

  insertEvent.run(
    input.id,
    input.name,
    input.description || null,
    input.scheduledStartTime,
    input.registrationOpens,
    input.registrationCloses,
    input.entryFeeLamports,
    input.maxParticipants,
    now,
    input.createdBy
  );

  return getEvent(input.id)!;
}

export function getEvent(id: string): EventRecord | null {
  const row = selectEventById.get(id) as any;
  if (!row) return null;
  return mapEventRow(row);
}

export function getEventById(id: string): EventRecord | null {
  return getEvent(id);
}

export function getUpcomingEvents(limit: number = 20): EventRecord[] {
  const now = Date.now() - 24 * 60 * 60 * 1000; // Include events from last 24h that might still be in progress
  const rows = selectUpcomingEvents.all(now, limit) as any[];
  return rows.map(mapEventRow);
}

export function getEventsByStatus(status: EventStatus): EventRecord[] {
  const rows = selectEventsByStatus.all(status) as any[];
  return rows.map(mapEventRow);
}

export function updateEventStatus(id: string, status: EventStatus): void {
  updateEventStatusStmt.run(status, id);
}

export function updateEventPrizePool(id: string, prizePoolLamports: number): void {
  updateEventPrizePoolStmt.run(prizePoolLamports, id);
}

// Event battle functions
export function addEventBattle(input: AddEventBattleInput): EventBattleRecord {
  insertEventBattle.run(
    input.id,
    input.eventId,
    input.position,
    input.player1Wallet,
    input.player2Wallet,
    input.isMainEvent ? 1 : 0
  );

  return getEventBattle(input.id)!;
}

export function getEventBattle(id: string): EventBattleRecord | null {
  const stmt = db.prepare('SELECT * FROM event_battles WHERE id = ?');
  const row = stmt.get(id) as any;
  if (!row) return null;
  return mapEventBattleRow(row);
}

export function getEventBattles(eventId: string): EventBattleRecord[] {
  const rows = selectEventBattles.all(eventId) as any[];
  return rows.map(mapEventBattleRow);
}

export function updateBattleStatus(id: string, status: EventBattleStatus): void {
  updateBattleStatusStmt.run(status, id);
}

export function linkBattleToBattleId(id: string, battleId: string): void {
  updateBattleBattleIdStmt.run(battleId, id);
}

// Subscription functions
export function subscribeToEvent(walletAddress: string, eventId: string): void {
  const now = Date.now();
  insertSubscription.run(walletAddress, eventId, now);
}

export function unsubscribeFromEvent(walletAddress: string, eventId: string): boolean {
  const result = deleteSubscription.run(walletAddress, eventId);
  return result.changes > 0;
}

export function getEventSubscribers(eventId: string): EventSubscriptionRecord[] {
  const rows = selectEventSubscribers.all(eventId) as any[];
  return rows.map(mapSubscriptionRow);
}

export function markNotified(eventId: string): number {
  const result = markSubscribersNotified.run(eventId);
  return result.changes;
}

export function getUnnotifiedSubscribers(startTimeFrom: number, startTimeTo: number): Array<EventSubscriptionRecord & { eventName: string; scheduledStartTime: number }> {
  const rows = selectUnnotifiedSubscribers.all(startTimeFrom, startTimeTo) as any[];
  return rows.map(row => ({
    ...mapSubscriptionRow(row),
    eventName: row.event_name,
    scheduledStartTime: row.scheduled_start_time,
  }));
}

export function getSubscriberCount(eventId: string): number {
  const result = countEventSubscriptions.get(eventId) as any;
  return result?.count || 0;
}

export function isSubscribed(walletAddress: string, eventId: string): boolean {
  const result = isWalletSubscribed.get(walletAddress, eventId);
  return !!result;
}

// ===================
// Mappers
// ===================

function mapEventRow(row: any): EventRecord {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    scheduledStartTime: row.scheduled_start_time,
    registrationOpens: row.registration_opens,
    registrationCloses: row.registration_closes,
    status: row.status as EventStatus,
    entryFeeLamports: row.entry_fee_lamports,
    maxParticipants: row.max_participants,
    prizePoolLamports: row.prize_pool_lamports,
    createdAt: row.created_at,
    createdBy: row.created_by,
  };
}

function mapEventBattleRow(row: any): EventBattleRecord {
  return {
    id: row.id,
    eventId: row.event_id,
    position: row.position,
    player1Wallet: row.player1_wallet,
    player2Wallet: row.player2_wallet,
    battleId: row.battle_id,
    isMainEvent: row.is_main_event === 1,
    status: row.status as EventBattleStatus,
  };
}

function mapSubscriptionRow(row: any): EventSubscriptionRecord {
  return {
    walletAddress: row.wallet_address,
    eventId: row.event_id,
    notified: row.notified === 1,
    subscribedAt: row.subscribed_at,
  };
}
