# DegenDome Project Context
*For use in Claude.ai Projects*

## What is DegenDome?

DegenDome (codebase name: Sol Battles) is a **PvP trading battle platform** built on Solana. Players compete in timed trading competitions where they:

1. Enter a battle with a starting balance ($10,000 virtual)
2. Open leveraged perpetual positions (long/short) on crypto assets
3. Compete to achieve the highest P&L before time runs out
4. Winner takes 95% of the prize pool

**Live at**: https://www.degendome.xyz

## Tech Stack

| Category | Technology |
|----------|------------|
| Framework | Next.js 16.1.1 (App Router, Turbopack) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Blockchain | Solana (currently devnet) |
| Wallet | Solana Wallet Adapter |
| Smart Contracts | Anchor Framework |
| Charts | TradingView (iframe embed) |
| Deployment | Vercel |
| Repo | github.com/tmelvin-bc-web3/collateral-combat |

## Core Features

### 1. Battle Arena (`/battle`)
The main trading interface where battles happen:
- TradingView chart (full-width, takes most of screen)
- Order panel sidebar (leverage, margin input, long/short buttons)
- Positions table at bottom
- Real-time P&L calculation
- Timer countdown

### 2. Battle Lobby (`/battle` pre-match)
- Solo Practice mode (play against yourself)
- Find Match (matchmaking with other players)
- Shows available battles and entry requirements

### 3. Oracle/Predict (`/predict`)
Price prediction game where users predict if price will go up or down within a timeframe.

### 4. Draft Mode (`/draft`)
Pick which assets you'll trade before entering a battle.

### 5. Spectate (`/spectate`)
Watch live battles between other players.

### 6. Progression System (`/progression`)
XP and ranking system - players level up and earn rewards.

## Design System

### Theme: "Wasteland"
Post-apocalyptic, battle-scarred aesthetic. Think Mad Max meets trading terminal.

### Colors
```
Primary Background: #080705 (near black)
Secondary Background: #0d0b09
Tertiary Background: #151210

Accent/Warning (Orange): #ff5500
Fire: #e63900
Success/Long (Green): #7fba00
Danger/Short (Red): #cc2200

Text Primary: #e8dfd4
Text Secondary: #8a7f72
```

### Common Patterns
```css
/* Glass-morphism panels */
bg-black/40 backdrop-blur border border-white/10 rounded-xl

/* Dramatic headers */
font-family: Impact; text-warning or text-white

/* Buttons - use explicit colors, not CSS variables */
Long: bg-success/10 border-success/40 text-success
Short: bg-danger/10 border-danger/40 text-danger
Primary CTA: bg-gradient-to-r from-warning to-fire text-white
```

### Typography
- **Headers**: Impact font for dramatic effect ("THE ARENA", "THE ORACLE")
- **Body**: Inter
- **Monospace**: SF Mono (for prices, numbers)

## Project Structure

```
web/
├── src/
│   ├── app/                    # Next.js pages
│   │   ├── battle/            # Battle arena
│   │   ├── predict/           # Oracle page
│   │   ├── draft/             # Asset draft
│   │   ├── spectate/          # Watch battles
│   │   ├── leaderboard/       # Rankings
│   │   ├── progression/       # XP system
│   │   └── docs/              # Documentation
│   ├── components/
│   │   ├── BattleArena.tsx    # Main trading UI
│   │   ├── BattleLobby.tsx    # Matchmaking
│   │   ├── TradingViewChart.tsx
│   │   ├── battle/            # Battle components
│   │   └── ui/                # Reusable UI
│   ├── contexts/
│   │   └── BattleContext.tsx  # Battle state
│   ├── hooks/
│   │   ├── usePrices.ts       # Price feeds
│   │   └── useBattleOnChain.ts
│   ├── config/
│   │   ├── whitelist.ts       # Early access wallets
│   │   └── assets.ts          # Tradeable assets
│   └── types/                 # TypeScript types
├── CLAUDE.md                  # Claude Code context
├── tailwind.config.ts         # Theme config
└── package.json
```

## Key Files to Know

| File | Purpose |
|------|---------|
| `src/components/BattleArena.tsx` | Main trading interface layout |
| `src/components/BattleLobby.tsx` | Battle matchmaking/entry |
| `src/components/TradingViewChart.tsx` | Chart component (iframe) |
| `src/contexts/BattleContext.tsx` | Battle state, positions, P&L |
| `src/hooks/usePrices.ts` | Real-time price feeds |
| `src/config/whitelist.ts` | Whitelisted wallets for early access |
| `tailwind.config.ts` | All custom colors and theme |
| `src/app/globals.css` | CSS variables and global styles |

## Development Workflow

```bash
# Start dev server
npm run dev

# Build for production
npm run build

# Deploy to Vercel (manual - auto-deploy may not work)
vercel --prod

# Check deployment status
vercel ls
```

## Known Issues & Solutions

### 1. Color classes not working
**Problem**: Classes like `text-bg-primary` or `from-accent` don't render
**Solution**: Use explicit color names: `text-white`, `from-warning`, `bg-success`

### 2. TradingView chart too small
**Problem**: Chart doesn't fill container
**Solution**: Use iframe embed with `width: 100%` and `height: 100%`

### 3. Buttons going blank when selected
**Problem**: Selected state has invisible text
**Solution**: Use `bg-warning text-black` or `bg-warning text-white`

### 4. Deployments not auto-deploying
**Problem**: Git push doesn't trigger Vercel deploy
**Solution**: Run `vercel --prod` manually after pushing

## Supported Assets
SOL, BTC, ETH, WIF, BONK, JUP, RAY, JTO

## Current Status
- **Network**: Solana Devnet
- **Mode**: Practice battles available
- **Early Access**: Whitelist-gated (check `/src/config/whitelist.ts`)

## Contact/Team
- Tayler (Lead)
- Domain: degendome.xyz
