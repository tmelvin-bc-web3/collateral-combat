/**
 * Battle Chat Service
 *
 * Real-time chat system for battle spectators and participants.
 * Chat rooms are created when battles start and destroyed when they end.
 */

import { v4 as uuidv4 } from 'uuid';
import {
  ChatMessage,
  ChatRoom,
  ChatSendResult,
  UserChatState,
  ChatEventType,
  ChatEventData,
  ChatServiceListener,
  SenderRole,
} from '../types/chat';

// ===================
// Configuration
// ===================

const MAX_MESSAGES_PER_ROOM = 100;
const MAX_MESSAGE_LENGTH = 280;
const MUTE_DURATION_MS = 60_000; // 1 minute auto-mute
const WARNING_THRESHOLD = 3; // Warnings before auto-mute
const DUPLICATE_WINDOW_MS = 5_000; // Window to check duplicate messages

// Link patterns to filter
const LINK_PATTERNS = [
  /https?:\/\/[^\s]+/gi,
  /www\.[^\s]+/gi,
  /[a-zA-Z0-9][-a-zA-Z0-9]*\.(com|org|net|io|xyz|gg|co|me|app|dev|tv|live)[^\s]*/gi,
  /\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/g, // IP addresses
];

// Profanity list (basic - can be extended)
const PROFANITY_PATTERNS = [
  /\bn[i1]gg[ae3]r?s?\b/gi,
  /\bf[a@]gg?[o0]ts?\b/gi,
  /\bc[u\*]nt\b/gi,
  /\bk[i1]ke\b/gi,
  /\bsp[i1]c\b/gi,
  /\bch[i1]nk\b/gi,
  /\bwet?back\b/gi,
];

// ===================
// ChatService Class
// ===================

class ChatService {
  private rooms: Map<string, ChatRoom> = new Map();
  private userStates: Map<string, UserChatState> = new Map();
  private listeners: ChatServiceListener[] = [];

  constructor() {
    // Clean up old user states periodically (every 5 minutes)
    setInterval(() => {
      this.cleanupUserStates();
    }, 5 * 60 * 1000);
  }

  // ===================
  // Subscription Management
  // ===================

  subscribe(listener: ChatServiceListener): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  private notifyListeners(event: ChatEventType, data: ChatEventData): void {
    for (const listener of this.listeners) {
      try {
        listener(event, data);
      } catch (error) {
        console.error('[ChatService] Error in listener:', error);
      }
    }
  }

  // ===================
  // Room Management
  // ===================

  createRoom(battleId: string, fighter1Wallet: string, fighter2Wallet: string | null): ChatRoom {
    // Check if room already exists
    if (this.rooms.has(battleId)) {
      console.log(`[ChatService] Room ${battleId} already exists`);
      return this.rooms.get(battleId)!;
    }

    const room: ChatRoom = {
      battleId,
      messages: [],
      fighter1Wallet,
      fighter2Wallet,
      mutedUsers: new Map(),
      createdAt: Date.now(),
    };

    this.rooms.set(battleId, room);
    console.log(`[ChatService] Created chat room for battle ${battleId}`);

    this.notifyListeners('room_created', {
      type: 'room_created',
      battleId,
    });

    return room;
  }

  closeRoom(battleId: string): void {
    const room = this.rooms.get(battleId);
    if (!room) {
      return;
    }

    // Clear user states for this battle's participants
    for (const wallet of [room.fighter1Wallet, room.fighter2Wallet]) {
      if (wallet) {
        this.userStates.delete(`${battleId}:${wallet}`);
      }
    }

    this.rooms.delete(battleId);
    console.log(`[ChatService] Closed chat room for battle ${battleId}`);

    this.notifyListeners('room_closed', {
      type: 'room_closed',
      battleId,
    });
  }

  getRoom(battleId: string): ChatRoom | undefined {
    return this.rooms.get(battleId);
  }

  roomExists(battleId: string): boolean {
    return this.rooms.has(battleId);
  }

  // ===================
  // Message Sending
  // ===================

