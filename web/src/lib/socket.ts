import { io, Socket } from 'socket.io-client';
import { Battle, BattleConfig, PerpPosition, TradeRecord, PositionSide, Leverage, LiveBattle, BattleOdds, SpectatorBet, PredictionRound, PredictionBet, PredictionSide } from '@/types';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

interface ServerToClientEvents {
  battle_update: (battle: Battle) => void;
  price_update: (prices: Record<string, number>) => void;
  position_opened: (position: PerpPosition) => void;
  position_closed: (trade: TradeRecord) => void;
  battle_started: (battle: Battle) => void;
  battle_ended: (battle: Battle) => void;
  error: (message: string) => void;
  matchmaking_status: (status: { position: number; estimated: number }) => void;
  // Spectator events
  live_battles: (battles: LiveBattle[]) => void;
  spectator_battle_update: (battle: LiveBattle) => void;
  odds_update: (odds: BattleOdds) => void;
  bet_placed: (bet: SpectatorBet) => void;
  bet_settled: (bet: SpectatorBet) => void;
  spectator_count: (data: { battleId: string; count: number }) => void;
  // Prediction events
  prediction_round: (round: PredictionRound) => void;
  prediction_history: (rounds: PredictionRound[]) => void;
  prediction_settled: (round: PredictionRound) => void;
  prediction_bet_placed: (bet: PredictionBet) => void;
}

interface ClientToServerEvents {
  join_battle: (battleId: string, walletAddress: string) => void;
  create_battle: (config: BattleConfig, walletAddress: string) => void;
  queue_matchmaking: (config: BattleConfig, walletAddress: string) => void;
  start_solo_practice: (config: BattleConfig, walletAddress: string) => void;
  open_position: (battleId: string, asset: string, side: PositionSide, leverage: Leverage, size: number) => void;
  close_position: (battleId: string, positionId: string) => void;
  leave_battle: (battleId: string) => void;
  subscribe_prices: (tokens: string[]) => void;
  // Spectator events
  subscribe_live_battles: () => void;
  unsubscribe_live_battles: () => void;
  spectate_battle: (battleId: string) => void;
  leave_spectate: (battleId: string) => void;
  place_bet: (battleId: string, backedPlayer: string, amount: number, walletAddress: string) => void;
  get_my_bets: (walletAddress: string) => void;
  // Prediction events
  subscribe_prediction: (asset: string) => void;
  unsubscribe_prediction: (asset: string) => void;
  place_prediction: (asset: string, side: PredictionSide, amount: number, walletAddress: string) => void;
}

type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

let socket: TypedSocket | null = null;

export function getSocket(): TypedSocket {
  if (!socket) {
    socket = io(BACKEND_URL, {
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    }) as TypedSocket;

    socket.on('connect', () => {
      // Connection established
    });

    socket.on('disconnect', () => {
      // Connection lost
    });

    socket.on('error', () => {
      // Socket error handled by context
    });
  }

  return socket;
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
