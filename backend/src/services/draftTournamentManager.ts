import {
  DraftTournament,
  DraftTournamentTier,
  DraftTournamentStatus,
  DraftEntry,
  DraftPick,
  DraftSession,
  DraftRound,
  DraftLeaderboardEntry,
  PowerUpType,
  PowerUpUsage,
  Memecoin,
  DRAFT_TIER_TO_LAMPORTS,
} from '../types';
import * as db from '../db/draftDatabase';
import * as userStatsDb from '../db/userStatsDatabase';
import { coinMarketCapService } from './coinMarketCapService';
import { progressionService } from './progressionService';
import { balanceService } from './balanceService';

// In-memory state for active draft sessions
interface ActiveDraftSession {
  session: DraftSession;
  timer: NodeJS.Timeout | null;
}

class DraftTournamentManager {
  // Constants
  private readonly RAKE_PERCENT = 10;
  private readonly PICKS_PER_ENTRY = 6;
  private readonly OPTIONS_PER_ROUND = 5;
  private readonly PICK_TIME_LIMIT = 30; // seconds
  private readonly SWAP_OPTIONS_COUNT = 3;

  // Prize distribution (top 10% of entries)
  private readonly PRIZE_DISTRIBUTION = [
    { rank: 1, percent: 30 },
    { rank: 2, percent: 20 },
    { rank: 3, percent: 15 },
    // Remaining 35% split among ranks 4+
  ];

