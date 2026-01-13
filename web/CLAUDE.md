# DegenDome (Sol Battles) - Project Context

## Overview
DegenDome is a PvP trading battle platform on Solana where players compete in timed trading competitions. Players open leveraged perpetual positions on crypto assets, and the player with the highest P&L at the end wins the prize pool.

**Live URL**: https://www.degendome.xyz

## Tech Stack
- **Framework**: Next.js 16.1.1 with App Router and Turbopack
- **Language**: TypeScript
- **Styling**: Tailwind CSS with custom theme
- **Blockchain**: Solana (devnet currently)
- **Wallet**: Solana Wallet Adapter (@solana/wallet-adapter-react)
- **Smart Contracts**: Anchor framework
- **Deployment**: Vercel (auto-deploy may not be configured - use `vercel --prod` to deploy)

## Project Structure
```
src/
├── app/                    # Next.js App Router pages
│   ├── battle/            # Battle arena page
│   ├── draft/             # Draft mode (pick assets)
│   ├── predict/           # Oracle/prediction page
│   ├── spectate/          # Watch live battles
│   ├── leaderboard/       # Rankings
│   ├── progression/       # Player progression system
│   ├── profile/[wallet]/  # Player profiles
│   └── docs/              # Documentation pages
├── components/            # React components
│   ├── battle/           # Battle-specific components
│   └── ui/               # Reusable UI components
├── contexts/             # React contexts (BattleContext, etc.)
├── hooks/                # Custom hooks (usePrices, useBattleOnChain)
├── lib/                  # Utilities and helpers
├── types/                # TypeScript type definitions
└── config/               # Configuration (whitelist, assets, etc.)
```

## Key Features
1. **Battle Arena** (`/battle`) - Real-time trading competition with TradingView charts
2. **Oracle/Predict** (`/predict`) - Price prediction game
3. **Draft Mode** (`/draft`) - Pick assets before battle
4. **Spectate** (`/spectate`) - Watch live battles
5. **Progression** (`/progression`) - XP and ranking system

## Design System
- **Theme**: "Wasteland" post-apocalyptic aesthetic
- **Primary Colors**:
  - Warning/Accent: `#ff5500` (orange)
  - Success (Long): `#7fba00` (green)
  - Danger (Short): `#cc2200` (red)
  - Fire: `#e63900`
- **Background**: Dark with `#080705` as primary
- **Glass-morphism**: `bg-black/40 backdrop-blur border border-white/10`
- **Font**: Impact for dramatic headers, Inter for body

## Important Files
- `src/components/BattleArena.tsx` - Main trading interface
- `src/components/BattleLobby.tsx` - Battle matchmaking
- `src/components/TradingViewChart.tsx` - Chart embed
- `src/contexts/BattleContext.tsx` - Battle state management
- `src/hooks/usePrices.ts` - Real-time price feeds
- `src/config/whitelist.ts` - Early access wallet list
- `tailwind.config.ts` - Theme configuration

## Development Commands
```bash
npm run dev      # Start dev server
npm run build    # Build for production
vercel --prod    # Deploy to production (manual)
```

## Common Issues & Solutions
1. **Leverage buttons going blank**: Use `bg-warning text-black` instead of broken color classes
2. **TradingView chart sizing**: Use iframe embed with 100% width/height
3. **Color classes not working**: Use explicit colors (warning, success, danger) instead of CSS variable-based ones (accent, bg-primary)

## Deployment
- Pushes to `main` branch should auto-deploy to Vercel
- If auto-deploy isn't working, manually deploy with `vercel --prod`
- Check deployment status with `vercel ls`

## Whitelisted Wallets (Early Access)
Located in `src/config/whitelist.ts` - add wallet addresses here for early access
