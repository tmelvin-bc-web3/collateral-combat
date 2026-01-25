# Phase 17: Onboarding - Context

**Gathered:** 2026-01-25
**Status:** Ready for planning

<domain>
## Phase Boundary

Streamlined wallet connection and guided first bet experience. Users can spectate anonymously with full access, connect their wallet with minimal friction, and complete their first bet. Fighter identity creation happens after first bet.

This phase does NOT include: tutorials, educational content, achievement systems, or referral flows.

</domain>

<decisions>
## Implementation Decisions

### Anonymous Experience
- Full spectator experience without wallet — watch battles, see odds, read chat
- Chat is read-only for anonymous users ("Connect to chat")
- Floating pill button for wallet connect (dismissible, always accessible)
- Prompt appears on bet attempt, but floating pill provides persistent option

### Wallet Connect Flow
- All wallets shown equally — no Phantom prominence, user chooses
- Plain language reassurance during connect: "Connect to bet. Your funds stay in your wallet until you wager."
- After successful connect: show balance + deposit prompt ("Connected! Balance: X SOL. Deposit to start betting.")
- Zero balance users: deposit-first flow — guide them to deposit before anything else

### First Bet Guidance
- No tutorial or hand-holding — rely on good UI with preset amounts
- Stay neutral on fighter selection — no recommendations, user picks based on odds
- Default bet amount: 0.05 SOL (second preset) pre-selected for new users
- After first bet: celebration animation + fighter identity prompt

### Fighter Identity Creation
- Required fields: name + avatar selection
- Avatar options: use existing PFP/NFT system already built
- Skip allowed — shown as truncated wallet address if skipped
- Name validation: uniqueness enforced (no duplicate names across users)
- Name format: 3-20 characters, basic validation

### Claude's Discretion
- Exact floating pill positioning and animation
- Celebration animation style for first bet
- Error messaging wording
- Loading states during wallet connect

</decisions>

<specifics>
## Specific Ideas

- Floating connect pill should feel like a gentle nudge, not blocking content
- Balance + deposit prompt immediately after connect — don't let them wonder what to do next
- Celebration after first bet should feel rewarding but quick — don't interrupt the action for too long

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 17-onboarding*
*Context gathered: 2026-01-25*
