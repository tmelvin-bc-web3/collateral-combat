'use client';

import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { ChatMessage, Battle } from '@/types';

interface BattleChatProps {
  messages: ChatMessage[];
  onSend: (content: string) => void;
  error: string | null;
  currentWallet: string | null;
  battle: Battle | null;
  isConnected: boolean;
}

export function BattleChat({
  messages,
  onSend,
  error,
  currentWallet,
  battle,
  isConnected,
}: BattleChatProps) {
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (!inputValue.trim() || !currentWallet) return;
    onSend(inputValue);
    setInputValue('');
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const shortenWallet = (wallet: string): string => {
    if (wallet.length <= 8) return wallet;
    return `${wallet.slice(0, 4)}...${wallet.slice(-4)}`;
  };

  const getRoleLabel = (message: ChatMessage): string | null => {
    if (message.senderRole === 'fighter_1') return 'FIGHTER 1';
    if (message.senderRole === 'fighter_2') return 'FIGHTER 2';
    return null;
  };

  const getRoleStyle = (message: ChatMessage): string => {
    if (message.senderRole === 'fighter_1' || message.senderRole === 'fighter_2') {
      return 'border-l-2 border-warning bg-warning/5';
    }
    return '';
  };

  const formatTime = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0">
        {messages.length === 0 ? (
          <div className="text-white/40 text-sm text-center py-4">
            No messages yet. Be the first to chat!
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`px-2 py-1.5 rounded ${getRoleStyle(message)} ${
                message.type === 'system' ? 'text-warning/70 italic' : ''
              }`}
            >
              {message.type === 'system' ? (
                <div className="flex items-center gap-2">
                  <span className="text-warning">{'>'}</span>
                  <span className="text-sm">{message.content}</span>
                </div>
              ) : (
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Level badge */}
                    <span className="text-xs text-white/40">
                      [Lv.{message.senderLevel}]
                    </span>
                    {/* Fighter role badge */}
                    {getRoleLabel(message) && (
                      <span className="text-xs text-warning font-bold">
                        {getRoleLabel(message)}
                      </span>
                    )}
                    {/* Username/wallet */}
                    <span
                      className={`text-sm font-medium ${
                        message.senderWallet === currentWallet
                          ? 'text-success'
                          : 'text-white/80'
                      }`}
                    >
                      {message.senderDisplayName || shortenWallet(message.senderWallet)}:
                    </span>
                    {/* Timestamp */}
                    <span className="text-xs text-white/30 ml-auto">
                      {formatTime(message.timestamp)}
                    </span>
                  </div>
                  <div className="text-sm text-white/90 mt-0.5 ml-0.5">
                    {message.content}
                    {message.wasFiltered && (
                      <span className="text-xs text-white/30 ml-1">(filtered)</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Error Message */}
      {error && (
        <div className="px-3 py-2 bg-danger/20 border-t border-danger/30 text-danger text-sm">
          {error}
        </div>
      )}

      {/* Input Area */}
      <div className="p-3 border-t border-white/10">
        {!currentWallet ? (
          <div className="text-center text-white/40 text-sm py-2">
            Connect wallet to chat
          </div>
        ) : !isConnected ? (
          <div className="text-center text-white/40 text-sm py-2">
            Connecting...
          </div>
        ) : (
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message..."
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
