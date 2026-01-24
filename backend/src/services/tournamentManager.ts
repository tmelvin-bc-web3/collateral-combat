import * as cron from 'node-cron';
import * as db from '../db/tournamentDatabase';
import { createLogger } from '../utils/logger';
import { PLATFORM_FEE_BPS, calculateDistributablePool } from '../utils/fees';
import { balanceService } from './balanceService';
import { notifyTournamentMatchReady } from '../db/notificationDatabase';
import { TOURNAMENT_PRIZE_DISTRIBUTION, TournamentEvent } from '../types';

const logger = createLogger('tournament-manager');

// Configuration
const REGISTRATION_CLOSES_MINUTES_BEFORE = 30;
const MATCH_INTERVAL_MINUTES = 10; // Time between rounds

// Round names for display
const ROUND_NAMES: Record<number, Record<number, string>> = {
  8: { 1: 'Quarterfinal', 2: 'Semifinal', 3: 'Final' },
  16: { 1: 'Round of 16', 2: 'Quarterfinal', 3: 'Semifinal', 4: 'Final' }
};

type TournamentListener = (event: TournamentEvent) => void;

class TournamentManager {
  private listeners: Set<TournamentListener> = new Set();
  private schedulerTask: cron.ScheduledTask | null = null;
  private tickerInterval: NodeJS.Timeout | null = null;
  private initialized = false;
  private io: any = null;

  initialize(): void {
    if (this.initialized) {
      logger.warn('TournamentManager already initialized');
      return;
    }

    logger.info('Initializing TournamentManager');

    // Resume any in-progress tournaments
    const active = db.getActive();
    for (const tournament of active) {
      logger.info('Resuming tournament', { id: tournament.id, name: tournament.name });
    }

    // Schedule daily tournaments at fixed times (12:00 UTC and 20:00 UTC)
    this.schedulerTask = cron.schedule('0 12,20 * * *', () => {
      this.createScheduledTournaments();
    }, { timezone: 'UTC' });

    // Start ticker for state transitions
    this.tickerInterval = setInterval(() => this.tick(), 60 * 1000);

    this.initialized = true;
    logger.info('TournamentManager initialized');
  }

  setSocketIO(io: any): void {
    this.io = io;
  }

  private createScheduledTournaments(): void {
    const now = Date.now();
    const startTime = now + 2 * 60 * 60 * 1000; // 2 hours from now
    const registrationOpens = now;
    const registrationCloses = startTime - REGISTRATION_CLOSES_MINUTES_BEFORE * 60 * 1000;

    // Create both 8 and 16 player tournaments
    for (const size of [8, 16] as const) {
      const entryFee = size === 8 ? 0.1 * 1e9 : 0.25 * 1e9; // 0.1 SOL for 8p, 0.25 SOL for 16p
      const name = `${size}-Player Tournament - ${new Date(startTime).toISOString().split('T')[0]}`;

      const tournament = db.createTournament(
        name, size, entryFee, startTime, registrationOpens, registrationCloses
      );

      logger.info('Created scheduled tournament', {
        id: tournament.id,
        name: tournament.name,
        size,
        startTime: new Date(startTime).toISOString()
      });

      this.emit({ type: 'tournament_created', tournamentId: tournament.id, data: tournament });
    }
  }

  private tick(): void {
    const now = Date.now();
    const upcoming = db.getUpcoming();

    for (const tournament of upcoming) {
      // Open registration
      if (tournament.status === 'upcoming' && now >= tournament.registrationOpens) {
        db.setStatus(tournament.id, 'registration_open');
        this.emit({ type: 'registration_opened', tournamentId: tournament.id, data: tournament });
      }

      // Close registration and start tournament
      if (tournament.status === 'registration_open' && now >= tournament.scheduledStartTime) {
        this.startTournament(tournament.id);
      }
    }

    // Check for ready matches that need battles created
    const active = db.getActive();
    for (const tournament of active) {
      this.checkReadyMatches(tournament.id);
    }
  }

