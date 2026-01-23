# Phase 12: Social & Engagement - Research

**Researched:** 2026-01-23
**Domain:** Real-time chat, social sharing, server-side image generation
**Confidence:** HIGH

## Summary

Phase 12 extends the existing battle chat system to support Twitch-style engagement with emoji reactions and GIF support, implements wallet-gated chat with PDA balance verification, and adds comprehensive social sharing with server-generated battle result graphics. The codebase already has strong foundations: Socket.IO infrastructure, a working chat service with moderation, a referral system for share links, and client-side share image generation.

The research confirms that the existing chatService.ts provides a solid foundation but needs extension for emoji reactions, GIF support, and wallet-gating with balance verification. For server-side image generation, Satori + Sharp is the established Node.js pattern. Twitter Web Intents do NOT support direct image uploads - images must be served via URL with proper Open Graph meta tags. The Tenor GIF API is shutting down June 2026, so GIPHY is the recommended provider.

**Primary recommendation:** Extend the existing chatService with emoji reactions and GIF support, use GIPHY API for GIFs, implement Satori + Sharp for server-side battle card generation, and leverage Twitter Cards with dynamic og:image URLs for rich share previews.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| socket.io | ^4.8.1 | Real-time chat | Already in use, proven scalable |
| satori | ^0.10.x | HTML/CSS to SVG conversion | Vercel-backed, JSX support, flexbox layout |
| sharp | ^0.33.x | SVG to PNG conversion | Industry standard, fast native bindings |
| @resvg/resvg-js | ^2.6.x | Alternative SVG to PNG | Pure Rust, no native deps (alternative to sharp) |
| @giphy/js-fetch-api | ^5.x | GIF search API | GIPHY is the surviving GIF API (Tenor shutting down June 2026) |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| obscenity | ^0.2.x | Profanity filtering | Robust, handles leet-speak variants |
| @2toad/profanity | ^2.x | Multi-language profanity filter | TypeScript-first, simpler API |
| emoji-mart | ^5.x | Emoji picker component | If implementing rich emoji picker UI |
| uuid | ^13.x | Message IDs | Already in use |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Satori + Sharp | node-canvas | node-canvas requires native cairo deps; satori is pure JS |
| GIPHY | KLIPY | KLIPY offers monetization but less established |
| obscenity | bad-words | bad-words is simpler but worse at variants |

**Installation:**
```bash
# Backend
npm install satori sharp @giphy/js-fetch-api obscenity

# Frontend
npm install @giphy/react-components emoji-mart
```

## Architecture Patterns

### Recommended Project Structure
```
backend/src/
├── services/
│   ├── chatService.ts           # Extend for reactions, GIFs
│   └── shareImageService.ts     # NEW: Server-side image generation
├── types/
│   └── chat.ts                  # Extend for reactions, GIFs
├── middleware/
│   └── socketRateLimiter.ts     # Already has CHAT_MESSAGE_LIMIT
└── routes/
    └── share.ts                 # NEW: /api/share/battle/:id/image

web/src/
├── components/
│   ├── chat/
│   │   ├── BattleChat.tsx       # Extend existing
│   │   ├── ChatMessage.tsx      # NEW: Individual message with reactions
│   │   ├── EmojiReactions.tsx   # NEW: Reaction picker/display
│   │   └── GifPicker.tsx        # NEW: GIPHY integration
│   └── share/
│       ├── ShareModal.tsx       # Extend WinShareModal pattern
│       └── BattleResultCard.tsx # Client-side preview
└── hooks/
    └── useBattleChat.ts         # Extend for reactions
```

