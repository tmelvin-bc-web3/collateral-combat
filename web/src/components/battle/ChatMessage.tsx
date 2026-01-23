'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { LevelBadge } from '@/components/progression/LevelBadge';

// Allowed emojis matching backend ALLOWED_EMOJIS
const ALLOWED_EMOJIS = ['fire', 'skull', 'rocket', 'money', 'clown', '100', 'cry', 'laugh'] as const;
const EMOJI_MAP: Record<typeof ALLOWED_EMOJIS[number], string> = {
  fire: '\u{1F525}',
  skull: '\u{1F480}',
  rocket: '\u{1F680}',
  money: '\u{1F4B0}',
  clown: '\u{1F921}',
  '100': '\u{1F4AF}',
  cry: '\u{1F62D}',
  laugh: '\u{1F602}',
};

interface ChatMessageProps {
  id: string;
  senderWallet: string;
  senderDisplayName: string;
  senderRole: 'spectator' | 'fighter_1' | 'fighter_2';
  senderLevel: number;
  content: string;
  wasFiltered: boolean;
  reactions: Record<string, string[]>;
  type: 'user' | 'system';
  timestamp: number;
  backingBadge?: 'fighter_1' | 'fighter_2' | null;
  onAddReaction: (emoji: string) => void;
  onRemoveReaction: (emoji: string) => void;
  currentWallet?: string;
}

export function ChatMessage({
  id,
  senderWallet,
  senderDisplayName,
  senderRole,
  senderLevel,
  content,
  wasFiltered,
  reactions,
  type,
  timestamp,
  backingBadge,
  onAddReaction,
  onRemoveReaction,
  currentWallet,
}: ChatMessageProps) {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  // System messages have special styling
  if (type === 'system') {
    return (
      <div className="flex items-center gap-2 px-2 py-1.5 text-warning/70 italic">
        <span className="text-warning">{'>'}</span>
        <span className="text-sm">{content}</span>
      </div>
    );
  }

  // Role styling
  const roleConfig = {
    fighter_1: {
      color: 'text-success',
      badge: 'F1',
      badgeClass: 'bg-success/20 text-success',
      borderClass: 'border-l-2 border-success bg-success/5',
    },
    fighter_2: {
      color: 'text-danger',
      badge: 'F2',
      badgeClass: 'bg-danger/20 text-danger',
      borderClass: 'border-l-2 border-danger bg-danger/5',
    },
    spectator: {
      color: 'text-white/60',
      badge: null,
      badgeClass: '',
      borderClass: '',
    },
  };

  const config = roleConfig[senderRole];
  const isCurrentUser = senderWallet === currentWallet;

  // Check if current user has reacted with an emoji
  const hasReacted = (emoji: string) => {
    return currentWallet && reactions[emoji]?.includes(currentWallet);
  };

  // Handle reaction toggle
  const handleReactionClick = (emoji: string) => {
    if (hasReacted(emoji)) {
      onRemoveReaction(emoji);
    } else {
      onAddReaction(emoji);
    }
  };

  // Format timestamp
  const formatTime = (ts: number): string => {
    const date = new Date(ts);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div
      className={cn(
        'group px-2 py-1.5 rounded hover:bg-white/5 transition-colors',
        config.borderClass
      )}
    >
      {/* Message header */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {/* Level badge */}
        <LevelBadge level={senderLevel} size="xs" />

        {/* Fighter role badge */}
        {config.badge && (
          <span className={cn('px-1 py-0.5 rounded text-[10px] font-bold', config.badgeClass)}>
            {config.badge}
          </span>
        )}

        {/* Backing badge for spectators */}
        {backingBadge && senderRole === 'spectator' && (
          <span
            className={cn(
              'px-1 py-0.5 rounded text-[10px]',
              backingBadge === 'fighter_1'
                ? 'text-success bg-success/10'
                : 'text-danger bg-danger/10'
            )}
          >
            {backingBadge === 'fighter_1' ? 'Backing F1' : 'Backing F2'}
          </span>
        )}

        {/* Username */}
        <span className={cn('text-sm font-medium', isCurrentUser ? 'text-success' : config.color)}>
          {senderDisplayName}:
        </span>

        {/* Timestamp */}
        <span className="text-xs text-white/30 ml-auto">{formatTime(timestamp)}</span>
      </div>

      {/* Message content */}
      <div className="text-sm text-white/90 mt-0.5 ml-0.5 break-words">
        {content}
        {wasFiltered && <span className="text-xs text-white/30 ml-1">(filtered)</span>}
      </div>

      {/* Existing reactions */}
      {Object.keys(reactions).length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1.5">
          {Object.entries(reactions).map(([emoji, wallets]) => (
            <button
              key={emoji}
              onClick={() => handleReactionClick(emoji)}
              className={cn(
                'flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs transition-colors',
                hasReacted(emoji)
                  ? 'bg-warning/30 text-white'
                  : 'bg-white/10 text-white/60 hover:bg-white/20'
              )}
            >
              <span>{emoji}</span>
              <span>{wallets.length}</span>
            </button>
          ))}
        </div>
      )}

      {/* Reaction picker (shows on hover) */}
      <div
        className={cn(
          'flex gap-1 mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity',
          showEmojiPicker ? 'opacity-100' : ''
        )}
      >
        {Object.entries(EMOJI_MAP).map(([key, emoji]) => (
          <button
            key={key}
            onClick={() => handleReactionClick(emoji)}
            className={cn(
              'text-sm p-0.5 rounded hover:bg-white/20 transition-colors',
              hasReacted(emoji) ? 'bg-warning/20' : ''
            )}
            title={key}
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
}
