'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { getSocket } from '@/lib/socket';
import { ChatMessage } from '@/types';
import { useAuth } from '@/contexts/AuthContext';

interface UseBattleChatOptions {
  battleId: string | null;
  fighter1Wallet?: string;
  fighter2Wallet?: string;
  userBackedFighter?: 'fighter_1' | 'fighter_2' | null;
}

interface UseBattleChatReturn {
  messages: ChatMessage[];
  sendMessage: (content: string) => boolean;
  addReaction: (messageId: string, emoji: string) => void;
  removeReaction: (messageId: string, emoji: string) => void;
  error: string | null;
  isConnected: boolean;
  canChat: boolean;
  clearError: () => void;
  userBackedFighter: 'fighter_1' | 'fighter_2' | null | undefined;
}

const MAX_MESSAGES = 100;
const MESSAGE_RATE_LIMIT_MS = 3000; // 3 seconds between messages

export function useBattleChat({
  battleId,
  fighter1Wallet,
  fighter2Wallet,
  userBackedFighter,
}: UseBattleChatOptions): UseBattleChatReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [canChat, setCanChat] = useState(true);
  const { token } = useAuth();
  const messagesRef = useRef<ChatMessage[]>([]);
  const lastMessageTimeRef = useRef<number>(0);

  // Keep ref in sync with state for callback
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    if (!battleId) {
      setMessages([]);
      return;
    }

    const socket = getSocket(token);

    const handleConnect = () => {
      setIsConnected(true);
      // Load chat history when connected
      socket.emit('load_chat_history', battleId);
    };

    const handleDisconnect = () => {
      setIsConnected(false);
    };

    const handleChatMessage = (message: ChatMessage) => {
      if (message.battleId !== battleId) return;

      setMessages((prev) => {
        // Avoid duplicates
        if (prev.some((m) => m.id === message.id)) {
          return prev;
        }
        // Ensure reactions field exists
        const messageWithReactions = {
          ...message,
          reactions: message.reactions || {},
        };
        const newMessages = [...prev, messageWithReactions];
        // Keep only last MAX_MESSAGES
        return newMessages.slice(-MAX_MESSAGES);
      });
    };

    const handleChatHistory = (history: ChatMessage[]) => {
      // Filter to only messages for this battle and ensure reactions field
      const battleMessages = history
        .filter((m) => m.battleId === battleId)
        .map((m) => ({ ...m, reactions: m.reactions || {} }));
      setMessages(battleMessages.slice(-MAX_MESSAGES));
    };

    const handleChatError = (err: { code: string; message: string }) => {
      setError(err.message);
      // Check if it's a balance-related error
      if (err.code === 'NO_BALANCE' || err.message.includes('balance')) {
        setCanChat(false);
      }
      // Auto-clear error after 5 seconds
      setTimeout(() => setError(null), 5000);
    };

    const handleChatSystem = (data: { battleId: string; content: string }) => {
      if (data.battleId !== battleId) return;

      // Convert system message to ChatMessage format
      const systemMessage: ChatMessage = {
        id: `system-${Date.now()}`,
        battleId: data.battleId,
        senderWallet: 'system',
        senderDisplayName: 'System',
        senderLevel: 0,
        senderRole: 'spectator',
        content: data.content,
        wasFiltered: false,
        timestamp: Date.now(),
        type: 'system',
        reactions: {},
      };

      setMessages((prev) => {
        const newMessages = [...prev, systemMessage];
        return newMessages.slice(-MAX_MESSAGES);
      });
    };

    const handleReactionUpdate = (data: {
      battleId: string;
      messageId: string;
      emoji: string;
      wallet: string;
      action: 'add' | 'remove';
    }) => {
      if (data.battleId !== battleId) return;

      setMessages((prev) =>
        prev.map((msg) => {
          if (msg.id !== data.messageId) return msg;

          const reactions = { ...msg.reactions };
          if (data.action === 'add') {
            if (!reactions[data.emoji]) reactions[data.emoji] = [];
            if (!reactions[data.emoji].includes(data.wallet)) {
              reactions[data.emoji] = [...reactions[data.emoji], data.wallet];
            }
          } else {
            if (reactions[data.emoji]) {
              reactions[data.emoji] = reactions[data.emoji].filter(
                (w) => w !== data.wallet
              );
              if (reactions[data.emoji].length === 0) {
                delete reactions[data.emoji];
              }
            }
          }
          return { ...msg, reactions };
        })
      );
    };

    // Set up listeners
    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('chat_message', handleChatMessage);
    socket.on('chat_history', handleChatHistory);
    socket.on('chat_error', handleChatError);
    socket.on('chat_system', handleChatSystem);
    socket.on('reaction_update', handleReactionUpdate);

    // Check if already connected
    if (socket.connected) {
      setIsConnected(true);
      socket.emit('load_chat_history', battleId);
    }

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('chat_message', handleChatMessage);
      socket.off('chat_history', handleChatHistory);
      socket.off('chat_error', handleChatError);
      socket.off('chat_system', handleChatSystem);
      socket.off('reaction_update', handleReactionUpdate);
    };
  }, [battleId, token]);

  const sendMessage = useCallback(
    (content: string): boolean => {
      if (!battleId || !content.trim() || !canChat) return false;

      // Client-side rate limit check (3 seconds)
      const now = Date.now();
      if (now - lastMessageTimeRef.current < MESSAGE_RATE_LIMIT_MS) {
        setError('Please wait 3 seconds between messages');
        setTimeout(() => setError(null), 3000);
        return false;
      }
      lastMessageTimeRef.current = now;

      const socket = getSocket(token);
      socket.emit('send_chat_message', { battleId, content: content.trim() });
      return true;
    },
    [battleId, token, canChat]
  );

  const addReaction = useCallback(
    (messageId: string, emoji: string) => {
      if (!battleId) return;

      const socket = getSocket(token);
      socket.emit('add_reaction', { battleId, messageId, emoji });
    },
    [battleId, token]
  );

  const removeReaction = useCallback(
    (messageId: string, emoji: string) => {
      if (!battleId) return;

      const socket = getSocket(token);
      socket.emit('remove_reaction', { battleId, messageId, emoji });
    },
    [battleId, token]
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    messages,
    sendMessage,
    addReaction,
    removeReaction,
    error,
    isConnected,
    canChat,
    clearError,
    userBackedFighter,
  };
}