  async sendMessage(
    battleId: string,
    wallet: string,
    content: string,
    displayName?: string,
    level: number = 1
  ): Promise<ChatSendResult> {
    const room = this.rooms.get(battleId);
    if (!room) {
      return {
        success: false,
        code: 'room_not_found',
        error: 'Chat room not found',
      };
    }

    // Check if user is muted
    const muteUntil = room.mutedUsers.get(wallet);
    if (muteUntil && Date.now() < muteUntil) {
      const remainingSeconds = Math.ceil((muteUntil - Date.now()) / 1000);
      return {
        success: false,
        code: 'muted',
        error: `You are muted for ${remainingSeconds} more seconds`,
      };
    }

    // Sanitize and validate message
    const sanitized = this.sanitizeMessage(content);
    if (!sanitized || sanitized.length === 0) {
      return {
        success: false,
        code: 'empty_message',
        error: 'Message cannot be empty',
      };
    }

    // Check for spam/abuse
    const spamCheck = this.checkSpam(battleId, wallet, sanitized);
    if (!spamCheck.allowed) {
      if (spamCheck.shouldMute) {
        this.muteUser(battleId, wallet, MUTE_DURATION_MS);
      }
      return {
        success: false,
        code: 'spam_detected',
        error: spamCheck.reason || 'Message blocked',
      };
    }

    // Filter profanity
    const profanityFiltered = this.filterProfanity(sanitized);

    // Censor links
    const { text: finalContent, wasFiltered } = this.censorLinks(profanityFiltered);

    // Determine sender role
    const senderRole = this.getSenderRole(room, wallet);

    // Create message
    const message: ChatMessage = {
      id: uuidv4(),
      battleId,
      senderWallet: wallet,
      senderDisplayName: displayName || this.shortenWallet(wallet),
      senderLevel: level,
      senderRole,
      content: finalContent,
      wasFiltered,
      timestamp: Date.now(),
      type: 'user',
    };

    // Add to room and trim if needed
    room.messages.push(message);
    if (room.messages.length > MAX_MESSAGES_PER_ROOM) {
      room.messages = room.messages.slice(-MAX_MESSAGES_PER_ROOM);
    }

    // Update user state
    this.updateUserState(battleId, wallet, sanitized);

    // Notify listeners
    this.notifyListeners('message', {
      type: 'message',
      battleId,
      message,
    });

    return {
      success: true,
      message,
    };
  }

  sendSystemMessage(battleId: string, content: string): ChatMessage | null {
    const room = this.rooms.get(battleId);
    if (!room) {
      return null;
    }

    const message: ChatMessage = {
      id: uuidv4(),
      battleId,
      senderWallet: 'system',
      senderDisplayName: 'System',
      senderLevel: 0,
      senderRole: 'spectator',
      content,
      wasFiltered: false,
      timestamp: Date.now(),
      type: 'system',
    };

    room.messages.push(message);
    if (room.messages.length > MAX_MESSAGES_PER_ROOM) {
      room.messages = room.messages.slice(-MAX_MESSAGES_PER_ROOM);
    }

    this.notifyListeners('system', {
      type: 'system',
      battleId,
      message,
      content,
    });

    return message;
  }

  // ===================
  // Message History
  // ===================

  getHistory(battleId: string, limit: number = 50): ChatMessage[] {
    const room = this.rooms.get(battleId);
    if (!room) {
      return [];
    }

    return room.messages.slice(-limit);
  }

  // ===================
  // Mute Management
  // ===================

  muteUser(battleId: string, wallet: string, durationMs: number = MUTE_DURATION_MS): void {
    const room = this.rooms.get(battleId);
    if (!room) {
      return;
    }

    room.mutedUsers.set(wallet, Date.now() + durationMs);
    console.log(`[ChatService] Muted ${this.shortenWallet(wallet)} in battle ${battleId} for ${durationMs / 1000}s`);
  }

  unmuteUser(battleId: string, wallet: string): void {
    const room = this.rooms.get(battleId);
    if (!room) {
      return;
    }

    room.mutedUsers.delete(wallet);
  }

  isUserMuted(battleId: string, wallet: string): boolean {
    const room = this.rooms.get(battleId);
    if (!room) {
      return false;
    }

    const muteUntil = room.mutedUsers.get(wallet);
    if (!muteUntil) {
      return false;
    }

    if (Date.now() >= muteUntil) {
      room.mutedUsers.delete(wallet);
      return false;
    }

    return true;
  }

  // ===================
  // Content Filtering
  // ===================

  private sanitizeMessage(input: string): string {
    let s = input.trim().slice(0, MAX_MESSAGE_LENGTH);
    // Remove control characters
    s = s.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
    // HTML escape
    s = s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return s;
  }