### Pattern 1: Emoji Reactions on Messages
**What:** Allow users to react to chat messages with emojis, stored per-message with user tracking
**When to use:** Any real-time chat requiring engagement metrics
**Example:**
```typescript
// Source: PubNub Chat SDK pattern, Socket.IO implementation
interface ChatMessage {
  id: string;
  battleId: string;
  senderWallet: string;
  content: string;
  timestamp: number;
  reactions: Record<string, string[]>; // { "fire": ["wallet1", "wallet2"], "skull": ["wallet3"] }
}

// Socket event: add_reaction
socket.on('add_reaction', ({ messageId, emoji, wallet }) => {
  const message = chatService.addReaction(battleId, messageId, emoji, wallet);
  io.to(battleId).emit('reaction_update', { messageId, reactions: message.reactions });
});
```

### Pattern 2: Server-Side Image Generation with Satori
**What:** Generate PNG images from JSX templates on the backend
**When to use:** Twitter Card images, dynamic OG images, downloadable share graphics
**Example:**
```typescript
// Source: https://github.com/vercel/satori
import satori from 'satori';
import sharp from 'sharp';
import { readFileSync } from 'fs';

const fontData = readFileSync('./fonts/Inter-Bold.ttf');

async function generateBattleCard(data: BattleCardData): Promise<Buffer> {
  const svg = await satori(
    <div style={{ display: 'flex', flexDirection: 'column', width: 1200, height: 630, background: '#0a0908' }}>
      <div style={{ fontSize: 72, color: '#ff5500' }}>BATTLE RESULT</div>
      <div style={{ fontSize: 96, color: '#7fba00' }}>+{data.pnl.toFixed(2)} SOL</div>
    </div>,
    {
      width: 1200,
      height: 630,
      fonts: [{ name: 'Inter', data: fontData, style: 'normal', weight: 700 }],
    }
  );

  return sharp(Buffer.from(svg)).png().toBuffer();
}
```

### Pattern 3: Wallet-Gated Chat with Balance Check
**What:** Require users to have PDA balance > 0 before allowing chat
**When to use:** Spam prevention, skin-in-the-game requirement
**Example:**
```typescript
// Source: Existing balanceService.ts pattern
socket.on('send_chat_message', async (data) => {
  // 1. Verify wallet authentication (existing)
  const wallet = authenticatedWallet;
  if (!wallet) {
    return socket.emit('chat_error', { code: 'auth_required' });
  }

  // 2. Check PDA balance for wallet-gating (NEW)
  const balance = await balanceService.getOnChainBalance(wallet);
  if (balance <= 0) {
    return socket.emit('chat_error', {
      code: 'insufficient_balance',
      message: 'Deposit SOL to chat'
    });
  }

  // 3. Rate limit (existing - tighten to 1 per 3 seconds)
  // 4. Send message (existing)
});
```

### Pattern 4: Twitter Web Intent with Dynamic og:image
**What:** Share to Twitter via Web Intent URL, with dynamic server-generated image preview
**When to use:** Social sharing without API authentication
**Example:**
```typescript
// Source: Twitter Developer Docs, og_edge pattern
// Frontend: Generate share URL
function getTwitterShareUrl(battleId: string, referralCode: string): string {
  const shareUrl = `https://degendome.xyz/battle/${battleId}/result?ref=${referralCode}`;
  const text = `Just won a battle on @DegenDomeSolana!`;
  return `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(shareUrl)}`;
}

// Backend: Serve og:image endpoint
// GET /api/share/battle/:id/image
app.get('/api/share/battle/:id/image', async (req, res) => {
  const battle = await getBattle(req.params.id);
  const imageBuffer = await generateBattleCard(battle);
  res.setHeader('Content-Type', 'image/png');
  res.setHeader('Cache-Control', 'public, max-age=86400');
  res.send(imageBuffer);
});

