import * as cron from 'node-cron';
import { v4 as uuidv4 } from 'uuid';
import { createLogger } from '../utils/logger';
import { ScheduledMatch, ScheduledMatchEvent } from '../types';

const logger = createLogger('scheduled-matches');

// Configuration
const ENTRY_FEE_SOL = 0.1;
const MIN_PLAYERS = 2;
const MAX_PLAYERS = 8;
const REGISTRATION_OPENS_MINUTES_BEFORE = 30;
const REGISTRATION_CLOSES_MINUTES_BEFORE = 5;
const READY_CHECK_SECONDS_BEFORE = 30;
const NO_SHOW_PENALTY_PERCENT = 0.1; // 10%
const NO_SHOW_COOLDOWN_MS = 15 * 60 * 1000; // 15 minutes

type ScheduledMatchListener = (event: ScheduledMatchEvent) => void;

class ScheduledMatchManager {
  private schedules: Map<string, ScheduledMatch> = new Map();
  private listeners: Set<ScheduledMatchListener> = new Set();
  private activeJobs: Map<string, cron.ScheduledTask> = new Map();
  private noShowCooldowns: Map<string, number> = new Map(); // wallet -> cooldown expiry timestamp
  private readyCheckTimeouts: Map<string, NodeJS.Timeout> = new Map();
  private initialized = false;

  /**
   * Initialize the scheduled match system
   * Starts cron jobs for creating recurring matches
   */
  initialize(): void {
    if (this.initialized) {
      logger.warn('ScheduledMatchManager already initialized');
      return;
    }

    logger.info('Initializing ScheduledMatchManager');

    // Schedule hourly battles every 2 hours at :00
    // Pattern: '0 */2 * * *' means at minute 0 of every 2nd hour
    const hourlyJob = cron.schedule('0 */2 * * *', () => {
      this.scheduleHourlyBattles();
    }, {
      timezone: 'UTC'
    });

    this.activeJobs.set('hourly-battles', hourlyJob);

    // Create initial scheduled matches for the next 4 hours
    this.createInitialMatches();

    // Start a ticker to check for registration opens, ready checks, etc.
    this.startTicker();

    this.initialized = true;
    logger.info('ScheduledMatchManager initialized', {
      scheduledMatches: this.schedules.size
    });
  }

  /**
   * Create initial matches on startup
   */
  private createInitialMatches(): void {
    const now = Date.now();
    const twoHoursMs = 2 * 60 * 60 * 1000;

    // Find the next 2-hour boundary
    const nextBoundary = Math.ceil(now / twoHoursMs) * twoHoursMs;

    // Create matches for the next 2 slots (4 hours)
    for (let i = 0; i < 2; i++) {
      const startTime = nextBoundary + (i * twoHoursMs);
      this.createScheduledMatch({
        scheduledStartTime: startTime,
        gameMode: 'battle',
        entryFee: ENTRY_FEE_SOL,
        minPlayers: MIN_PLAYERS,
        maxPlayers: MAX_PLAYERS
      });
    }
  }

  /**
   * Called by cron every 2 hours to schedule the next battle
   */
  private scheduleHourlyBattles(): void {
    const now = Date.now();
    const twoHoursMs = 2 * 60 * 60 * 1000;
    const fourHoursFromNow = now + (2 * twoHoursMs);

    // Find the latest scheduled match time
    let latestTime = 0;
    for (const match of this.schedules.values()) {
      if (match.scheduledStartTime > latestTime) {
        latestTime = match.scheduledStartTime;
      }
    }

    // Schedule matches to maintain a 4-hour lookahead
    while (latestTime < fourHoursFromNow) {
      const nextTime = latestTime === 0
        ? Math.ceil(now / twoHoursMs) * twoHoursMs
        : latestTime + twoHoursMs;

      this.createScheduledMatch({
        scheduledStartTime: nextTime,
        gameMode: 'battle',
        entryFee: ENTRY_FEE_SOL,
        minPlayers: MIN_PLAYERS,
        maxPlayers: MAX_PLAYERS
      });

      latestTime = nextTime;
    }
  }

