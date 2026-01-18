/**
 * Battle Chat Types
 *
 * Real-time chat system for battle spectators and participants.
 */

export type ChatMessageType = 'user' | 'system';
export type SenderRole = 'spectator' | 'fighter_1' | 'fighter_2';

export interface ChatMessage {
  id: string;
  battleId: string;
  senderWallet: string;
  senderDisplayName: string;
  senderLevel: number;
  senderRole: SenderRole;
  content: string;
  wasFiltered: boolean;
  timestamp: number;
  type: ChatMessageType;
}

export interface ChatRoom {
  battleId: string;
  messages: ChatMessage[]; // Last 100 in memory
  fighter1Wallet: string;
  fighter2Wallet: string | null;
  mutedUsers: Map<string, number>; // wallet -> mutedUntil timestamp
  createdAt: number;
}

export interface ChatSendResult {
  success: boolean;
  message?: ChatMessage;
  code?: string;
  error?: string;
}

// User rate tracking for spam detection
export interface UserChatState {
  warningCount: number;
  lastMessageTime: number;
  lastMessage: string;
  messageCount: number;
}

// Events emitted by ChatService
export type ChatEventType = 'message' | 'system' | 'room_created' | 'room_closed';

export interface ChatEventData {
  type: ChatEventType;
  battleId: string;
  message?: ChatMessage;
  content?: string;
}

export type ChatServiceListener = (event: ChatEventType, data: ChatEventData) => void;
