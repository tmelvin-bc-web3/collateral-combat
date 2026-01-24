// Event Manager Service
// Manages fight card event lifecycle: creation, registration, notifications, and state transitions

import { v4 as uuidv4 } from 'uuid';
import { createLogger } from '../utils/logger';
import {
  createEvent,
  getEvent,
  getUpcomingEvents,
  getEventsByStatus,
  updateEventStatus,
  addEventBattle,
  getEventBattles,
  updateBattleStatus,
  subscribeToEvent,
  unsubscribeFromEvent,
  getEventSubscribers,
  getUnnotifiedSubscribers,
  markNotified,
  getSubscriberCount,
  isSubscribed,
  EventRecord,
  EventBattleRecord,
  CreateEventInput,
  AddEventBattleInput,
} from '../db/eventDatabase';
import { notifyEventStarting } from '../db/notificationDatabase';
import {
  EventStatus,
  EventBattleStatus,
  FightCardEvent,
  EventBattle,
  EventManagerEvent,
} from '../types';

const logger = createLogger('event-manager');

// Configuration constants
const REGISTRATION_OPENS_HOURS_BEFORE = 24;
const REGISTRATION_CLOSES_MINUTES_BEFORE = 30;
const EVENT_START_NOTIFICATION_MINUTES = 5;
const TICKER_INTERVAL_MS = 60_000; // Check every 60 seconds

type EventManagerListener = (event: EventManagerEvent) => void;

class EventManager {
  private listeners: Set<EventManagerListener> = new Set();
  private tickerTimer: NodeJS.Timeout | null = null;
  private initialized = false;

  // Socket.IO integration for targeted notifications
  private io: any = null;
  private walletSocketMap: Map<string, string> = new Map(); // wallet -> socket.id

  /**
   * Set Socket.IO instance for WebSocket notifications
   */
  setSocketIO(io: any): void {
    this.io = io;
    logger.info('EventManager connected to Socket.IO');
  }

  /**
   * Register a wallet to a socket for targeted notifications
   */
  registerWalletSocket(wallet: string, socketId: string): void {
    this.walletSocketMap.set(wallet, socketId);
  }

  /**
   * Unregister a wallet from socket notifications
   */
  unregisterWalletSocket(wallet: string): void {
    this.walletSocketMap.delete(wallet);
  }

  /**
   * Emit to a specific wallet's connected socket
   */
  private emitToWallet(wallet: string, event: string, data: any): void {
    const socketId = this.walletSocketMap.get(wallet);
    if (socketId && this.io) {
      this.io.to(socketId).emit(event, data);
    }
  }

  /**
   * Initialize the event manager
   * Starts the ticker that checks event states every 60 seconds
   */
  initialize(): void {
    if (this.initialized) {
      logger.warn('EventManager already initialized');
      return;
    }

    logger.info('Initializing EventManager');

    // Start the ticker
    this.startTicker();

    this.initialized = true;
    logger.info('EventManager initialized');
  }

  /**
   * Start the periodic ticker
   */
  private startTicker(): void {
    this.tickerTimer = setInterval(() => {
      this.tick();
    }, TICKER_INTERVAL_MS);

    // Run immediately on startup
    this.tick();
  }

  /**
   * Main tick function - checks all events for state transitions
   */
  private tick(): void {
    const now = Date.now();

    try {
      // Check for registration opens
      this.checkRegistrationOpens(now);

      // Check for registration closes
      this.checkRegistrationCloses(now);

      // Check for events starting soon (notifications)
      this.checkUpcomingNotifications(now);

      // Check for events that should start
      this.checkEventStarts(now);
    } catch (error) {
      logger.error('Error in event manager tick', { error: String(error) });
    }
  }

  /**
   * Check for events where registration should open
   */
  private checkRegistrationOpens(now: number): void {
    const upcomingEvents = getEventsByStatus('upcoming');

    for (const event of upcomingEvents) {
      if (now >= event.registrationOpens) {
        updateEventStatus(event.id, 'registration_open');
        logger.info('Registration opened for event', { eventId: event.id, name: event.name });

        this.emit({
          type: 'registration_opened',
          eventId: event.id,
          data: this.mapEventRecordToFightCard(event),
        });
      }
    }
  }

  /**
   * Check for events where registration should close
   */
  private checkRegistrationCloses(now: number): void {
    const openEvents = getEventsByStatus('registration_open');

    for (const event of openEvents) {
      if (now >= event.registrationCloses) {
        // Move to in_progress if we have participants
        const subscriberCount = getSubscriberCount(event.id);
        if (subscriberCount >= 2) {
          updateEventStatus(event.id, 'in_progress');
          logger.info('Event registration closed, starting soon', {
            eventId: event.id,
            name: event.name,
            participants: subscriberCount,
          });
        } else {
          // Cancel if not enough participants
          updateEventStatus(event.id, 'cancelled');
          logger.info('Event cancelled - not enough participants', {
            eventId: event.id,
            name: event.name,
            participants: subscriberCount,
          });

          this.emit({
            type: 'event_cancelled',
            eventId: event.id,
            data: { reason: 'Not enough participants' },
          });
        }
      }
    }
  }