  /**
   * Create a new scheduled match
   */
  createScheduledMatch(config: {
    scheduledStartTime: number;
    gameMode: 'battle';
    entryFee?: number;
    minPlayers?: number;
    maxPlayers?: number;
  }): ScheduledMatch {
    const id = uuidv4();
    const now = Date.now();

    const registrationOpens = config.scheduledStartTime - (REGISTRATION_OPENS_MINUTES_BEFORE * 60 * 1000);
    const registrationCloses = config.scheduledStartTime - (REGISTRATION_CLOSES_MINUTES_BEFORE * 60 * 1000);

    const match: ScheduledMatch = {
      id,
      gameMode: config.gameMode,
      scheduledStartTime: config.scheduledStartTime,
      registrationOpens,
      registrationCloses,
      minPlayers: config.minPlayers ?? MIN_PLAYERS,
      maxPlayers: config.maxPlayers ?? MAX_PLAYERS,
      registeredPlayers: [],
      confirmedPlayers: [],
      status: now >= registrationOpens ? 'registration_open' : 'upcoming',
      entryFee: config.entryFee ?? ENTRY_FEE_SOL,
      createdAt: now
    };

    this.schedules.set(id, match);

    logger.info('Scheduled match created', {
      matchId: id,
      startTime: new Date(config.scheduledStartTime).toISOString(),
      registrationOpens: new Date(registrationOpens).toISOString()
    });

    this.emit({
      type: 'match_scheduled',
      matchId: id,
      data: match
    });

    return match;
  }

  /**
   * Register a player for an upcoming match
   */
  async registerPlayer(matchId: string, wallet: string): Promise<void> {
    const match = this.schedules.get(matchId);

    if (!match) {
      throw new Error('Match not found');
    }

    const now = Date.now();

    // Check if registration is open
    if (now < match.registrationOpens) {
      throw new Error('Registration not yet open');
    }

    if (now > match.registrationCloses) {
      throw new Error('Registration closed');
    }

    if (match.status !== 'registration_open') {
      throw new Error(`Cannot register - match status is ${match.status}`);
    }

    // Check if already registered
    if (match.registeredPlayers.includes(wallet)) {
      throw new Error('Already registered for this match');
    }

    // Check max players
    if (match.registeredPlayers.length >= match.maxPlayers) {
      throw new Error('Match is full');
    }

    // Check cooldown
    const cooldownExpiry = this.noShowCooldowns.get(wallet);
    if (cooldownExpiry && now < cooldownExpiry) {
      const remainingMs = cooldownExpiry - now;
      const remainingMin = Math.ceil(remainingMs / 60000);
      throw new Error(`On cooldown for ${remainingMin} minutes due to previous no-show`);
    }

    // TODO: In production, verify balance here
    // const balance = await balanceService.getOnChainBalance(wallet);
    // if (balance < match.entryFee * LAMPORTS_PER_SOL) {
    //   throw new Error('Insufficient balance');
    // }

    match.registeredPlayers.push(wallet);

    logger.info('Player registered for scheduled match', {
      matchId,
      wallet: wallet.slice(0, 8) + '...',
      totalRegistered: match.registeredPlayers.length
    });

    this.emit({
      type: 'player_registered',
      matchId,
      data: { wallet, totalRegistered: match.registeredPlayers.length }
    });
  }

  /**
   * Unregister a player from a match
   */
  async unregisterPlayer(matchId: string, wallet: string): Promise<void> {
    const match = this.schedules.get(matchId);

    if (!match) {
      throw new Error('Match not found');
    }

    const now = Date.now();

    // Can only unregister before registration closes
    if (now > match.registrationCloses) {
      throw new Error('Cannot unregister after registration closes');
    }

    const index = match.registeredPlayers.indexOf(wallet);
    if (index === -1) {
      throw new Error('Not registered for this match');
    }

    match.registeredPlayers.splice(index, 1);

    logger.info('Player unregistered from scheduled match', {
      matchId,
      wallet: wallet.slice(0, 8) + '...',
      totalRegistered: match.registeredPlayers.length
    });

    this.emit({
      type: 'player_unregistered',
      matchId,
      data: { wallet, totalRegistered: match.registeredPlayers.length }
    });
  }

  /**
   * Start ready check for a match (30 seconds before start)
   */
  startReadyCheck(matchId: string): void {
    const match = this.schedules.get(matchId);

    if (!match) {
      logger.error('Cannot start ready check - match not found', { matchId });
      return;
    }

    if (match.registeredPlayers.length < match.minPlayers) {
      logger.info('Not enough players for ready check, cancelling match', {
        matchId,
        registered: match.registeredPlayers.length,
        required: match.minPlayers
      });
      this.cancelMatch(matchId, 'Not enough players registered');
      return;
    }

    match.status = 'starting';
    match.confirmedPlayers = [];

    const expiresAt = match.scheduledStartTime;

    logger.info('Ready check started', {
      matchId,
      playersRequired: match.registeredPlayers.length,
      expiresAt: new Date(expiresAt).toISOString()
    });

    this.emit({
      type: 'ready_check_started',
      matchId,
      data: {
        playersRequired: match.registeredPlayers,
        expiresAt
      }
    });

    // Set timeout to check ready responses at start time
    const timeout = setTimeout(() => {
      this.handleReadyCheckExpiry(matchId);
    }, READY_CHECK_SECONDS_BEFORE * 1000);

    this.readyCheckTimeouts.set(matchId, timeout);
  }

