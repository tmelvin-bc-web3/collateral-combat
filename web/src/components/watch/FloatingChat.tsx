'use client';

import { useState, useEffect, useRef, KeyboardEvent } from 'react';
import { ChatMessage } from '@/types';
import { cn } from '@/lib/utils';

interface FloatingChatProps {
  messages: ChatMessage[];
  onSendMessage?: (content: string) => boolean;
  isKeyboardOpen: boolean;
  onOpenKeyboard: () => void;
  canChat: boolean;
  currentWallet?: string;
  className?: string;
}

// How many messages to show floating
const VISIBLE_MESSAGE_COUNT = 5;

// Message fade timeout in milliseconds
const MESSAGE_FADE_TIMEOUT = 8000;

/**
 * FloatingChat - Twitch-style floating chat overlay for battle spectating
 *
 * Features:
 * - Displays last 5 messages floating over content
 * - Positioned left side, above bet strip (never covers bet buttons)
 * - Older messages more transparent (opacity gradient)
 * - Messages fade out after 8 seconds
 * - "Tap to chat" button opens keyboard
 * - When keyboard is open, shows full chat input
 *
 * @example
 * <FloatingChat
 *   messages={chatMessages}
 *   onSendMessage={(content) => sendMessage(content)}
 *   isKeyboardOpen={isKeyboardOpen}
 *   onOpenKeyboard={() => setIsKeyboardOpen(true)}
 *   canChat={hasBalance}
 *   currentWallet={publicKey}
 * />
 */
export function FloatingChat({
  messages,
  onSendMessage,
  isKeyboardOpen,
  onOpenKeyboard,
  canChat,
  currentWallet,
  className,
}: FloatingChatProps) {
  const [inputValue, setInputValue] = useState('');
  const [visibleMessages, setVisibleMessages] = useState<(ChatMessage & { opacity: number })[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const fadeTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  // Track message visibility and fade-out
  useEffect(() => {
    // Get the last N messages
    const recentMessages = messages.slice(-VISIBLE_MESSAGE_COUNT);

    // Update visible messages with opacity based on age
    const now = Date.now();
    const updatedVisible = recentMessages.map((msg, index) => {
      // Base opacity: older messages are more transparent
      const positionOpacity = 0.4 + (index / VISIBLE_MESSAGE_COUNT) * 0.6;

      // Age-based opacity: messages fade over time
      const age = now - msg.timestamp;
      const ageFactor = Math.max(0, 1 - age / MESSAGE_FADE_TIMEOUT);

      // Combined opacity
      const opacity = positionOpacity * ageFactor;

      return { ...msg, opacity: Math.max(0.2, opacity) };
    });

    setVisibleMessages(updatedVisible);

    // Set up fade timers for new messages
    recentMessages.forEach((msg) => {
      if (!fadeTimersRef.current.has(msg.id)) {
        const timer = setTimeout(() => {
          fadeTimersRef.current.delete(msg.id);
          // Trigger re-render to update opacity
          setVisibleMessages((prev) =>
            prev.map((m) => (m.id === msg.id ? { ...m, opacity: 0.2 } : m))
          );
        }, MESSAGE_FADE_TIMEOUT);
        fadeTimersRef.current.set(msg.id, timer);
      }
    });

    return () => {
      // Clean up timers on unmount
      fadeTimersRef.current.forEach((timer) => clearTimeout(timer));
      fadeTimersRef.current.clear();
    };
  }, [messages]);

  // Focus input when keyboard opens
  useEffect(() => {
    if (isKeyboardOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isKeyboardOpen]);

  const handleSend = () => {
    if (!inputValue.trim() || !onSendMessage) return;
    if (onSendMessage(inputValue)) {
      setInputValue('');
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Format sender name with role badge
  const formatSender = (msg: ChatMessage) => {
    const roleColors: Record<string, string> = {
      fighter_1: 'text-success',
      fighter_2: 'text-danger',
      spectator: 'text-accent',
    };
    return (
      <span className={cn('font-bold text-xs', roleColors[msg.senderRole] || 'text-white/70')}>
        {msg.senderDisplayName}
      </span>
    );
  };

  // Hide floating messages when keyboard is open
  if (isKeyboardOpen) {
    return (
      <div
        className={cn('absolute left-0 right-0 z-30', className)}
        style={{ bottom: 'calc(120px + env(safe-area-inset-bottom))' }}
      >
        <div className="max-w-lg mx-auto px-3">
          <div className="bg-black/90 backdrop-blur-lg rounded-xl border border-white/10 p-2">
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={canChat ? 'Send a message...' : 'Deposit SOL to chat'}
                disabled={!canChat}
                maxLength={280}
                className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/40 focus:outline-none focus:border-accent/50 disabled:opacity-50"
              />
              <button
                onClick={handleSend}
                disabled={!inputValue.trim() || !canChat}
                className="px-4 py-2 bg-accent text-black font-bold text-sm rounded-lg transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn('absolute left-3 z-30 w-[60%] max-w-xs pointer-events-none', className)}
      style={{ bottom: 'calc(140px + env(safe-area-inset-bottom))' }}
    >
      {/* Floating messages */}
      <div className="flex flex-col gap-1 mb-2">
        {visibleMessages.map((msg) => (
          <div
            key={msg.id}
            className="pointer-events-auto transition-opacity duration-300"
            style={{ opacity: msg.opacity }}
          >
            <div className="bg-black/40 backdrop-blur-sm rounded-lg px-2 py-1.5 inline-block max-w-full">
              {formatSender(msg)}
              <span className="text-xs text-white/80 ml-1 break-words">
                {msg.content}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Tap to chat button */}
      {currentWallet && (
        <button
          onClick={onOpenKeyboard}
          className="pointer-events-auto flex items-center gap-2 bg-black/50 backdrop-blur-sm rounded-full px-3 py-2 border border-white/10 transition-all active:scale-95 touch-manipulation"
        >
          <ChatIcon className="w-4 h-4 text-white/50" />
          <span className="text-xs text-white/50">Tap to chat</span>
        </button>
      )}
    </div>
  );
}

/**
 * Simple chat icon component
 */
function ChatIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}