  async registerPlayer(tournamentId: string, wallet: string): Promise<void> {
    const tournament = db.getTournament(tournamentId);
    if (!tournament) throw new Error('Tournament not found');
    if (tournament.status !== 'registration_open') throw new Error('Registration not open');
    if (db.isRegistered(tournamentId, wallet)) throw new Error('Already registered');

    const count = db.getPlayerCount(tournamentId);
    if (count >= tournament.size) throw new Error('Tournament full');

    // Verify balance and lock entry fee
    const balance = await balanceService.getOnChainBalance(wallet);
    if (balance < tournament.entryFeeLamports) throw new Error('Insufficient balance');

    // Lock funds via on-chain call
    await balanceService.verifyAndLockBalance(
      wallet,
      tournament.entryFeeLamports,
      'tournament',
      tournamentId
    );

    db.registerPlayer(tournamentId, wallet, tournament.entryFeeLamports);

    // Update prize pool
    const newPrizePool = tournament.prizePoolLamports + tournament.entryFeeLamports;
    db.setPrizePool(tournamentId, newPrizePool);

    this.emit({
      type: 'player_registered',
      tournamentId,
      data: { wallet, playerCount: count + 1, maxPlayers: tournament.size }
    });

    logger.info('Player registered for tournament', {
      tournamentId,
      wallet: wallet.slice(0, 8),
      playerCount: count + 1
    });
  }

  private startTournament(tournamentId: string): void {
    const tournament = db.getTournament(tournamentId);
    if (!tournament) return;

    const players = db.getRegisteredPlayers(tournamentId);
    if (players.length < tournament.size) {
      logger.info('Not enough players, cancelling tournament', {
        tournamentId,
        registered: players.length,
        required: tournament.size
      });
      this.cancelTournament(tournamentId, 'Not enough players');
      return;
    }

    // Seed players (for now, random shuffle - could use ELO later)
    const shuffled = players.sort(() => Math.random() - 0.5);
    shuffled.forEach((p, i) => db.setSeed(tournamentId, p.walletAddress, i + 1));

    // Generate bracket
    this.generateBracket(tournamentId, shuffled.map(p => p.walletAddress));

    db.setStatus(tournamentId, 'in_progress');
    this.emit({ type: 'tournament_started', tournamentId, data: tournament });
    this.emit({ type: 'bracket_generated', tournamentId, data: db.getMatchesByTournament(tournamentId) });

    logger.info('Tournament started', {
      tournamentId,
      playerCount: players.length
    });
  }

  private generateBracket(tournamentId: string, players: string[]): void {
    const size = players.length as 8 | 16;
    const rounds = Math.log2(size);
    const now = Date.now();

    // Seed players for fairness: 1v8, 4v5, 3v6, 2v7 for 8-player
    const seeded = this.seedPlayers(players, size);

    // Create first round matches
    for (let i = 0; i < size / 2; i++) {
      const scheduledTime = now + MATCH_INTERVAL_MINUTES * 60 * 1000;
      db.createMatch(
        tournamentId, 1, i,
        seeded[i * 2], seeded[i * 2 + 1],
        scheduledTime
      );
    }

    // Create placeholder matches for subsequent rounds
    for (let round = 2; round <= rounds; round++) {
      const matchesInRound = size / Math.pow(2, round);
      for (let pos = 0; pos < matchesInRound; pos++) {
        const scheduledTime = now + (round * MATCH_INTERVAL_MINUTES) * 60 * 1000;
        db.createMatch(tournamentId, round, pos, null, null, scheduledTime);
      }
    }

    // Mark first round matches as ready
    const firstRoundMatches = db.getMatchesByTournament(tournamentId).filter(m => m.round === 1);
    for (const match of firstRoundMatches) {
      db.setMatchStatus(match.id, 'ready');
      // Notify players
      if (match.player1Wallet && match.player2Wallet) {
        const roundName = ROUND_NAMES[size][1];
        const tournament = db.getTournament(tournamentId);
        notifyTournamentMatchReady(match.player1Wallet, tournament?.name || '', match.player2Wallet, 1, roundName);
        notifyTournamentMatchReady(match.player2Wallet, tournament?.name || '', match.player1Wallet, 1, roundName);
        this.emit({ type: 'match_ready', tournamentId, data: match });
      }
    }
  }