  /**
   * Handle a player's ready check response
   */
  handleReadyCheckResponse(matchId: string, wallet: string, ready: boolean): void {
    const match = this.schedules.get(matchId);

    if (!match) {
      logger.warn('Ready check response for unknown match', { matchId });
      return;
    }

    if (match.status !== 'starting') {
      logger.warn('Ready check response when not in starting state', { matchId, status: match.status });
      return;
    }

    if (!match.registeredPlayers.includes(wallet)) {
      logger.warn('Ready check response from non-registered player', { matchId, wallet: wallet.slice(0, 8) + '...' });
      return;
    }

    if (ready) {
      if (!match.confirmedPlayers.includes(wallet)) {
        match.confirmedPlayers.push(wallet);
        logger.info('Player confirmed ready', {
          matchId,
          wallet: wallet.slice(0, 8) + '...',
          confirmedCount: match.confirmedPlayers.length
        });
      }
    } else {
      // Player declined - remove from registered
      const index = match.registeredPlayers.indexOf(wallet);
      if (index !== -1) {
        match.registeredPlayers.splice(index, 1);
      }
      logger.info('Player declined ready check', {
        matchId,
        wallet: wallet.slice(0, 8) + '...'
      });
    }

    this.emit({
      type: 'ready_check_response',
      matchId,
      data: {
        wallet,
        ready,
        confirmedCount: match.confirmedPlayers.length,
        requiredCount: match.registeredPlayers.length
      }
    });

    // Check if all registered players are confirmed
    if (match.confirmedPlayers.length === match.registeredPlayers.length &&
        match.confirmedPlayers.length >= match.minPlayers) {
      // Clear the timeout and start immediately
      const timeout = this.readyCheckTimeouts.get(matchId);
      if (timeout) {
        clearTimeout(timeout);
        this.readyCheckTimeouts.delete(matchId);
      }
      this.startMatch(matchId);
    }
  }

  /**
   * Handle ready check expiry - process no-shows
   */
  private handleReadyCheckExpiry(matchId: string): void {
    const match = this.schedules.get(matchId);

    if (!match || match.status !== 'starting') {
      return;
    }

    this.readyCheckTimeouts.delete(matchId);

    // Find no-shows (registered but not confirmed)
    const noShows = match.registeredPlayers.filter(
      wallet => !match.confirmedPlayers.includes(wallet)
    );

    // Penalize no-shows
    for (const wallet of noShows) {
      this.penalizeNoShow(wallet, match.entryFee);
    }

    // Check if enough players are confirmed
    if (match.confirmedPlayers.length >= match.minPlayers) {
      this.startMatch(matchId);
    } else {
      logger.info('Not enough confirmed players, cancelling match', {
        matchId,
        confirmed: match.confirmedPlayers.length,
        required: match.minPlayers
      });
      this.cancelMatch(matchId, 'Not enough players confirmed');
    }
  }

  /**
   * Start the match with confirmed players
   */
  startMatch(matchId: string): void {
    const match = this.schedules.get(matchId);

    if (!match) {
      logger.error('Cannot start match - not found', { matchId });
      return;
    }

    if (match.confirmedPlayers.length < match.minPlayers) {
      logger.error('Cannot start match - not enough players', {
        matchId,
        confirmed: match.confirmedPlayers.length,
        required: match.minPlayers
      });
      this.cancelMatch(matchId, 'Not enough confirmed players');
      return;
    }

    match.status = 'in_progress';

    logger.info('Scheduled match started', {
      matchId,
      players: match.confirmedPlayers.length,
      entryFee: match.entryFee
    });

    this.emit({
      type: 'match_started',
      matchId,
      data: {
        players: match.confirmedPlayers,
        entryFee: match.entryFee
      }
    });

    // TODO: Integrate with battleManager to create actual battle
    // battleManager.createScheduledBattle(match.confirmedPlayers, match.entryFee);
  }

