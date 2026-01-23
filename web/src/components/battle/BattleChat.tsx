'use client';

import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { ChatMessage as ChatMessageType, Battle } from '@/types';
import { ChatMessage } from './ChatMessage';
import { cn } from '@/lib/utils';

interface BattleChatProps {
  messages: ChatMessageType[];
  onSend: (content: string) => boolean;
  onAddReaction: (messageId: string, emoji: string) => void;
  onRemoveReaction: (messageId: string, emoji: string) => void;
  error: string | null;
  currentWallet: string | null;
  battle: Battle | null;
  isConnected: boolean;
  canChat: boolean;
  userBackedFighter?: 'fighter_1' | 'fighter_2' | null;
  className?: string;
  collapsed?: boolean;
}

export function BattleChat({
  messages,
  onSend,
  onAddReaction,
  onRemoveReaction,
  error,
  currentWallet,
  battle,
  isConnected,
  canChat,
  userBackedFighter,
  className,
  collapsed = false,
}: BattleChatProps) {
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { publicKey } = useWallet();

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (!inputValue.trim() || !currentWallet) return;
    if (onSend(inputValue)) {
      setInputValue('');
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Get fighter wallets from battle
  const fighter1Wallet = battle?.players[0]?.walletAddress;
  const fighter2Wallet = battle?.players[1]?.walletAddress;

  // Determine backing badge for a sender based on their wallet
  // This would need spectator bet data to be fully accurate
  // For now, we can pass it through if available
  const getBackingBadge = (senderWallet: string): 'fighter_1' | 'fighter_2' | null => {
    // Future enhancement: look up spectator bets to determine backing
    return null;
  };

  if (collapsed) {
    return null;
  }

  return (
    <div
      className={cn(
        'flex flex-col bg-black/60 backdrop-blur border border-white/10 rounded-lg overflow-hidden',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/10 bg-black/40">
        <span className="text-sm font-medium text-white/80">Live Chat</span>
        <span className="text-xs text-white/40">{messages.length} messages</span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto min-h-[200px] max-h-[400px]">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-white/30 text-sm py-8">
            No messages yet. Be the first!
          </div>
        ) : (
          <div className="py-2">
            {messages.map((msg) => (
              <ChatMessage
                key={msg.id}
                id={msg.id}
                senderWallet={msg.senderWallet}
                senderDisplayName={msg.senderDisplayName}
                senderRole={msg.senderRole}
                senderLevel={msg.senderLevel}
                content={msg.content}
                wasFiltered={msg.wasFiltered}
                reactions={msg.reactions}
                type={msg.type}
                timestamp={msg.timestamp}
                backingBadge={getBackingBadge(msg.senderWallet)}
                onAddReaction={(emoji) => onAddReaction(msg.id, emoji)}
                onRemoveReaction={(emoji) => onRemoveReaction(msg.id, emoji)}
                currentWallet={currentWallet || undefined}
              />
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Error display */}
      {error && (
        <div className="px-3 py-2 bg-danger/20 border-t border-danger/30 text-danger text-sm">
          {error}
        </div>
      )}

      {/* Input */}
      <div className="border-t border-white/10">
        {!currentWallet ? (
          <div className="px-3 py-3 text-center text-white/40 text-sm">
            Connect wallet to chat
          </div>
        ) : !isConnected ? (
          <div className="px-3 py-3 text-center text-white/40 text-sm">
            Connecting...
          </div>
        ) : !canChat ? (
          <div className="px-3 py-3 text-center text-white/40 text-sm">
            Deposit SOL to chat
          </div>
        ) : (
          <div className="flex gap-2 p-2">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Send a message..."
              maxLength={280}
              className="flex-1 bg-black/40 border border-white/10 rounded px-3 py-2 text-sm text-white placeholder-white/40 focus:outline-none focus:border-warning/50"
            />
            <button
              onClick={handleSend}
              disabled={!inputValue.trim()}
              className="px-4 py-2 bg-warning text-black font-bold text-sm rounded hover:bg-warning/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Send
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
