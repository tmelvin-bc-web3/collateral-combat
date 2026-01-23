import { io, Socket } from 'socket.io-client';
import { Battle, BattleConfig, PerpPosition, TradeRecord, PositionSide, Leverage, LiveBattle, BattleOdds, SpectatorBet, PredictionRound, PredictionBet, PredictionSide, DraftTournament, DraftSession, DraftRound, DraftPick, DraftEntry, DraftLeaderboardEntry, Memecoin, PowerUpUsage, UserProgression, XpGainEvent, LevelUpEvent, UserPerk, RebateReceivedEvent, OddsLock, SignedTradePayload, ReadyCheckResponse, ReadyCheckUpdate, ReadyCheckCancelled, ChallengeAcceptedNotification, ChatMessage } from '@/types';
import { ScheduledMatch } from '@/types/scheduled';
import { BACKEND_URL } from '@/config/api';

interface ServerToClientEvents {
  battle_update: (battle: Battle) => void;
  price_update: (prices: Record<string, number>) => void;
  position_opened: (position: PerpPosition) => void;
  position_closed: (trade: TradeRecord) => void;
  battle_started: (battle: Battle) => void;
  battle_ended: (battle: Battle) => void;
  battle_settled: (data: { battleId: string; txSignature: string; winnerId: string }) => void;
  error: (message: string) => void;
  matchmaking_status: (status: { position: number; estimated: number }) => void;
  // Spectator events
  live_battles: (battles: LiveBattle[]) => void;
  spectator_battle_update: (battle: LiveBattle) => void;
  odds_update: (odds: BattleOdds) => void;
  bet_placed: (bet: SpectatorBet) => void;
  bet_settled: (bet: SpectatorBet) => void;
  spectator_count: (data: { battleId: string; count: number }) => void;
  user_bets: (bets: SpectatorBet[]) => void;
  odds_lock: (lock: OddsLock) => void;
  bet_verified: (bet: SpectatorBet) => void;
  unclaimed_bets: (bets: SpectatorBet[]) => void;
  claim_verified: (data: { betId: string; txSignature: string }) => void;
  // Prediction events
  prediction_round: (round: PredictionRound) => void;
  prediction_history: (rounds: PredictionRound[]) => void;
  prediction_settled: (round: PredictionRound) => void;
  prediction_bet_placed: (bet: PredictionBet) => void;
  prediction_bet_result: (result: { success: boolean; error?: string; bet?: PredictionBet }) => void;
  // Draft events
  draft_tournament_update: (tournament: DraftTournament) => void;
  draft_session_update: (session: DraftSession) => void;
  draft_round_options: (round: DraftRound) => void;
  draft_pick_confirmed: (pick: DraftPick) => void;
  draft_completed: (entry: DraftEntry) => void;
  draft_leaderboard_update: (data: { tournamentId: string; leaderboard: DraftLeaderboardEntry[] }) => void;
  draft_score_update: (data: { entryId: string; currentScore: number }) => void;
  draft_swap_options: (data: { pickId: string; options: Memecoin[] }) => void;
  powerup_used: (usage: PowerUpUsage) => void;
  memecoin_prices_update: (prices: Record<string, number>) => void;
  draft_error: (message: string) => void;
  // Progression events
  progression_update: (progression: UserProgression) => void;
  xp_gained: (data: XpGainEvent) => void;
  level_up: (data: LevelUpEvent) => void;
  perk_activated: (perk: UserPerk) => void;
  perk_expired: (data: { perkId: number }) => void;
  // Rebate events
  rebate_received: (data: RebateReceivedEvent) => void;
  // Ready check events
  match_found: (data: ReadyCheckResponse) => void;
  ready_check_update: (data: ReadyCheckUpdate) => void;
  ready_check_cancelled: (data: ReadyCheckCancelled) => void;
  // Challenge notification events
  challenge_accepted: (data: ChallengeAcceptedNotification) => void;
  // LDS (Last Degen Standing) events
  lds_event: (event: any) => void;
  lds_game_state: (state: any) => void;
  lds_join_success: (data: { game: any }) => void;
  lds_join_error: (data: { error: string }) => void;
  lds_leave_success: (data: {}) => void;
  lds_leave_error: (data: { error: string }) => void;
  lds_prediction_success: (data: {}) => void;
  lds_prediction_error: (data: { error: string }) => void;
  // Token Wars events
  token_wars_event: (event: any) => void;
  token_wars_battle_state: (state: any) => void;
  token_wars_bet_success: (data: { bet: any }) => void;
  token_wars_bet_error: (data: { error: string }) => void;
  // Battle Chat events
  chat_message: (message: ChatMessage) => void;
  chat_history: (messages: ChatMessage[]) => void;
  chat_error: (error: { code: string; message: string }) => void;
  chat_system: (message: { battleId: string; content: string }) => void;
  reaction_update: (data: { battleId: string; messageId: string; emoji: string; wallet: string; action: 'add' | 'remove' }) => void;
  // Scheduled Matches events
  scheduled_matches_list: (matches: ScheduledMatch[]) => void;
  scheduled_match_updated: (match: ScheduledMatch) => void;
  scheduled_match_created: (match: ScheduledMatch) => void;
  scheduled_ready_check: (data: { matchId: string; expiresAt: number }) => void;
  match_registration_success: (data: { matchId: string; message: string }) => void;
}

