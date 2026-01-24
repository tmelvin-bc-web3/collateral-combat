---
phase: 13-fighter-identity
plan: 04
subsystem: ui
tags: [react, next.js, fighter-comparison, profile, battle-stats]

# Dependency graph
requires:
  - phase: 13-01
    provides: "/api/battles/compare/:wallet1/:wallet2 endpoint with fighter stats"
  - phase: 13-02
    provides: "EloTierBadge and RecentFormIndicator components"
provides:
  - ProfileComparison component for side-by-side fighter stats
  - Comparison page at /profile/[wallet]/compare/[opponent]
  - Compare button on profile pages for non-own profiles
affects: [profile-pages, battle-challenges, fighter-identity]

# Tech tracking
tech-stack:
  added: []
  patterns: [comparison-stat-highlighting, fighter-header-cards]

key-files:
  created:
    - web/src/components/profile/ProfileComparison.tsx
    - web/src/app/profile/[wallet]/compare/[opponent]/page.tsx
  modified:
    - web/src/components/profile/index.ts
    - web/src/app/profile/[wallet]/page.tsx

key-decisions:
  - "Comparison stat rows highlight winner with green color and + indicator"
  - "VS divider uses absolute positioning with danger color"
  - "Fighter headers use accent (fighter1) and fire (fighter2) color schemes"
  - "Compare button only visible when logged in viewing another's profile"

patterns-established:
  - "ComparisonStat pattern for head-to-head stat display with advantage highlighting"
  - "higherIsBetter parameter for flexible stat comparison (ROI vs losses)"

# Metrics
duration: 2min
completed: 2026-01-24
---

# Phase 13 Plan 04: Profile Comparison View Summary

**Side-by-side fighter comparison with advantage highlighting, ComparisonStat rows for ELO/winRate/battles/streaks/ROI, and Compare button on profiles**

## Performance

- **Duration:** 2 min
- **Started:** 2026-01-24T00:12:01Z
- **Completed:** 2026-01-24T00:14:54Z
- **Tasks:** 3
- **Files modified:** 4

## Accomplishments
- ProfileComparison component displays two fighters with headers and tier badges
- Comparison stat rows highlight which fighter has advantage (green + indicator)
- Comparison page fetches and combines data from compare, profile, and form endpoints
- Compare button appears on other users' profiles when logged in

## Task Commits

Each task was committed atomically:

1. **Task 1: Create ProfileComparison component** - `d15ca27` (feat)
2. **Task 2: Create comparison page** - `4b383fc` (feat)
3. **Task 3: Add Compare button to profile page** - `6454772` (feat)

## Files Created/Modified
- `web/src/components/profile/ProfileComparison.tsx` - Side-by-side fighter comparison with advantage highlighting
- `web/src/components/profile/index.ts` - Export ProfileComparison from barrel
- `web/src/app/profile/[wallet]/compare/[opponent]/page.tsx` - Comparison page with data fetching
- `web/src/app/profile/[wallet]/page.tsx` - Added Compare button for non-own profiles

## Decisions Made
- ComparisonStat uses higherIsBetter param (default true) for flexible comparison
- Win rate displayed as +X.X% format matching other percentage stats
- Fighter 1 uses accent color theme, Fighter 2 uses fire color theme
- VS divider positioned at top-20 (absolute) between fighter cards
- Challenge button challenges fighter1 (the profile being viewed)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - TypeScript compiled and build succeeded on first attempt.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Profile comparison view complete and integrated
- Compare button drives discovery of comparison feature
- Ready for Phase 13-05 (Fighter Leaderboard) or continued identity features

---
*Phase: 13-fighter-identity*
*Completed: 2026-01-24*