  private censorLinks(message: string): { text: string; wasFiltered: boolean } {
    let wasFiltered = false;
    let filtered = message;

    for (const pattern of LINK_PATTERNS) {
      // Reset lastIndex for global patterns
      pattern.lastIndex = 0;
      if (pattern.test(filtered)) {
        pattern.lastIndex = 0;
        filtered = filtered.replace(pattern, '[link removed]');
        wasFiltered = true;
      }
    }

    return { text: filtered, wasFiltered };
  }

  private filterProfanity(message: string): string {
    let filtered = message;

    for (const pattern of PROFANITY_PATTERNS) {
      pattern.lastIndex = 0;
      filtered = filtered.replace(pattern, (match) => '*'.repeat(match.length));
    }

    return filtered;
  }

  // ===================
  // Spam Detection
  // ===================

  private checkSpam(
    battleId: string,
    wallet: string,
    message: string
  ): { allowed: boolean; shouldMute: boolean; reason?: string } {
    const stateKey = `${battleId}:${wallet}`;
    const state = this.userStates.get(stateKey);

    // Check for repeated characters (AAAAAAA)
    if (/(.)\1{5,}/.test(message)) {
      return { allowed: false, shouldMute: false, reason: 'Too many repeated characters' };
    }

    // Check for all caps (if > 20 chars)
    if (message.length > 20 && message === message.toUpperCase() && /[A-Z]/.test(message)) {
      return { allowed: false, shouldMute: false, reason: 'Please do not use all caps' };
    }

    // Check for too many special characters
    const specialCount = (message.match(/[!@#$%^&*()]/g) || []).length;
    if (specialCount > message.length * 0.3 && message.length > 10) {
      return { allowed: false, shouldMute: false, reason: 'Too many special characters' };
    }

    // Check for duplicate messages
    if (state) {
      const timeSinceLastMessage = Date.now() - state.lastMessageTime;
      if (
        timeSinceLastMessage < DUPLICATE_WINDOW_MS &&
        state.lastMessage.toLowerCase() === message.toLowerCase()
      ) {
        const newWarnings = state.warningCount + 1;
        this.userStates.set(stateKey, {
          ...state,
          warningCount: newWarnings,
        });

        if (newWarnings >= WARNING_THRESHOLD) {
          return { allowed: false, shouldMute: true, reason: 'Too many duplicate messages' };
        }
        return { allowed: false, shouldMute: false, reason: 'Duplicate message' };
      }
    }

    return { allowed: true, shouldMute: false };
  }

  private updateUserState(battleId: string, wallet: string, message: string): void {
    const stateKey = `${battleId}:${wallet}`;
    const existing = this.userStates.get(stateKey);

    this.userStates.set(stateKey, {
      warningCount: existing?.warningCount || 0,
      lastMessageTime: Date.now(),
      lastMessage: message,
      messageCount: (existing?.messageCount || 0) + 1,
    });
  }

  private cleanupUserStates(): void {
    const now = Date.now();
    const maxAge = 30 * 60 * 1000; // 30 minutes

    for (const [key, state] of this.userStates.entries()) {
      if (now - state.lastMessageTime > maxAge) {
        this.userStates.delete(key);
      }
    }
  }

  // ===================
  // Helper Methods
  // ===================

  private getSenderRole(room: ChatRoom, wallet: string): SenderRole {
    if (wallet === room.fighter1Wallet) {
      return 'fighter_1';
    }
    if (wallet === room.fighter2Wallet) {
      return 'fighter_2';
    }
    return 'spectator';
  }

  private shortenWallet(wallet: string): string {
    if (wallet.length <= 8) {
      return wallet;
    }
    return `${wallet.slice(0, 4)}...${wallet.slice(-4)}`;
  }

  // ===================
  // Stats
  // ===================

  getStats(): {
    totalRooms: number;
    totalMessages: number;
    activeRooms: string[];
  } {
    let totalMessages = 0;
    const activeRooms: string[] = [];

    for (const [battleId, room] of this.rooms.entries()) {
      totalMessages += room.messages.length;
      activeRooms.push(battleId);
    }

    return {
      totalRooms: this.rooms.size,
      totalMessages,
      activeRooms,
    };
  }
}

// Export singleton instance
export const chatService = new ChatService();