  private seedPlayers(players: string[], size: 8 | 16): string[] {
    // Standard seeding: #1 vs #8, #4 vs #5, #3 vs #6, #2 vs #7
    if (size === 8) {
      const positions = [0, 7, 3, 4, 2, 5, 1, 6];
      return positions.map(i => players[i]);
    }
    // 16-player seeding
    const positions = [0, 15, 7, 8, 3, 12, 4, 11, 2, 13, 5, 10, 6, 9, 1, 14];
    return positions.map(i => players[i]);
  }

  private async checkReadyMatches(tournamentId: string): Promise<void> {
    const matches = db.getMatchesByTournament(tournamentId);
    const readyMatches = matches.filter(m => m.status === 'ready' && !m.battleId);

    for (const match of readyMatches) {
      if (!match.player1Wallet || !match.player2Wallet) continue;

      // For now, just log that the match is ready
      // In a full implementation, this would create a battle via battleManager
      logger.info('Tournament match ready for battle creation', {
        matchId: match.id,
        tournamentId,
        player1: match.player1Wallet.slice(0, 8),
        player2: match.player2Wallet.slice(0, 8)
      });

      this.emit({ type: 'match_started', tournamentId, data: { matchId: match.id } });
    }
  }

  onMatchComplete(matchId: string, winnerWallet: string): void {
    const match = db.getMatch(matchId);
    if (!match) return;

    // Use transaction to advance winner atomically
    const nextMatch = db.advanceWinner(matchId, winnerWallet);

    this.emit({
      type: 'match_completed',
      tournamentId: match.tournamentId,
      data: { matchId, winnerWallet, nextMatchId: nextMatch?.id }
    });

    // Check if tournament is complete
    const tournament = db.getTournament(match.tournamentId);
    if (!tournament) return;

    const totalRounds = Math.log2(tournament.size);
    if (match.round === totalRounds) {
      // This was the final - tournament is complete
      this.completeTournament(match.tournamentId, winnerWallet);
    } else if (nextMatch) {
      // Notify next match is ready
      const updatedNext = db.getMatch(nextMatch.id);
      if (updatedNext && updatedNext.player1Wallet && updatedNext.player2Wallet) {
        const roundName = ROUND_NAMES[tournament.size][updatedNext.round];
        notifyTournamentMatchReady(updatedNext.player1Wallet, tournament.name, updatedNext.player2Wallet, updatedNext.round, roundName);
        notifyTournamentMatchReady(updatedNext.player2Wallet, tournament.name, updatedNext.player1Wallet, updatedNext.round, roundName);
        this.emit({ type: 'match_ready', tournamentId: match.tournamentId, data: updatedNext });
      }
    }
  }

