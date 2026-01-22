// Scheduled Match Types (mirrors backend types)

export type ScheduledMatchStatus =
  | 'upcoming'
  | 'registration_open'
  | 'starting'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

export interface ScheduledMatch {
  id: string;
  gameMode: 'battle';
  scheduledStartTime: number;  // UTC timestamp (ms)
  registrationOpens: number;   // UTC timestamp (ms)
  registrationCloses: number;  // UTC timestamp (ms)
  minPlayers: number;
  maxPlayers: number;
  registeredPlayers: string[]; // wallet addresses
  confirmedPlayers: string[];  // players who passed ready check
  status: ScheduledMatchStatus;
  entryFee: number;            // in SOL
  createdAt: number;
}

export interface ReadyCheckData {
  matchId: string;
  expiresAt: number;  // UTC timestamp (ms)
}

// Socket event types for scheduled matches
export interface ScheduledMatchesListEvent {
  matches: ScheduledMatch[];
}

export interface ScheduledMatchCreatedEvent {
  match: ScheduledMatch;
}

export interface ScheduledMatchUpdatedEvent {
  match: ScheduledMatch;
}

export interface ScheduledReadyCheckEvent {
  matchId: string;
  expiresAt: number;
}

export interface MatchRegistrationSuccessEvent {
  matchId: string;
  message: string;
}

export interface MatchRegistrationErrorEvent {
  matchId: string;
  error: string;
}
