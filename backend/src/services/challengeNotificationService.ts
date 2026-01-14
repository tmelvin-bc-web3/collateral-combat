import { ChallengeAcceptedNotification } from '../types';

interface ChallengeSubscription {
  walletAddress: string;
  socketId: string;
  subscribedAt: number;
  activeChallengeIds: Set<string>;
}

interface ChallengeInfo {
  challengerWallet: string;
  challengeCode: string;
  entryFee: number;
  duration: number;
  createdAt: number;
}

class ChallengeNotificationService {
  // Wallet -> subscription info
  private subscriptions: Map<string, ChallengeSubscription> = new Map();

  // Challenge ID -> challenger info
  private challengeToChallenger: Map<string, ChallengeInfo> = new Map();

  // 10 minute grace period for notifications
  private readonly GRACE_PERIOD_MS = 10 * 60 * 1000;

  // Cleanup interval (every 5 minutes)
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Run cleanup every 5 minutes
    this.cleanupInterval = setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  // Register a challenge when created
  registerChallenge(
    challengeId: string,
    challengerWallet: string,
    challengeCode: string,
    entryFee: number,
    duration: number
  ): void {
    this.challengeToChallenger.set(challengeId, {
      challengerWallet,
      challengeCode,
      entryFee,
      duration,
      createdAt: Date.now(),
    });

    // Add to challenger's active challenges
    const subscription = this.subscriptions.get(challengerWallet);
    if (subscription) {
      subscription.activeChallengeIds.add(challengeId);
    }

    console.log(`[ChallengeNotification] Registered challenge ${challengeCode} from ${challengerWallet.slice(0, 8)}...`);
  }

  // Subscribe to challenge notifications
  subscribe(walletAddress: string, socketId: string): void {
    const existing = this.subscriptions.get(walletAddress);

    if (existing) {
      // Update socket ID if already subscribed
      existing.socketId = socketId;
      existing.subscribedAt = Date.now();
      console.log(`[ChallengeNotification] Updated subscription for ${walletAddress.slice(0, 8)}... with socket ${socketId}`);
    } else {
      this.subscriptions.set(walletAddress, {
        walletAddress,
        socketId,
        subscribedAt: Date.now(),
        activeChallengeIds: new Set(),
      });
      console.log(`[ChallengeNotification] New subscription for ${walletAddress.slice(0, 8)}... with socket ${socketId}`);
    }
  }

  // Update socket ID for existing subscription (e.g., on reconnect)
  updateSocketId(walletAddress: string, newSocketId: string): void {
    const subscription = this.subscriptions.get(walletAddress);
    if (subscription) {
      subscription.socketId = newSocketId;
      subscription.subscribedAt = Date.now(); // Refresh grace period
      console.log(`[ChallengeNotification] Updated socket for ${walletAddress.slice(0, 8)}... to ${newSocketId}`);
    }
  }

  // Unsubscribe from notifications
  unsubscribe(walletAddress: string): void {
    this.subscriptions.delete(walletAddress);
    console.log(`[ChallengeNotification] Unsubscribed ${walletAddress.slice(0, 8)}...`);
  }

  // Get notification target when a challenge is accepted
  getNotificationTarget(challengeId: string): {
    socketId: string;
    walletAddress: string;
    notification: ChallengeAcceptedNotification;
  } | null {
    const challengeInfo = this.challengeToChallenger.get(challengeId);
    if (!challengeInfo) {
      console.log(`[ChallengeNotification] No challenge info found for ${challengeId}`);
      return null;
    }

    const subscription = this.subscriptions.get(challengeInfo.challengerWallet);
    if (!subscription) {
      console.log(`[ChallengeNotification] No subscription found for challenger ${challengeInfo.challengerWallet.slice(0, 8)}...`);
      return null;
    }

    // Check if within grace period
    const now = Date.now();
    const timeSinceSubscription = now - subscription.subscribedAt;
    if (timeSinceSubscription > this.GRACE_PERIOD_MS) {
      console.log(`[ChallengeNotification] Subscription expired for ${challengeInfo.challengerWallet.slice(0, 8)}... (${Math.floor(timeSinceSubscription / 1000)}s old)`);
      return null;
    }

    return {
      socketId: subscription.socketId,
      walletAddress: challengeInfo.challengerWallet,
      notification: {
        challengeId,
        challengeCode: challengeInfo.challengeCode,
        acceptedBy: '', // Will be filled in by caller
        battleId: '', // Will be filled in by caller
        entryFee: challengeInfo.entryFee,
        duration: challengeInfo.duration,
      },
    };
  }

  // Mark challenge as accepted (remove from tracking)
  markChallengeAccepted(challengeId: string): void {
    const challengeInfo = this.challengeToChallenger.get(challengeId);
    if (challengeInfo) {
      // Remove from challenger's active challenges
      const subscription = this.subscriptions.get(challengeInfo.challengerWallet);
      if (subscription) {
        subscription.activeChallengeIds.delete(challengeId);
      }
    }
    this.challengeToChallenger.delete(challengeId);
    console.log(`[ChallengeNotification] Marked challenge ${challengeId} as accepted`);
  }

  // Cleanup expired subscriptions and old challenges
  cleanup(): void {
    const now = Date.now();
    let removedSubscriptions = 0;
    let removedChallenges = 0;

    // Remove expired subscriptions (beyond grace period)
    this.subscriptions.forEach((subscription, wallet) => {
      if (now - subscription.subscribedAt > this.GRACE_PERIOD_MS) {
        this.subscriptions.delete(wallet);
        removedSubscriptions++;
      }
    });

    // Remove old challenges (more than 1 hour old)
    const CHALLENGE_EXPIRY_MS = 60 * 60 * 1000; // 1 hour
    this.challengeToChallenger.forEach((info, challengeId) => {
      if (now - info.createdAt > CHALLENGE_EXPIRY_MS) {
        this.challengeToChallenger.delete(challengeId);
        removedChallenges++;
      }
    });

    if (removedSubscriptions > 0 || removedChallenges > 0) {
      console.log(`[ChallengeNotification] Cleanup: removed ${removedSubscriptions} subscriptions, ${removedChallenges} challenges`);
    }
  }

  // Get stats for debugging
  getStats(): { subscriptions: number; challenges: number } {
    return {
      subscriptions: this.subscriptions.size,
      challenges: this.challengeToChallenger.size,
    };
  }

  // Shutdown cleanup interval
  shutdown(): void {
    clearInterval(this.cleanupInterval);
  }
}

// Singleton instance
export const challengeNotificationService = new ChallengeNotificationService();