  // In-memory state
  private draftSessions: Map<string, ActiveDraftSession> = new Map();
  private listeners: Set<(event: string, data: any) => void> = new Set();
  private weeklyCheckInterval: NodeJS.Timeout | null = null;
  private scoreUpdateInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Subscribe to price updates
    coinMarketCapService.subscribe(() => {
      this.updateAllScores();
    });
  }

  start(): void {
    // Check/create weekly tournaments on startup and every hour
    this.checkAndCreateWeeklyTournaments();
    this.weeklyCheckInterval = setInterval(() => {
      this.checkAndCreateWeeklyTournaments();
      this.checkTournamentPhases();
    }, 60 * 60 * 1000); // Every hour

    // Update scores every minute
    this.scoreUpdateInterval = setInterval(() => {
      this.updateAllScores();
    }, 60 * 1000);

    console.log('Draft Tournament Manager started');
  }

  stop(): void {
    if (this.weeklyCheckInterval) {
      clearInterval(this.weeklyCheckInterval);
      this.weeklyCheckInterval = null;
    }
    if (this.scoreUpdateInterval) {
      clearInterval(this.scoreUpdateInterval);
      this.scoreUpdateInterval = null;
    }

    // Clear all draft session timers
    this.draftSessions.forEach(session => {
      if (session.timer) {
        clearTimeout(session.timer);
      }
    });
    this.draftSessions.clear();

    console.log('Draft Tournament Manager stopped');
  }

  // ===================
  // Tournament Lifecycle
  // ===================

  private checkAndCreateWeeklyTournaments(): void {
    const now = Date.now();
    const { weekStart, weekEnd } = this.getCurrentWeekBounds();

    // Create tournaments for each tier if they don't exist
    const tiers: DraftTournamentTier[] = ['0.1 SOL', '0.5 SOL', '1 SOL'];
    for (const tier of tiers) {
      const existing = db.getTournamentForTierAndWeek(tier, weekStart);
      if (!existing) {
        // Draft deadline is 24 hours after week start
        const draftDeadline = weekStart + 24 * 60 * 60 * 1000;
        db.createTournament(tier, weekStart, weekEnd, draftDeadline);
        console.log(`Created ${tier} tournament for week starting ${new Date(weekStart).toISOString()}`);
      }
    }
  }

  private checkTournamentPhases(): void {
    const now = Date.now();
    const tournaments = db.getAllActiveTournaments();

    for (const tournament of tournaments) {
      // Transition upcoming → drafting when week starts
      if (tournament.status === 'upcoming' && now >= tournament.weekStartUtc) {
        db.setTournamentStatus(tournament.id, 'drafting');
        this.notify('tournament_status_changed', { ...tournament, status: 'drafting' });
      }

      // Transition drafting → active after draft deadline
      if (tournament.status === 'drafting' && now >= tournament.draftDeadlineUtc) {
        db.setTournamentStatus(tournament.id, 'active');
        this.notify('tournament_status_changed', { ...tournament, status: 'active' });
      }

      // Transition active → completed at week end
      if (tournament.status === 'active' && now >= tournament.weekEndUtc) {
        this.settleTournament(tournament.id);
      }
    }
  }

  private getCurrentWeekBounds(): { weekStart: number; weekEnd: number } {
    const now = new Date();
    // Get Monday 00:00 UTC of current week
    const dayOfWeek = now.getUTCDay();
    const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

    const weekStart = new Date(now);
    weekStart.setUTCDate(now.getUTCDate() - daysToMonday);
    weekStart.setUTCHours(0, 0, 0, 0);

    // Sunday 23:59:59 UTC
    const weekEnd = new Date(weekStart);
    weekEnd.setUTCDate(weekStart.getUTCDate() + 6);
    weekEnd.setUTCHours(23, 59, 59, 999);

    return {
      weekStart: weekStart.getTime(),
      weekEnd: weekEnd.getTime(),
    };
  }

  // ===================
  // Tournament Queries
  // ===================

  getTournament(id: string): DraftTournament | null {
    return db.getTournament(id);
  }

  getTournamentForTier(tier: DraftTournamentTier): DraftTournament | null {
    const { weekStart } = this.getCurrentWeekBounds();
    return db.getTournamentForTierAndWeek(tier, weekStart);
  }

  getAllActiveTournaments(): DraftTournament[] {
    return db.getAllActiveTournaments();
  }

  // ===================
  // Entry Management
  // ===================

  async enterTournament(tournamentId: string, walletAddress: string): Promise<DraftEntry> {
    const tournament = db.getTournament(tournamentId);
    if (!tournament) {
      throw new Error('Tournament not found');
    }

    if (tournament.status !== 'upcoming' && tournament.status !== 'drafting') {
      throw new Error('Tournament is not accepting entries');
    }

    // Check if already entered
    const existing = db.getEntryForTournamentAndWallet(tournamentId, walletAddress);
    if (existing) {
      throw new Error('Already entered this tournament');
    }

    // CRITICAL FIX: Actually collect entry fee from PDA balance!
    const entryFeeLamports = tournament.entryFeeLamports;

    // Check if user has sufficient balance
    const hasSufficient = await balanceService.hasSufficientBalance(walletAddress, entryFeeLamports);
    if (!hasSufficient) {
      const available = await balanceService.getAvailableBalance(walletAddress);
      throw new Error(`Insufficient balance. Need ${entryFeeLamports / 1_000_000_000} SOL, have ${available / 1_000_000_000} SOL`);
    }

    // Create pending debit for the entry fee
    const pendingId = await balanceService.debitPending(
      walletAddress,
      entryFeeLamports,
      'draft',
      tournamentId
    );

    // Create entry in database
    const entry = db.createEntry(tournamentId, walletAddress, entryFeeLamports);

    // Confirm the debit
    balanceService.confirmDebit(pendingId);

    // Update prize pool
    db.incrementPrizePool(tournamentId, entryFeeLamports);

    console.log(`[Draft] User ${walletAddress} entered ${tournament.tier} tournament. Entry fee: ${entryFeeLamports / 1_000_000_000} SOL`);

    // Award XP for entering: 50 XP
    progressionService.awardXp(
      walletAddress,
      50,
      'draft',
      entry.id,
      `Entered ${tournament.tier} tournament`
    );

    // Notify
    this.notify('entry_created', entry);

    return this.getFullEntry(entry.id)!;
  }

  getEntry(entryId: string): DraftEntry | null {
    return this.getFullEntry(entryId);
  }

  getEntriesForTournament(tournamentId: string): DraftEntry[] {
    const entries = db.getEntriesForTournament(tournamentId);
    return entries.map(e => this.getFullEntry(e.id)!);
  }

  getEntriesForWallet(walletAddress: string): DraftEntry[] {
    const entries = db.getEntriesForWallet(walletAddress);
    return entries.map(e => this.getFullEntry(e.id)!);
  }

  private getFullEntry(entryId: string): DraftEntry | null {
    const entry = db.getEntry(entryId);
    if (!entry) return null;

    const picks = db.getPicksForEntry(entryId);
    const powerups = db.getPowerupsForEntry(entryId);

    return {
      ...entry,
      picks,
      powerUpsUsed: powerups,
    };
  }

  // ===================
  // Draft Flow
  // ===================

  startDraft(entryId: string): DraftSession {
    const entry = db.getEntry(entryId);
    if (!entry) {
      throw new Error('Entry not found');
    }

    if (entry.draftCompleted) {
      throw new Error('Draft already completed');
    }

    // Check if session already exists
    const existing = this.draftSessions.get(entryId);
    if (existing) {
      return existing.session;
    }

    const tournament = db.getTournament(entry.tournamentId);
    if (!tournament || (tournament.status !== 'drafting' && tournament.status !== 'upcoming')) {
      throw new Error('Tournament is not in drafting phase');
    }

    // Generate first round options
    const firstRoundOptions = this.generateDraftOptions(entryId, 1);

    const session: DraftSession = {
      entryId,
      tournamentId: entry.tournamentId,
      currentRound: 1,
      rounds: [
        {
          roundNumber: 1,
          options: firstRoundOptions,
          timeLimit: this.PICK_TIME_LIMIT,
        },
      ],
      status: 'in_progress',
      startedAt: Date.now(),
    };

    // Store session with timer
    const activeSession: ActiveDraftSession = {
      session,
      timer: null, // Could add auto-pick timer here
    };
    this.draftSessions.set(entryId, activeSession);

    return session;
  }

  generateDraftOptions(entryId: string, roundNumber: number): Memecoin[] {
    // Get already picked coins for this entry
    const picks = db.getPicksForEntry(entryId);
    const pickedCoinIds = picks.map(p => p.coinId);

    // Get random coins not already picked
    return db.getRandomMemecoinOptions(pickedCoinIds, this.OPTIONS_PER_ROUND);
  }

  makePick(entryId: string, roundNumber: number, coinId: string): DraftPick {
    const activeSession = this.draftSessions.get(entryId);
    if (!activeSession) {
      throw new Error('No active draft session');
    }

    const session = activeSession.session;
    if (session.currentRound !== roundNumber) {
      throw new Error('Invalid round number');
    }

    const currentRound = session.rounds.find(r => r.roundNumber === roundNumber);
    if (!currentRound) {
      throw new Error('Round not found');
    }

    // Validate coin is in options
    const selectedCoin = currentRound.options.find(c => c.id === coinId);
    if (!selectedCoin) {
      throw new Error('Invalid coin selection');
    }

    // Create the pick
    const pick = db.createPick(
      entryId,
      selectedCoin.id,
      selectedCoin.symbol,
      selectedCoin.name,
      selectedCoin.logoUrl,
      roundNumber,
      selectedCoin.currentPrice
    );

    // Mark round as complete
    currentRound.selectedCoinId = coinId;

    // Check if draft is complete
    if (roundNumber >= this.PICKS_PER_ENTRY) {
      session.status = 'completed';
      db.markDraftCompleted(entryId);
      this.draftSessions.delete(entryId);
      this.notify('draft_completed', this.getFullEntry(entryId));
    } else {
      // Generate next round
      const nextOptions = this.generateDraftOptions(entryId, roundNumber + 1);
      const nextRound: DraftRound = {
        roundNumber: roundNumber + 1,
        options: nextOptions,
        timeLimit: this.PICK_TIME_LIMIT,
      };
      session.rounds.push(nextRound);
      session.currentRound = roundNumber + 1;
    }

    return pick;
  }

  getDraftSession(entryId: string): DraftSession | null {
    return this.draftSessions.get(entryId)?.session || null;
  }

  // ===================
  // Power-ups
  // ===================

  canUseSwap(entryId: string, pickId: string): boolean {
    if (db.hasPowerupBeenUsed(entryId, 'swap')) return false;

    const pick = db.getPick(pickId);
    if (!pick || pick.entryId !== entryId) return false;
    if (pick.isFrozen || pick.boostMultiplier > 1) return false;

    return true;
  }

  canUseBoost(entryId: string, pickId: string): boolean {
    if (db.hasPowerupBeenUsed(entryId, 'boost')) return false;

    const pick = db.getPick(pickId);
    if (!pick || pick.entryId !== entryId) return false;
    if (pick.boostMultiplier > 1) return false; // Already boosted

    return true;
  }

  canUseFreeze(entryId: string, pickId: string): boolean {
    if (db.hasPowerupBeenUsed(entryId, 'freeze')) return false;

    const pick = db.getPick(pickId);
    if (!pick || pick.entryId !== entryId) return false;
    if (pick.isFrozen) return false; // Already frozen

    return true;
  }

  useSwap(entryId: string, pickId: string): { options: Memecoin[] } {
    if (!this.canUseSwap(entryId, pickId)) {
      throw new Error('Cannot use swap power-up');
    }

    // Get coins not in portfolio
    const picks = db.getPicksForEntry(entryId);
    const pickedCoinIds = picks.map(p => p.coinId);
    const options = db.getRandomMemecoinOptions(pickedCoinIds, this.SWAP_OPTIONS_COUNT);

    return { options };
  }

  selectSwapCoin(entryId: string, pickId: string, newCoinId: string): DraftPick {
    if (!this.canUseSwap(entryId, pickId)) {
      throw new Error('Cannot use swap power-up');
    }

    const pick = db.getPick(pickId);
    if (!pick) {
      throw new Error('Pick not found');
    }

    const newCoin = coinMarketCapService.getMemecoin(newCoinId);
    if (!newCoin) {
      throw new Error('Invalid coin selection');
    }

    // Swap the coin
    db.swapPick(pickId, newCoin.id, newCoin.symbol, newCoin.name, newCoin.logoUrl, newCoin.currentPrice);

    // Record power-up usage
    db.recordPowerupUsage(entryId, 'swap', pickId, {
      swappedFromCoinId: pick.coinId,
      swappedToCoinId: newCoinId,
    });

    const updatedPick = db.getPick(pickId)!;
    this.notify('powerup_used', { entryId, type: 'swap', pick: updatedPick });

    return updatedPick;
  }

  useBoost(entryId: string, pickId: string): DraftPick {
    if (!this.canUseBoost(entryId, pickId)) {
      throw new Error('Cannot use boost power-up');
    }

    db.boostPick(pickId);
    db.recordPowerupUsage(entryId, 'boost', pickId, { boostedCoinId: pickId });

    const pick = db.getPick(pickId)!;
    this.notify('powerup_used', { entryId, type: 'boost', pick });

    return pick;
  }

  useFreeze(entryId: string, pickId: string): DraftPick {
    if (!this.canUseFreeze(entryId, pickId)) {
      throw new Error('Cannot use freeze power-up');
    }

    const pick = db.getPick(pickId)!;
    const currentPrice = coinMarketCapService.getPrice(pick.coinId);
    const percentChange = ((currentPrice - pick.priceAtDraft) / pick.priceAtDraft) * 100;

    db.freezePick(pickId, currentPrice, percentChange);
    db.recordPowerupUsage(entryId, 'freeze', pickId, { frozenPrice: currentPrice });

    const updatedPick = db.getPick(pickId)!;
    this.notify('powerup_used', { entryId, type: 'freeze', pick: updatedPick });

    return updatedPick;
  }

  // ===================
  // Scoring
  // ===================

  calculateScore(entry: DraftEntry): number {
    let totalScore = 0;

    for (const pick of entry.picks) {
      let percentChange: number;

      if (pick.isFrozen && pick.frozenPercentChange !== undefined) {
        // Use frozen percentage (can't go below this)
        const currentPrice = coinMarketCapService.getPrice(pick.coinId);
        const currentChange = ((currentPrice - pick.priceAtDraft) / pick.priceAtDraft) * 100;
        percentChange = Math.max(pick.frozenPercentChange, currentChange);
      } else {
        const currentPrice = coinMarketCapService.getPrice(pick.coinId);
        percentChange = ((currentPrice - pick.priceAtDraft) / pick.priceAtDraft) * 100;
      }

      // Apply boost multiplier
      totalScore += percentChange * pick.boostMultiplier;
    }

    return totalScore;
  }

  updateAllScores(): void {
    const tournaments = db.getAllActiveTournaments();

    for (const tournament of tournaments) {
      if (tournament.status !== 'active') continue;

      const entries = this.getEntriesForTournament(tournament.id);
      for (const entry of entries) {
        if (!entry.draftCompleted) continue;

        const score = this.calculateScore(entry);
        db.setEntryScore(entry.id, score);

        this.notify('score_update', { entryId: entry.id, currentScore: score, tournamentId: tournament.id });
      }

      // Also broadcast leaderboard update
      const leaderboard = this.getLeaderboard(tournament.id);
      this.notify('leaderboard_update', { tournamentId: tournament.id, leaderboard });
    }
  }

  getLeaderboard(tournamentId: string): DraftLeaderboardEntry[] {
    const entries = this.getEntriesForTournament(tournamentId);

    // Sort by score (highest first)
    const sortedEntries = entries
      .filter(e => e.draftCompleted)
      .sort((a, b) => (b.finalScore || 0) - (a.finalScore || 0));

    return sortedEntries.map((entry, index) => ({
      rank: index + 1,
      walletAddress: entry.walletAddress,
      totalScore: entry.finalScore || this.calculateScore(entry),
      picks: entry.picks.map(pick => {
        const currentPrice = coinMarketCapService.getPrice(pick.coinId);
        let percentChange = ((currentPrice - pick.priceAtDraft) / pick.priceAtDraft) * 100;

        if (pick.isFrozen && pick.frozenPercentChange !== undefined) {
          percentChange = Math.max(pick.frozenPercentChange, percentChange);
        }

        return {
          coinSymbol: pick.coinSymbol,
          percentChange: percentChange * pick.boostMultiplier,
          isBoosted: pick.boostMultiplier > 1,
          isFrozen: pick.isFrozen,
        };
      }),
      payout: entry.payoutLamports,
    }));
  }

  // ===================
  // Settlement
  // ===================

  async settleTournament(tournamentId: string): Promise<void> {
    const tournament = db.getTournament(tournamentId);
    if (!tournament || tournament.status === 'completed') {
      return;
    }

    const entries = this.getEntriesForTournament(tournamentId);
    const completedEntries = entries.filter(e => e.draftCompleted);

    // Calculate final scores and update end prices
    for (const entry of completedEntries) {
      for (const pick of entry.picks) {
        const endPrice = coinMarketCapService.getPrice(pick.coinId);
        let percentChange = ((endPrice - pick.priceAtDraft) / pick.priceAtDraft) * 100;

        if (pick.isFrozen && pick.frozenPercentChange !== undefined) {
          percentChange = Math.max(pick.frozenPercentChange, percentChange);
        }

        db.updatePickEndPrice(pick.id, endPrice, percentChange);
      }

      const finalScore = this.calculateScore(entry);
      db.setEntryScore(entry.id, finalScore);
    }

    // Sort by final score
    const rankedEntries = completedEntries
      .map(e => ({
        ...e,
        finalScore: e.finalScore || this.calculateScore(e),
      }))
      .sort((a, b) => b.finalScore - a.finalScore);

    // Calculate payouts (top 10%) - now in lamports!
    const prizePoolLamports = tournament.prizePoolLamports * (1 - this.RAKE_PERCENT / 100);
    const topCount = Math.max(1, Math.floor(rankedEntries.length * 0.1));

    // Distribute payouts and credit winners on-chain
    await this.distributePayouts(rankedEntries, topCount, prizePoolLamports, tournamentId);

    // Award XP based on placement
    this.awardTournamentXp(rankedEntries, topCount, tournament);

    // Mark tournament as settled
    db.settleTournament(tournamentId);

    console.log(`[Draft] Tournament ${tournamentId} settled. ${rankedEntries.length} entries, ${topCount} winners.`);

    // Notify
    this.notify('tournament_settled', {
      tournament: db.getTournament(tournamentId),
      leaderboard: this.getLeaderboard(tournamentId),
    });
  }

  private async distributePayouts(
    rankedEntries: DraftEntry[],
    topCount: number,
    prizePoolLamports: number,
    tournamentId: string
  ): Promise<void> {
    // Fixed percentages for top 3
    const fixedPayouts = [
      { rank: 1, percent: 30 },
      { rank: 2, percent: 20 },
      { rank: 3, percent: 15 },
    ];

    // Remaining 35% split among 4th place and beyond
    const remainingPercent = 35;
    const remainingCount = Math.max(0, topCount - 3);
    const perRemainingPercent = remainingCount > 0 ? remainingPercent / remainingCount : 0;

    for (let i = 0; i < topCount && i < rankedEntries.length; i++) {
      const entry = rankedEntries[i];
      const rank = i + 1;

      let payoutLamports: number;
      const fixedPayout = fixedPayouts.find(p => p.rank === rank);

      if (fixedPayout) {
        payoutLamports = Math.floor((prizePoolLamports * fixedPayout.percent) / 100);
      } else {
        payoutLamports = Math.floor((prizePoolLamports * perRemainingPercent) / 100);
      }

      // Record payout in database
      db.setEntryRankAndPayout(entry.id, rank, payoutLamports);

      // CRITICAL: Actually credit winnings on-chain!
      if (payoutLamports > 0) {
        try {
          const tx = await balanceService.creditWinnings(
            entry.walletAddress,
            payoutLamports,
            'draft',
            tournamentId
          );
          console.log(`[Draft] Credited ${payoutLamports / 1_000_000_000} SOL to ${entry.walletAddress} (rank ${rank}). TX: ${tx}`);
        } catch (error) {
          console.error(`[Draft] Failed to credit winnings to ${entry.walletAddress}:`, error);
          // Log but continue - we'll need to handle failed credits separately
        }
      }

      // Record win to user_wagers for stats tracking and share verification
      try {
        const entryFeeSol = this.getEntryFeeForTournament(tournamentId);
        const payoutSol = payoutLamports / 1_000_000_000;
        const profitLoss = payoutSol - entryFeeSol;
        userStatsDb.recordWager(
          entry.walletAddress,
          'draft',
          entryFeeSol,
          'won',
          profitLoss,
          tournamentId
        );
      } catch (error) {
        console.error(`[Draft] Failed to record win for ${entry.walletAddress}:`, error);
      }
    }

    // Set ranks for non-winning entries and record their losses
    for (let i = topCount; i < rankedEntries.length; i++) {
      const entry = rankedEntries[i];
      db.setEntryRankAndPayout(entry.id, i + 1, 0);

      // Record loss to user_wagers for stats tracking
      try {
        const entryFeeSol = this.getEntryFeeForTournament(tournamentId);
        userStatsDb.recordWager(
          entry.walletAddress,
          'draft',
          entryFeeSol,
          'lost',
          -entryFeeSol,
          tournamentId
        );
      } catch (error) {
        console.error(`[Draft] Failed to record loss for ${entry.walletAddress}:`, error);
      }
    }
  }

  // Helper to get entry fee in SOL for a tournament
  private getEntryFeeForTournament(tournamentId: string): number {
    const tournament = db.getTournament(tournamentId);
    return tournament ? tournament.entryFeeLamports / 1_000_000_000 : 0;
  }

  // Award XP based on tournament placement
  private awardTournamentXp(
    rankedEntries: DraftEntry[],
    topCount: number,
    tournament: DraftTournament
  ): void {
    // Convert lamports to SOL for XP calculation (XP based on SOL value)
    const entryFeeSOL = tournament.entryFeeLamports / 1_000_000_000;

    for (let i = 0; i < rankedEntries.length; i++) {
      const entry = rankedEntries[i];
      const rank = i + 1;

      let xpAmount: number;
      let description: string;

      if (rank === 1) {
        // Winner: 1000 XP + (entrySOL × 1000)
        xpAmount = 1000 + Math.floor(entryFeeSOL * 1000);
        description = 'Won tournament!';
      } else if (rank <= 3) {
        // Top 3: 500 XP + (entrySOL × 500)
        xpAmount = 500 + Math.floor(entryFeeSOL * 500);
        description = `Top 3 finish (#${rank})`;
      } else if (rank <= topCount) {
        // Top 10%: 200 XP + (entrySOL × 200)
        xpAmount = 200 + Math.floor(entryFeeSOL * 200);
        description = `Top 10% finish (#${rank})`;
      } else {
        // Participated but didn't place: minimal XP (already got 50 XP for entering)
        continue; // No additional XP for non-placing entries
      }

      progressionService.awardXp(
        entry.walletAddress,
        xpAmount,
        'draft',
        entry.id,
        description
      );
    }
  }

  // ===================
  // Pub/Sub
  // ===================

  subscribe(listener: (event: string, data: any) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(event: string, data: any): void {
    this.listeners.forEach(listener => {
      try {
        listener(event, data);
      } catch (error) {
        console.error('Error in draft tournament listener:', error);
      }
    });
  }
}

// Singleton instance
export const draftTournamentManager = new DraftTournamentManager();