  private async completeTournament(tournamentId: string, champion: string): Promise<void> {
    const tournament = db.getTournament(tournamentId);
    if (!tournament) return;

    db.setStatus(tournamentId, 'completed');

    // Calculate prize distribution
    const netPool = calculateDistributablePool(tournament.prizePoolLamports, PLATFORM_FEE_BPS);
    const distribution = TOURNAMENT_PRIZE_DISTRIBUTION[tournament.size];

    // Determine final standings from bracket
    const matches = db.getMatchesByTournament(tournamentId);
    const standings = this.calculateStandings(matches, tournament.size, champion);

    // Distribute prizes
    for (const { place, wallet } of standings) {
      const prizeInfo = distribution.find(d => d.place === place);
      if (prizeInfo && wallet) {
        const payout = Math.floor(netPool * prizeInfo.percent / 100);
        if (payout > 0) {
          try {
            const tx = await balanceService.creditWinnings(wallet, payout, 'tournament', tournamentId);
            logger.info('Tournament payout', { tournamentId, wallet: wallet.slice(0, 8), place, payout, tx });
          } catch (err) {
            logger.error('Failed to credit tournament winnings', { tournamentId, wallet: wallet.slice(0, 8), place, payout, error: String(err) });
          }
        }
      }
    }

    this.emit({ type: 'tournament_completed', tournamentId, data: { champion, standings } });
    logger.info('Tournament completed', { tournamentId, champion: champion.slice(0, 8) });
  }

  private calculateStandings(matches: db.TournamentMatch[], size: 8 | 16, champion: string): { place: number; wallet: string }[] {
    const standings: { place: number; wallet: string }[] = [{ place: 1, wallet: champion }];

    // Find final match loser (2nd place)
    const totalRounds = Math.log2(size);
    const finalMatch = matches.find(m => m.round === totalRounds);
    if (finalMatch) {
      const runnerUp = finalMatch.player1Wallet === champion ? finalMatch.player2Wallet : finalMatch.player1Wallet;
      if (runnerUp) standings.push({ place: 2, wallet: runnerUp });
    }

    // Semifinal losers split 3rd/4th
    const semifinalMatches = matches.filter(m => m.round === totalRounds - 1);
    let place = 3;
    for (const match of semifinalMatches) {
      if (match.winnerWallet && match.player1Wallet && match.player2Wallet) {
        const loser = match.player1Wallet === match.winnerWallet ? match.player2Wallet : match.player1Wallet;
        standings.push({ place: place++, wallet: loser });
      }
    }

    return standings;
  }

  private async cancelTournament(tournamentId: string, reason: string): Promise<void> {
    db.setStatus(tournamentId, 'cancelled');

    // Refund all registered players
    const players = db.getRegisteredPlayers(tournamentId);
    const tournament = db.getTournament(tournamentId);

    for (const player of players) {
      try {
        await balanceService.refundFromGlobalVault(
          player.walletAddress,
          player.entryFeePaidLamports,
          'tournament',
          tournamentId
        );
        logger.info('Refunded tournament entry', {
          tournamentId,
          wallet: player.walletAddress.slice(0, 8),
          amount: player.entryFeePaidLamports
        });
      } catch (err) {
        logger.error('Failed to refund tournament entry', {
          tournamentId,
          wallet: player.walletAddress.slice(0, 8),
          error: String(err)
        });
      }
    }

    logger.info('Tournament cancelled', { tournamentId, reason });
  }

  // Public API
  getTournament(id: string) { return db.getTournament(id); }
  getUpcomingTournaments() { return db.getUpcoming(); }
  getActiveTournaments() { return db.getActive(); }
  getTournamentMatches(id: string) { return db.getMatchesByTournament(id); }
  getRegisteredPlayers(id: string) { return db.getRegisteredPlayers(id); }

  subscribe(listener: TournamentListener): void { this.listeners.add(listener); }
  unsubscribe(listener: TournamentListener): void { this.listeners.delete(listener); }

  private emit(event: TournamentEvent): void {
    for (const listener of this.listeners) {
      try { listener(event); } catch (err) { logger.error('Listener error', { error: String(err) }); }
    }
    if (this.io) {
      this.io.to(`tournament:${event.tournamentId}`).emit('tournament_update', event);
    }
  }

  shutdown(): void {
    if (this.schedulerTask) this.schedulerTask.stop();
    if (this.tickerInterval) clearInterval(this.tickerInterval);
    this.initialized = false;
    logger.info('TournamentManager shutdown');
  }
}

export const tournamentManager = new TournamentManager();
