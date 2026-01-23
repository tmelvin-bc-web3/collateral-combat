# Phase 12: Social & Engagement - Context

**Gathered:** 2026-01-23
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can engage with battles through chat and share results for virality. Spectators chat in battle-specific rooms with emoji reactions and GIF support. Chat is wallet-gated with rate limiting and moderation. One-click share battle results to Twitter/X with auto-generated graphics. Battle result cards and fighter profile cards are shareable with referral links embedded.

</domain>

<decisions>
## Implementation Decisions

### Chat Experience
- Twitch-style fast-scrolling chat with emote-heavy, hype moment feel
- Support text messages, emoji reactions on messages, and inline GIFs
- Each battle has its own chat room (battle-specific)
- Chat clears or persists: Claude's discretion
- Backing badges (showing which fighter a chatter bet on): Claude's discretion

### Moderation & Safety
- Wallet-gating: Must have PDA balance > 0 SOL to chat (not just connected)
- Rate limiting: Tight mode, 1 message per 3 seconds
- Moderation authority: Admin wallets only (not fighters)
- Auto-moderation filter for offensive content (slurs, offensive patterns blocked automatically)

### Share Mechanics
- Two share options: One-click direct post to Twitter AND copy to clipboard fallback
- Share prompts triggered at key moments: big swings, liquidations, and battle end
- Both fighters AND spectators can share (spectator wins are shareable too)
- All shared content includes the sharer's referral code in the URL automatically

### Generated Graphics
- Battle result cards show detailed breakdown: winner, final PnL, duration, entry fee, prize won, trade count, leverage used, biggest swing
- Visual style: UFC-inspired fight card aesthetic (bold, dramatic contrast, fighter presentation)
- Generation method: Server-side image generation (backend generates PNG on demand)
- Battle clips/highlights: Claude's discretion on whether to include basic animated GIF clips or defer to future phase

### Claude's Discretion
- Chat message persistence after battle ends
- Whether to show backing badges next to usernames
- Whether to include basic video/GIF clips of key moments or defer to future phase
- Specific GIF provider integration (Tenor, Giphy, etc.)
- Auto-moderation word list scope

</decisions>

<specifics>
## Specific Ideas

- "Twitch-style" chat - fast scrolling, emote-heavy, hype moments
- "UFC-inspired" share cards - bold fight card style, dramatic contrast
- Share prompts on "key moments" - liquidations and big PnL swings, not just battle end
- Referral tracking built into every share automatically

</specifics>

<deferred>
## Deferred Ideas

None - discussion stayed within phase scope

</deferred>

---

*Phase: 12-social-engagement*
*Context gathered: 2026-01-23*