  /**
   * Check for events starting soon and send notifications
   */
  private checkUpcomingNotifications(now: number): void {
    // Get events starting in the next notification window
    const notificationWindowStart = now;
    const notificationWindowEnd = now + (EVENT_START_NOTIFICATION_MINUTES * 60 * 1000);

    const unnotifiedSubs = getUnnotifiedSubscribers(notificationWindowStart, notificationWindowEnd);

    // Group by event for efficiency
    const eventGroups = new Map<string, typeof unnotifiedSubs>();
    for (const sub of unnotifiedSubs) {
      const group = eventGroups.get(sub.eventId) || [];
      group.push(sub);
      eventGroups.set(sub.eventId, group);
    }

    // Emit notifications for each event
    for (const [eventId, subs] of eventGroups) {
      if (subs.length === 0) continue;

      const eventName = subs[0].eventName;
      const startTime = subs[0].scheduledStartTime;
      const minutesUntilStart = Math.ceil((startTime - now) / 60000);

      logger.info('Sending event start notifications', {
        eventId,
        eventName,
        subscriberCount: subs.length,
        minutesUntilStart,
      });

      // Create persistent notification for each subscriber and send WebSocket notification
      for (const sub of subs) {
        // Create persistent notification in database
        notifyEventStarting(sub.walletAddress, eventName, eventId, minutesUntilStart);

        // Emit targeted WebSocket notification to subscriber
        this.emitToWallet(sub.walletAddress, 'notification', {
          type: 'event_starting',
          eventId,
          eventName,
          startsIn: minutesUntilStart * 60 * 1000,
        });
      }

      // Mark all subscribers as notified to prevent spam
      markNotified(eventId);

      // Emit event_starting event to listeners (for room broadcasts)
      this.emit({
        type: 'event_starting',
        eventId,
        data: {
          eventName,
          minutesUntilStart,
          subscribers: subs.map(s => s.walletAddress),
        },
      });
    }
  }

  /**
   * Check for events that should start now
   */
  private checkEventStarts(now: number): void {
    const inProgressEvents = getEventsByStatus('in_progress');

    for (const event of inProgressEvents) {
      if (now >= event.scheduledStartTime) {
        logger.info('Event started', { eventId: event.id, name: event.name });

        this.emit({
          type: 'event_started',
          eventId: event.id,
          data: this.mapEventRecordToFightCard(event),
        });

        // Check for battles that should start
        const battles = getEventBattles(event.id);
        for (const battle of battles) {
          if (battle.status === 'scheduled') {
            this.emit({
              type: 'battle_starting',
              eventId: event.id,
              data: this.mapBattleRecordToEventBattle(battle),
            });
          }
        }
      }
    }
  }

  // ===================
  // Public API
  // ===================

  /**
   * Create a new event (admin-only)
   */
  createEvent(config: {
    name: string;
    description?: string;
    scheduledStartTime: number;
    entryFeeLamports: number;
    maxParticipants: number;
    createdBy: string;
  }): FightCardEvent {
    const now = Date.now();

    // Validate start time is in the future
    if (config.scheduledStartTime <= now) {
      throw new Error('Event start time must be in the future');
    }

    // Calculate registration windows
    const registrationOpens = config.scheduledStartTime - (REGISTRATION_OPENS_HOURS_BEFORE * 60 * 60 * 1000);
    const registrationCloses = config.scheduledStartTime - (REGISTRATION_CLOSES_MINUTES_BEFORE * 60 * 1000);

    // Validate registration opens is not in the past
    const actualRegistrationOpens = Math.max(registrationOpens, now + 60000); // At least 1 minute from now

    const id = uuidv4();
    const input: CreateEventInput = {
      id,
      name: config.name,
      description: config.description,
      scheduledStartTime: config.scheduledStartTime,
      registrationOpens: actualRegistrationOpens,
      registrationCloses,
      entryFeeLamports: config.entryFeeLamports,
      maxParticipants: config.maxParticipants,
      createdBy: config.createdBy,
    };

    const event = createEvent(input);

    logger.info('Event created', {
      eventId: id,
      name: config.name,
      scheduledStart: new Date(config.scheduledStartTime).toISOString(),
      registrationOpens: new Date(actualRegistrationOpens).toISOString(),
    });

    const fightCard = this.mapEventRecordToFightCard(event);

    this.emit({
      type: 'event_created',
      eventId: id,
      data: fightCard,
    });

    return fightCard;
  }

