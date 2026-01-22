/**
 * Alert Service - Discord webhook alerting for critical errors
 *
 * Sends notifications to Discord when critical system errors occur.
 * Implements throttling to prevent duplicate alerts within 5-minute windows.
 */

import { createLogger } from '../utils/logger';
import { DISCORD_WEBHOOK_URL } from '../config';

const logger = createLogger('alert');

interface DiscordEmbed {
  title: string;
  description: string;
  color: number;
  fields: Array<{
    name: string;
    value: string;
    inline?: boolean;
  }>;
  timestamp: string;
}

interface DiscordWebhookPayload {
  embeds: DiscordEmbed[];
}

export class AlertService {
  private cache: Map<string, number>;
  private readonly cooldownMs = 5 * 60 * 1000; // 5 minutes
  private readonly enabled: boolean;

  constructor() {
    this.cache = new Map();
    this.enabled = Boolean(DISCORD_WEBHOOK_URL);

    if (!this.enabled) {
      logger.warn('Alert service disabled - DISCORD_WEBHOOK_URL not configured');
    } else {
      logger.info('Alert service initialized', { webhookConfigured: true });
    }
  }

  /**
   * Send critical alert to Discord webhook
   *
   * @param title - Alert title (e.g., "Settlement Failed")
   * @param message - Detailed error message
   * @param errorCode - Unique error code for throttling (e.g., "SETTLEMENT_FAILED")
   * @param context - Additional context (will be logged in Discord)
   */
  async sendCriticalAlert(
    title: string,
    message: string,
    errorCode: string,
    context?: Record<string, unknown>
  ): Promise<void> {
    // Skip if webhook not configured
    if (!this.enabled || !DISCORD_WEBHOOK_URL) {
      logger.warn('Alert not sent - webhook not configured', { title, errorCode });
      return;
    }

    // Check throttling - skip if same error code alerted recently
    const now = Date.now();
    const lastAlertTime = this.cache.get(errorCode);

    if (lastAlertTime && now - lastAlertTime < this.cooldownMs) {
      const timeRemaining = Math.ceil((this.cooldownMs - (now - lastAlertTime)) / 1000);
      logger.debug('Alert throttled', {
        errorCode,
        cooldownRemaining: `${timeRemaining}s`,
      });
      return;
    }

    // Build Discord embed
    const embed: DiscordEmbed = {
      title: `🚨 ${title}`,
      description: message,
      color: 15158332, // Red color
      fields: [
        {
          name: 'Environment',
          value: process.env.NODE_ENV || 'unknown',
          inline: true,
        },
        {
          name: 'Error Code',
          value: errorCode,
          inline: true,
        },
      ],
      timestamp: new Date().toISOString(),
    };

    // Add context fields if provided
    if (context) {
      for (const [key, value] of Object.entries(context)) {
        embed.fields.push({
          name: key,
          value: String(value).substring(0, 1024), // Discord field limit
          inline: false,
        });
      }
    }

    const payload: DiscordWebhookPayload = {
      embeds: [embed],
    };

    // Send webhook request
    try {
      const response = await fetch(DISCORD_WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Discord webhook failed: ${response.status} ${errorText}`);
      }

      // Update cache on success
      this.cache.set(errorCode, now);

      logger.info('Critical alert sent', {
        title,
        errorCode,
        nextAlertAvailable: new Date(now + this.cooldownMs).toISOString(),
      });
    } catch (error: any) {
      // IMPORTANT: Never throw - alerting should never break the app
      logger.error('Failed to send alert to Discord', {
        error: error.message,
        title,
        errorCode,
      });
    }
  }

  /**
   * Clear throttling cache for an error code (for testing)
   */
  clearThrottle(errorCode: string): void {
    this.cache.delete(errorCode);
  }

  /**
   * Clear all throttling cache (for testing)
   */
  clearAllThrottles(): void {
    this.cache.clear();
  }
}

// Export singleton instance
export const alertService = new AlertService();