// Frontend: Result page with meta tags
<meta property="og:image" content={`https://api.degendome.xyz/api/share/battle/${battleId}/image`} />
<meta name="twitter:card" content="summary_large_image" />
```

### Anti-Patterns to Avoid
- **Uploading images to Twitter via Web Intent:** Not supported - use og:image URL instead
- **Using Tenor API:** Shutting down June 2026 - use GIPHY
- **Client-side balance check only:** Always verify on-chain via balanceService
- **Storing chat history forever:** Use sliding window (existing MAX_MESSAGES_PER_ROOM = 100)

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Profanity filtering | Regex word list | obscenity or @2toad/profanity | Handles unicode, leet-speak, variants |
| GIF search | Scraping GIF sites | GIPHY API | Legal, fast, reliable, free tier |
| Image generation | Canvas drawing | Satori + Sharp | JSX templating, flexbox, better DX |
| Emoji picker | Custom grid | emoji-mart | Accessibility, search, categories |
| Rate limiting | Manual counters | Existing socketRateLimiter | Already tested, configurable |

**Key insight:** The existing codebase already has chat, referral links, rate limiting, and share image generation (client-side). Extend rather than rebuild.

## Common Pitfalls

### Pitfall 1: Twitter Web Intent Image Confusion
**What goes wrong:** Developers try to upload images directly via Web Intent URL
**Why it happens:** Misunderstanding that Web Intent only supports text and URLs
**How to avoid:** Use og:image meta tag on destination URL; Twitter fetches and displays it
**Warning signs:** Looking for "image" or "media" parameter in intent URL

### Pitfall 2: Tenor API Integration
**What goes wrong:** Building on Tenor API
**Why it happens:** Tenor was popular and well-documented
**How to avoid:** Use GIPHY from the start - Tenor shuts down June 2026
**Warning signs:** Any Tenor API keys or endpoints in codebase

### Pitfall 3: Client-Only Balance Check for Chat Gating
**What goes wrong:** Spoofed balance allows unauthorized chat access
**Why it happens:** Checking balance in frontend only
**How to avoid:** Always call balanceService.getOnChainBalance() on backend
**Warning signs:** Frontend checking localStorage or API cache for balance

### Pitfall 4: Missing Font in Satori
**What goes wrong:** Satori throws "No font data provided"
**Why it happens:** Satori requires explicit font loading for all text
**How to avoid:** Always provide fonts array with TTF/OTF/WOFF font data
**Warning signs:** Text renders as boxes or throws font errors

### Pitfall 5: Chat History Memory Bloat
**What goes wrong:** Server memory grows unbounded with chat messages
**Why it happens:** Not limiting stored messages per room
**How to avoid:** Keep existing MAX_MESSAGES_PER_ROOM = 100 pattern
**Warning signs:** Memory increasing over time correlated with battle count

### Pitfall 6: Reaction Spam
**What goes wrong:** Users spam reactions, causing excessive WebSocket traffic
**Why it happens:** No rate limit on reactions (separate from messages)
**How to avoid:** Rate limit reactions separately (e.g., 10 reactions per minute per user)
**Warning signs:** High WebSocket event rate from single users

## Code Examples

Verified patterns from official sources:

### GIPHY Integration
```typescript
// Source: https://developers.giphy.com/docs/api/endpoint
import { GiphyFetch } from '@giphy/js-fetch-api';

const gf = new GiphyFetch(process.env.GIPHY_API_KEY!);

// Search GIFs
const searchGifs = async (query: string, limit = 10) => {
  const { data } = await gf.search(query, { limit, rating: 'pg-13' });
  return data.map(gif => ({
    id: gif.id,
    url: gif.images.fixed_height.url,
    width: gif.images.fixed_height.width,
    height: gif.images.fixed_height.height,
  }));
};

// Trending GIFs for empty state
const getTrending = async (limit = 10) => {
  const { data } = await gf.trending({ limit, rating: 'pg-13' });
  return data;
};
```

### Chat Message Rate Limit (Tighter Mode)
```typescript
// Source: Existing socketRateLimiter.ts pattern
// Requirement: 1 message per 3 seconds

export const CHAT_MESSAGE_TIGHT_LIMIT: SocketRateLimitConfig = {
  windowMs: 3 * 1000, // 3 seconds
  maxRequests: 1,
};