  /**
   * Add a battle to the event card
   */
  addBattleToCard(
    eventId: string,
    player1Wallet: string,
    player2Wallet: string,
    isMainEvent: boolean = false
  ): EventBattle {
    const event = getEvent(eventId);
    if (!event) {
      throw new Error('Event not found');
    }

    // Get existing battles to determine position
    const existingBattles = getEventBattles(eventId);
    const position = existingBattles.length + 1;

    const id = uuidv4();
    const input: AddEventBattleInput = {
      id,
      eventId,
      position,
      player1Wallet,
      player2Wallet,
      isMainEvent,
    };

    const battle = addEventBattle(input);

    logger.info('Battle added to event card', {
      eventId,
      battleId: id,
      position,
      isMainEvent,
    });

    return this.mapBattleRecordToEventBattle(battle);
  }

  /**
   * Subscribe a user to event notifications
   */
  subscribeUserToEvent(eventId: string, walletAddress: string): void {
    const event = getEvent(eventId);
    if (!event) {
      throw new Error('Event not found');
    }

    if (event.status === 'completed' || event.status === 'cancelled') {
      throw new Error('Cannot subscribe to a completed or cancelled event');
    }

    subscribeToEvent(walletAddress, eventId);

    logger.info('User subscribed to event', {
      eventId,
      wallet: walletAddress.slice(0, 8) + '...',
    });
  }

  /**
   * Unsubscribe a user from event notifications
   */
  unsubscribeUserFromEvent(eventId: string, walletAddress: string): boolean {
    return unsubscribeFromEvent(walletAddress, eventId);
  }

  /**
   * Get upcoming events
   */
  getUpcomingEvents(limit: number = 20): FightCardEvent[] {
    const events = getUpcomingEvents(limit);
    return events.map(e => this.mapEventRecordToFightCard(e));
  }

  /**
   * Get a single event with its battles
   */
  getEvent(id: string): { event: FightCardEvent; battles: EventBattle[] } | null {
    const event = getEvent(id);
    if (!event) return null;

    const battles = getEventBattles(id);

    return {
      event: this.mapEventRecordToFightCard(event),
      battles: battles.map(b => this.mapBattleRecordToEventBattle(b)),
    };
  }

  /**
   * Check if a user is subscribed to an event
   */
  isUserSubscribed(eventId: string, walletAddress: string): boolean {
    return isSubscribed(walletAddress, eventId);
  }

  /**
   * Get subscriber count for an event
   */
  getEventSubscriberCount(eventId: string): number {
    return getSubscriberCount(eventId);
  }

  /**
   * Mark an event as completed
   */
  completeEvent(eventId: string): void {
    const event = getEvent(eventId);
    if (!event) {
      throw new Error('Event not found');
    }

    updateEventStatus(eventId, 'completed');

    logger.info('Event completed', { eventId, name: event.name });

    this.emit({
      type: 'event_completed',
      eventId,
      data: { name: event.name },
    });
  }

  /**
   * Cancel an event
   */
  cancelEvent(eventId: string, reason: string): void {
    const event = getEvent(eventId);
    if (!event) {
      throw new Error('Event not found');
    }

    updateEventStatus(eventId, 'cancelled');

    logger.info('Event cancelled', { eventId, name: event.name, reason });

    this.emit({
      type: 'event_cancelled',
      eventId,
      data: { name: event.name, reason },
    });
  }

  /**
   * Update battle status
   */
  updateBattleStatus(battleId: string, status: EventBattleStatus): void {
    updateBattleStatus(battleId, status);
  }

  // ===================
  // Event Subscription (WebSocket)
  // ===================

  /**
   * Subscribe to event manager events
   */
  subscribe(listener: EventManagerListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Unsubscribe from event manager events
   */
  unsubscribe(listener: EventManagerListener): void {
    this.listeners.delete(listener);
  }

  /**
   * Emit an event to all listeners
   */
  private emit(event: EventManagerEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch (error) {
        logger.error('Error in event manager listener', { error: String(error) });
      }
    }
  }

  // ===================
  // Mappers
  // ===================

  private mapEventRecordToFightCard(record: EventRecord): FightCardEvent {
    return {
      id: record.id,
      name: record.name,
      description: record.description || undefined,
      scheduledStartTime: record.scheduledStartTime,
      registrationOpens: record.registrationOpens,
      registrationCloses: record.registrationCloses,
      status: record.status,
      entryFeeLamports: record.entryFeeLamports,
      maxParticipants: record.maxParticipants,
      prizePoolLamports: record.prizePoolLamports,
      createdAt: record.createdAt,
      createdBy: record.createdBy,
    };
  }

  private mapBattleRecordToEventBattle(record: EventBattleRecord): EventBattle {
    return {
      id: record.id,
      eventId: record.eventId,
      position: record.position,
      player1Wallet: record.player1Wallet,
      player2Wallet: record.player2Wallet,
      battleId: record.battleId || undefined,
      isMainEvent: record.isMainEvent,
      status: record.status,
    };
  }

  /**
   * Shutdown the event manager
   */
  shutdown(): void {
    if (this.tickerTimer) {
      clearInterval(this.tickerTimer);
      this.tickerTimer = null;
    }

    this.listeners.clear();
    this.initialized = false;

    logger.info('EventManager shutdown');
  }
}

// Export singleton instance
export const eventManager = new EventManager();