  /**
   * Cancel a match and refund registered players
   */
  cancelMatch(matchId: string, reason: string): void {
    const match = this.schedules.get(matchId);

    if (!match) {
      return;
    }

    match.status = 'cancelled';

    logger.info('Scheduled match cancelled', {
      matchId,
      reason,
      affectedPlayers: match.registeredPlayers.length
    });

    // TODO: Refund registered players if they had locked funds
    // for (const wallet of match.registeredPlayers) {
    //   balanceService.releaseLockedBalance(wallet, match.entryFee);
    // }

    this.emit({
      type: 'match_cancelled',
      matchId,
      data: { reason, affectedPlayers: match.registeredPlayers }
    });

    // Clear any pending timeouts
    const timeout = this.readyCheckTimeouts.get(matchId);
    if (timeout) {
      clearTimeout(timeout);
      this.readyCheckTimeouts.delete(matchId);
    }
  }

  /**
   * Penalize a player for no-show
   */
  penalizeNoShow(wallet: string, entryFee: number): void {
    const now = Date.now();
    const cooldownExpiry = now + NO_SHOW_COOLDOWN_MS;

    // Set cooldown
    this.noShowCooldowns.set(wallet, cooldownExpiry);

    // Calculate penalty (10% of entry fee)
    const penaltyAmount = entryFee * NO_SHOW_PENALTY_PERCENT;

    logger.info('No-show penalty applied', {
      wallet: wallet.slice(0, 8) + '...',
      penaltyAmount,
      cooldownMinutes: NO_SHOW_COOLDOWN_MS / 60000
    });

    // TODO: Actually deduct penalty from balance
    // balanceService.deductPenalty(wallet, penaltyAmount);
  }

  /**
   * Get upcoming matches for a game mode
   */
  getUpcomingMatches(gameMode: 'battle'): ScheduledMatch[] {
    const now = Date.now();
    const matches: ScheduledMatch[] = [];

    for (const match of this.schedules.values()) {
      if (match.gameMode === gameMode &&
          (match.status === 'upcoming' || match.status === 'registration_open') &&
          match.scheduledStartTime > now) {
        matches.push(match);
      }
    }

    // Sort by start time
    return matches.sort((a, b) => a.scheduledStartTime - b.scheduledStartTime);
  }

  /**
   * Get a specific match
   */
  getMatch(matchId: string): ScheduledMatch | undefined {
    return this.schedules.get(matchId);
  }

  /**
   * Subscribe to match events
   */
  subscribe(listener: ScheduledMatchListener): void {
    this.listeners.add(listener);
  }

  /**
   * Unsubscribe from match events
   */
  unsubscribe(listener: ScheduledMatchListener): void {
    this.listeners.delete(listener);
  }

  /**
   * Emit an event to all listeners
   */
  private emit(event: ScheduledMatchEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch (error) {
        logger.error('Error in scheduled match listener', { error: String(error) });
      }
    }
  }

  /**
   * Start a ticker that checks match states every second
   */
  private startTicker(): void {
    setInterval(() => {
      this.tick();
    }, 1000);
  }

  /**
   * Check all matches and trigger state transitions
   */
  private tick(): void {
    const now = Date.now();

    for (const match of this.schedules.values()) {
      // Open registration when time comes
      if (match.status === 'upcoming' && now >= match.registrationOpens) {
        match.status = 'registration_open';
        logger.info('Registration opened for match', { matchId: match.id });
        this.emit({
          type: 'registration_opened',
          matchId: match.id,
          data: match
        });
      }

      // Start ready check 30 seconds before match
      const readyCheckTime = match.scheduledStartTime - (READY_CHECK_SECONDS_BEFORE * 1000);
      if (match.status === 'registration_open' && now >= readyCheckTime) {
        this.startReadyCheck(match.id);
      }

      // Clean up old completed/cancelled matches (older than 1 hour)
      if ((match.status === 'completed' || match.status === 'cancelled') &&
          now - match.scheduledStartTime > 60 * 60 * 1000) {
        this.schedules.delete(match.id);
      }
    }

    // Clean up expired cooldowns
    for (const [wallet, expiry] of this.noShowCooldowns.entries()) {
      if (now > expiry) {
        this.noShowCooldowns.delete(wallet);
      }
    }
  }

  /**
   * Shutdown the manager
   */
  shutdown(): void {
    logger.info('Shutting down ScheduledMatchManager');

    // Stop all cron jobs
    for (const [name, job] of this.activeJobs.entries()) {
      job.stop();
      logger.debug('Stopped cron job', { name });
    }
    this.activeJobs.clear();

    // Clear all timeouts
    for (const timeout of this.readyCheckTimeouts.values()) {
      clearTimeout(timeout);
    }
    this.readyCheckTimeouts.clear();

    this.initialized = false;
  }
}

// Export singleton instance
export const scheduledMatchManager = new ScheduledMatchManager();