// In socket handler
const rateCheck = checkSocketRateLimit(
  socket.id,
  wallet,
  'chat_message',
  CHAT_MESSAGE_TIGHT_LIMIT
);
```

### Extended Chat Message Type with Reactions and GIFs
```typescript
// Source: Extending existing chat.ts types
export interface ChatMessage {
  id: string;
  battleId: string;
  senderWallet: string;
  senderDisplayName: string;
  senderLevel: number;
  senderRole: SenderRole;
  senderBacking?: 'fighter_1' | 'fighter_2'; // NEW: Which fighter they bet on
  content: string;
  gifUrl?: string; // NEW: Inline GIF from GIPHY
  reactions: Record<string, string[]>; // NEW: { "fire": ["wallet1", "wallet2"] }
  wasFiltered: boolean;
  timestamp: number;
  type: ChatMessageType;
}
```

### Server-Side Battle Result Card
```typescript
// Source: Satori docs + Sharp, UFC-inspired styling
import satori from 'satori';
import sharp from 'sharp';
import { readFileSync } from 'fs';
import path from 'path';

interface BattleCardData {
  winnerId: string;
  winnerDisplay: string;
  loserId: string;
  loserDisplay: string;
  winnerPnl: number;
  loserPnl: number;
  duration: number; // seconds
  entryFee: number;
  prizeWon: number;
  tradeCount: number;
  maxLeverage: number;
  biggestSwing: number;
}

const fontBold = readFileSync(path.join(__dirname, '../fonts/Impact.ttf'));
const fontRegular = readFileSync(path.join(__dirname, '../fonts/Inter-Regular.ttf'));

