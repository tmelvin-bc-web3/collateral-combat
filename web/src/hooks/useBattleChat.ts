'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { getSocket } from '@/lib/socket';
import { ChatMessage } from '@/types';
import { useAuth } from '@/contexts/AuthContext';

interface UseBattleChatReturn {
  messages: ChatMessage[];
  sendMessage: (content: string) => void;
  error: string | null;
  isConnected: boolean;
  clearError: () => void;
}

const MAX_MESSAGES = 100;

export function useBattleChat(battleId: string | null): UseBattleChatReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const { token } = useAuth();
  const messagesRef = useRef<ChatMessage[]>([]);

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
        const newMessages = [...prev, message];
        // Keep only last MAX_MESSAGES
        return newMessages.slice(-MAX_MESSAGES);
      });
    };

    const handleChatHistory = (history: ChatMessage[]) => {
      // Filter to only messages for this battle
      const battleMessages = history.filter((m) => m.battleId === battleId);
      setMessages(battleMessages.slice(-MAX_MESSAGES));
    };

    const handleChatError = (err: { code: string; message: string }) => {
      setError(err.message);
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
      };

      setMessages((prev) => {
        const newMessages = [...prev, systemMessage];
        return newMessages.slice(-MAX_MESSAGES);
      });
    };

    // Set up listeners
    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('chat_message', handleChatMessage);
    socket.on('chat_history', handleChatHistory);
    socket.on('chat_error', handleChatError);
    socket.on('chat_system', handleChatSystem);

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
    };
  }, [battleId, token]);

  const sendMessage = useCallback(
    (content: string) => {
      if (!battleId || !content.trim()) return;

      const socket = getSocket(token);
      socket.emit('send_chat_message', { battleId, content: content.trim() });
    },
    [battleId, token]
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    messages,
    sendMessage,
    error,
    isConnected,
    clearError,
  };
}