interface ClientToServerEvents {
  join_battle: (battleId: string, walletAddress: string) => void;
  create_battle: (config: BattleConfig, walletAddress: string) => void;
  queue_matchmaking: (config: BattleConfig, walletAddress: string) => void;
  start_solo_practice: (data: { config: BattleConfig; wallet: string; onChainBattleId?: string }) => void;
  open_position: (battleId: string, asset: string, side: PositionSide, leverage: Leverage, size: number) => void;
  close_position: (battleId: string, positionId: string) => void;
  open_position_signed: (payload: SignedTradePayload) => void;
  close_position_signed: (payload: SignedTradePayload) => void;
  leave_battle: (battleId: string) => void;
  subscribe_prices: (tokens: string[]) => void;
  // Ready check events
  register_wallet: (walletAddress: string) => void;
  accept_match: (battleId: string) => void;
  decline_match: (battleId: string) => void;
  // Challenge notification events
  subscribe_challenge_notifications: (walletAddress: string) => void;
  unsubscribe_challenge_notifications: (walletAddress: string) => void;
  // Spectator events
  subscribe_live_battles: () => void;
  unsubscribe_live_battles: () => void;
  spectate_battle: (battleId: string) => void;
  leave_spectate: (battleId: string) => void;
  place_bet: (battleId: string, backedPlayer: string, amount: number, walletAddress: string) => void;
  get_my_bets: (walletAddress: string) => void;
  request_odds_lock: (data: { battleId: string; backedPlayer: string; amount: number; walletAddress: string }) => void;
  verify_bet: (data: { lockId: string; txSignature: string; walletAddress: string }) => void;
  get_unclaimed_bets: (walletAddress: string) => void;
  verify_claim: (data: { betId: string; txSignature: string; walletAddress: string }) => void;
  // Prediction events
  subscribe_prediction: (asset: string) => void;
  unsubscribe_prediction: (asset: string) => void;
  place_prediction: (asset: string, side: PredictionSide, amount: number, walletAddress: string) => void;
  place_prediction_bet: (data: { asset: string; side: PredictionSide; amount: number; bettor: string; useFreeBet?: boolean }) => void;
  // Draft events
  start_draft: (entryId: string) => void;
  make_draft_pick: (entryId: string, roundNumber: number, coinId: string) => void;
  use_powerup_swap: (entryId: string, pickId: string) => void;
  select_swap_coin: (entryId: string, pickId: string, coinId: string) => void;
  use_powerup_boost: (entryId: string, pickId: string) => void;
  use_powerup_freeze: (entryId: string, pickId: string) => void;
  subscribe_draft_tournament: (tournamentId: string) => void;
  unsubscribe_draft_tournament: (tournamentId: string) => void;
  // Progression events
  subscribe_progression: (walletAddress: string) => void;
  unsubscribe_progression: (walletAddress: string) => void;
  // LDS (Last Degen Standing) events
  subscribe_lds: () => void;
  unsubscribe_lds: () => void;
  lds_join_game: (walletAddress: string) => void;
  lds_leave_game: (walletAddress: string) => void;
  lds_submit_prediction: (data: { gameId: string; wallet: string; prediction: 'up' | 'down' }) => void;
  // Token Wars events
  subscribe_token_wars: () => void;
  unsubscribe_token_wars: () => void;
  token_wars_place_bet: (data: { wallet: string; side: 'token_a' | 'token_b'; amountLamports: number; useFreeBet?: boolean }) => void;
  // Battle Chat events
  send_chat_message: (data: { battleId: string; content: string }) => void;
  load_chat_history: (battleId: string) => void;
  add_reaction: (data: { battleId: string; messageId: string; emoji: string }) => void;
  remove_reaction: (data: { battleId: string; messageId: string; emoji: string }) => void;
  // Scheduled Matches events
  subscribe_scheduled_matches: (gameMode: string) => void;
  unsubscribe_scheduled_matches: (gameMode: string) => void;
  register_for_match: (data: { matchId: string; wallet: string }) => void;
  unregister_from_match: (data: { matchId: string; wallet: string }) => void;
  scheduled_ready_check_response: (data: { matchId: string; wallet: string; ready: boolean }) => void;
}

type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

let socket: TypedSocket | null = null;
let currentToken: string | null = null;

/**
 * Get the socket instance, optionally with JWT authentication
 * SECURITY: When authenticated, the server will verify the token and associate
 * the socket with the authenticated wallet. This prevents wallet spoofing.
 */
export function getSocket(token?: string | null): TypedSocket {
  // Normalize undefined to null for consistent comparison
  const normalizedToken = token ?? null;

  // Only reconnect if token actually changed (both normalized)
  if (socket && normalizedToken !== currentToken) {
    console.log('[Socket] Token changed, reconnecting with new auth');
    socket.disconnect();
    socket = null;
  }

  if (!socket) {
    currentToken = normalizedToken;

    socket = io(BACKEND_URL, {
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      // SECURITY: Pass JWT token for socket authentication
      // Server will verify and associate socket with authenticated wallet
      auth: token ? { token } : undefined,
    }) as TypedSocket;

    socket.on('connect', () => {
      console.log('[Socket] Connected to backend:', socket?.id, token ? '(authenticated)' : '(unauthenticated)');
    });

    socket.on('disconnect', (reason) => {
      console.log('[Socket] Disconnected:', reason);
    });

    socket.on('connect_error', (error) => {
      console.error('[Socket] Connection error:', error.message);
    });

    socket.on('error', (message) => {
      console.error('[Socket] Error:', message);
    });
  }

  return socket;
}

/**
 * Update socket authentication with a new token
 * Call this when user signs in or out
 */
export function updateSocketAuth(token: string | null): void {
  if (token !== currentToken) {
    currentToken = token;
    if (socket) {
      socket.disconnect();
      socket = null;
      // Reconnect with new auth
      getSocket(token);
    }
  }
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
    currentToken = null;
  }
}