export async function generateBattleResultCard(data: BattleCardData): Promise<Buffer> {
  const svg = await satori(
    {
      type: 'div',
      props: {
        style: {
          display: 'flex',
          flexDirection: 'column',
          width: 1200,
          height: 630,
          background: 'linear-gradient(135deg, #1a1512 0%, #0a0908 100%)',
          padding: 40,
          fontFamily: 'Inter',
        },
        children: [
          // Header
          {
            type: 'div',
            props: {
              style: { display: 'flex', justifyContent: 'space-between', marginBottom: 20 },
              children: [
                { type: 'span', props: { style: { color: '#ff5500', fontSize: 36, fontFamily: 'Impact' }, children: 'DEGENDOME' } },
                { type: 'span', props: { style: { color: '#666', fontSize: 20 }, children: 'BATTLE RESULT' } },
              ],
            },
          },
          // VS Section
          {
            type: 'div',
            props: {
              style: { display: 'flex', justifyContent: 'space-around', alignItems: 'center', flex: 1 },
              children: [
                // Winner side
                {
                  type: 'div',
                  props: {
                    style: { textAlign: 'center' },
                    children: [
                      { type: 'div', props: { style: { color: '#7fba00', fontSize: 24 }, children: 'WINNER' } },
                      { type: 'div', props: { style: { color: '#fff', fontSize: 32 }, children: data.winnerDisplay } },
                      { type: 'div', props: { style: { color: '#7fba00', fontSize: 72, fontFamily: 'Impact' }, children: `+${data.winnerPnl.toFixed(2)} SOL` } },
                    ],
                  },
                },
                // VS
                { type: 'div', props: { style: { color: '#ff5500', fontSize: 48, fontFamily: 'Impact' }, children: 'VS' } },
                // Loser side
                {
                  type: 'div',
                  props: {
                    style: { textAlign: 'center' },
                    children: [
                      { type: 'div', props: { style: { color: '#cc2200', fontSize: 24 }, children: 'DEFEATED' } },
                      { type: 'div', props: { style: { color: '#888', fontSize: 32 }, children: data.loserDisplay } },
                      { type: 'div', props: { style: { color: '#cc2200', fontSize: 48 }, children: `${data.loserPnl.toFixed(2)} SOL` } },
                    ],
                  },
                },
              ],
            },
          },
          // Stats footer
          {
            type: 'div',
            props: {
              style: { display: 'flex', justifyContent: 'space-around', borderTop: '1px solid #333', paddingTop: 20 },
              children: [
                { type: 'span', props: { style: { color: '#666', fontSize: 16 }, children: `Duration: ${Math.floor(data.duration / 60)}m ${data.duration % 60}s` } },
                { type: 'span', props: { style: { color: '#666', fontSize: 16 }, children: `Trades: ${data.tradeCount}` } },
                { type: 'span', props: { style: { color: '#666', fontSize: 16 }, children: `Max Leverage: ${data.maxLeverage}x` } },
                { type: 'span', props: { style: { color: '#666', fontSize: 16 }, children: `Prize: ${data.prizeWon.toFixed(2)} SOL` } },
              ],
            },
          },
        ],
      },
    },
    {
      width: 1200,
      height: 630,
      fonts: [
        { name: 'Impact', data: fontBold, style: 'normal', weight: 700 },
        { name: 'Inter', data: fontRegular, style: 'normal', weight: 400 },
      ],
    }
  );

  return sharp(Buffer.from(svg)).png().toBuffer();
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Tenor GIF API | GIPHY API | June 2026 shutdown announced | Must use GIPHY |
| Client-side image gen | Server-side Satori | 2024 | Better Twitter card support |
| Twitter API for posting | Web Intents | Stable | No API auth required |
| Puppeteer for images | Satori + Sharp | 2023 | 10x faster, no browser |

**Deprecated/outdated:**
- Tenor API: Shutting down June 30, 2026 - do not use
- Puppeteer/Playwright for images: Too slow and heavy for dynamic generation
- @vercel/og Edge-only: Now supports Node.js runtime too

## Open Questions

Things that couldn't be fully resolved:

1. **Chat persistence after battle ends**
   - What we know: Current chatService clears rooms when battles end
   - What's unclear: User expectation for viewing chat history
   - Recommendation (Claude's discretion): Clear after 1 hour post-battle, not immediately. Simple timer cleanup.

2. **Backing badges next to usernames**
   - What we know: Can derive from spectatorService bet data
   - What's unclear: Privacy concern - do spectators want their bets visible?
   - Recommendation (Claude's discretion): Show badges for opted-in users only, or show faction (Fighter 1/2) without amounts.

3. **Video/GIF clips of battle moments**
   - What we know: Complex to implement (recording, encoding, storage)
   - What's unclear: Infrastructure cost and complexity
   - Recommendation (Claude's discretion): Defer to future phase. Focus on static result cards first.

4. **Auto-moderation word list scope**
   - What we know: Existing PROFANITY_PATTERNS in chatService covers slurs
   - What's unclear: Crypto-specific scams (honeypot links, fake airdrops)
   - Recommendation: Use obscenity library defaults + add crypto scam patterns

## Sources

### Primary (HIGH confidence)
- Existing codebase: chatService.ts, referralService.ts, socketRateLimiter.ts, shareImageGenerator.ts
- [Satori GitHub](https://github.com/vercel/satori) - HTML to SVG conversion
- [Twitter Web Intents Docs](https://developer.x.com/en/docs/x-for-websites/web-intents/overview) - Share URL format
- [GIPHY API Docs](https://developers.giphy.com/docs/api/) - GIF search API

### Secondary (MEDIUM confidence)
- [Tenor shutdown announcement](https://piunikaweb.com/2026/01/14/discord-gif-search-change-tenor-api-shutdown/) - June 2026 deadline
- [obscenity GitHub](https://github.com/jo3-l/obscenity) - Profanity filter
- [PubNub Chat Reactions](https://www.pubnub.com/how-to/chat-sdk-add-reactions-to-messages/) - Reaction pattern

### Tertiary (LOW confidence)
- General WebSearch results for 2026 best practices (validated against primary sources)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Libraries verified in npm, satori is Vercel-backed
- Architecture: HIGH - Patterns extend existing working code
- Pitfalls: HIGH - Based on official docs and existing codebase analysis

**Research date:** 2026-01-23
**Valid until:** 2026-02-23 (30 days - stable domain)
