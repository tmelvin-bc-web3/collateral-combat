---
phase: 14-events-competitions
plan: 01
subsystem: events
tags: [event-manager, fight-card, database, websocket, api]
dependency-graph:
  requires: []
  provides: [eventDatabase, eventManager, event-api-endpoints]
  affects: [14-02, 14-03, 14-05]
tech-stack:
  added: []
  patterns: [singleton-manager, ticker-lifecycle, prepared-statements]
key-files:
  created:
    - backend/src/db/eventDatabase.ts
    - backend/src/services/eventManager.ts
  modified:
    - backend/src/types.ts
    - backend/src/index.ts
decisions:
  - key: registration-windows
    value: "24h before opens, 30min before closes"
  - key: notification-timing
    value: "5 minutes before event start"
  - key: ticker-interval
    value: "60 seconds for state checks"
metrics:
  duration: "~10 min"
  completed: "2026-01-24"
---

# Phase 14 Plan 01: Event Database Schema and Manager Summary

**One-liner:** Event persistence layer with SQLite tables for fight cards, battles, subscriptions, plus singleton manager with ticker-based lifecycle and REST/WebSocket integration.

## What Was Built

### 1. Event Database (eventDatabase.ts)
Created a new SQLite database for event persistence following the `notificationDatabase.ts` pattern:

**Schema tables:**
- `events` - Stores event metadata (name, description, scheduled times, status, entry fee, max participants)
- `event_battles` - Featured battles within an event (position, players, is_main_event flag)
- `event_subscriptions` - User notification subscriptions with notified tracking

**Prepared statements for:**
- CRUD operations: createEvent, getEvent, getEventById, getUpcomingEvents, updateEventStatus
- Battle management: addEventBattle, getEventBattles, updateBattleStatus
- Subscriptions: subscribeToEvent, unsubscribeFromEvent, getEventSubscribers, markNotified, getUnnotifiedSubscribers

### 2. Event Manager Service (eventManager.ts)
Singleton service following `scheduledMatchManager.ts` and `ldsManager.ts` patterns:

**Lifecycle management:**
- 60-second ticker checks all events for state transitions
- Automatic status progression: upcoming -> registration_open -> in_progress -> completed
- Notification system for events starting within 5 minutes

**Public API:**
- `createEvent()` - Admin event creation with validation
- `addBattleToCard()` - Add featured battles to event
- `subscribeUserToEvent()` / `unsubscribeUserFromEvent()` - User notification management
- `getUpcomingEvents()` / `getEvent()` - Event retrieval
- `completeEvent()` / `cancelEvent()` - Lifecycle control

**Event emission for WebSocket:**
- event_created, event_updated, registration_opened
- event_starting, event_started, event_completed, event_cancelled
- battle_starting

### 3. Backend Integration (index.ts)

**REST Endpoints:**
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /api/events | Public | List upcoming events |
| GET | /api/events/:id | Public | Get single event with battles |
| POST | /api/events | Admin | Create event |
| POST | /api/events/:id/battles | Admin | Add battle to card |
| POST | /api/events/:id/subscribe | Auth | Subscribe to notifications |
| DELETE | /api/events/:id/subscribe | Auth | Unsubscribe |
| GET | /api/events/:id/subscribed | Auth | Check subscription |

**WebSocket rooms:**
- `event:{eventId}` - Room per event for real-time updates
- `events` - General room for event list updates
- Individual socket notifications for event_starting to subscribers

## Types Added

```typescript
// In types.ts
export type EventStatus = 'upcoming' | 'registration_open' | 'in_progress' | 'completed' | 'cancelled';
export type EventBattleStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled';

export interface FightCardEvent {
  id: string;
  name: string;
  description?: string;
  scheduledStartTime: number;
  registrationOpens: number;
  registrationCloses: number;
  status: EventStatus;
  entryFeeLamports: number;
  maxParticipants: number;
  prizePoolLamports: number;
  createdAt: number;
  createdBy: string;
}

export interface EventBattle { ... }
export interface EventManagerEvent { ... }
```

## Configuration Constants

| Constant | Value | Purpose |
|----------|-------|---------|
| REGISTRATION_OPENS_HOURS_BEFORE | 24 | Hours before event that registration opens |
| REGISTRATION_CLOSES_MINUTES_BEFORE | 30 | Minutes before event that registration closes |
| EVENT_START_NOTIFICATION_MINUTES | 5 | Minutes before start to send notifications |
| TICKER_INTERVAL_MS | 60000 | Interval for checking event states |

## Verification Results

- [x] TypeScript compiles: `cd backend && npx tsc --noEmit` passes
- [x] Backend starts: Event manager initializes on startup
- [x] REST endpoints registered and accessible
- [x] WebSocket integration for real-time updates

## Deviations from Plan

None - plan executed exactly as written.

## Commits

| Hash | Message |
|------|---------|
| cd0b478 | feat(14-01): create event database schema |
| 8c83189 | feat(14-01): create event manager service |
| ecf318c | feat(14-01): wire event manager to backend |

## Next Phase Readiness

**Provides foundation for:**
- 14-02: Event Registration & Frontend - Can use GET /api/events endpoints
- 14-03: Event Countdown Timer - EventManagerEvent emissions
- 14-05: Event History & Statistics - Database schema ready

**No blockers identified.**
