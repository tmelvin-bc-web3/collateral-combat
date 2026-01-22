# Phase 4: Monitoring & Ops - Research

**Researched:** 2026-01-22
**Domain:** Production monitoring, logging, alerting, and operations
**Confidence:** HIGH

## Summary

Phase 4 prepares DegenDome for mainnet deployment with production-grade monitoring and operational readiness. Research shows that **structured logging is already 90% complete** from Phase 1 (01-06), with a robust `createLogger` utility providing JSON formatting and automatic sensitive data redaction. The remaining work focuses on upgrading to a battle-tested logging library (Pino), implementing error alerting via webhooks, building a simple metrics dashboard, and documenting operational procedures.

**Current state assessment:**
- OPS-01 (Structured logging): 90% done - custom logger exists with JSON output, log levels, and redaction
- OPS-02 (Error alerting): 0% done - no alerting mechanism exists
- OPS-03 (Metrics dashboard): 50% done - adminService.ts tracks key metrics but no dashboard UI
- OPS-04 (Runbook): 0% done - no incident response documentation
- OPS-05 (Mainnet deployment): 0% done - no deployment scripts tested
- OPS-06 (Backup procedures): 0% done - no documented backup strategy

**Primary recommendation:** Replace custom logger with Pino (5x faster, battle-tested), add Discord webhook alerting for critical errors, expose existing metrics via admin dashboard, and document operational procedures as markdown runbooks in the repo.

## Standard Stack

The established tools for Node.js production monitoring in 2026:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| pino | 9.x | Structured logging | 5x faster than Winston, async, minimal overhead, production-proven |
| better-sqlite3 | 12.x | Database (already in use) | Native backup API, production-safe |
| node-cron | 4.x | Scheduled tasks (already in use) | Simple, reliable, no external dependencies |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| pino-pretty | 11.x | Development log formatting | Dev environment only (human-readable logs) |
| pino-http | 9.x | HTTP request logging | If adding Express request logging |
| @slack/webhook | 7.x | Slack alerting | Alternative to Discord for alerts |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Pino | Winston | More features (file rotation, transports) but 5x slower, more configuration |
| Pino | Custom logger (current) | Zero dependencies but lacks battle-testing, missing edge case handling |
| Discord webhooks | PagerDuty | Enterprise features (on-call scheduling, escalation) but overkill for small team, expensive |
| Discord webhooks | Email (nodemailer) | More universal but less immediate, spam filter issues |
| Admin dashboard (custom) | Grafana + Prometheus | Industry standard but heavy infrastructure, overkill for initial launch |

**Installation:**
```bash
# Backend
cd backend
npm install pino pino-pretty

# No new frontend dependencies needed
```

## Architecture Patterns

### Recommended Logging Structure
```
backend/src/
├── utils/
│   └── logger.ts              # Pino logger factory (replaces current)
├── services/
│   └── alertService.ts        # Discord webhook alerting
│   └── metricsService.ts      # In-memory metrics tracking
└── config.ts                  # LOG_LEVEL, DISCORD_WEBHOOK_URL
```

### Pattern 1: Service-Specific Loggers with Pino
**What:** Create loggers per service with contextual metadata
**When to use:** All backend services
**Example:**
```typescript
// Source: https://signoz.io/guides/pino-logger/
import pino from 'pino';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  formatters: {
    level: (label) => ({ level: label.toUpperCase() })
  },
  // Pretty print in dev, JSON in production
  transport: process.env.NODE_ENV !== 'production' ? {
    target: 'pino-pretty',
    options: { colorize: true }
  } : undefined,
  // Automatic sensitive data redaction
  redact: {
    paths: ['signature', 'privateKey', 'secret', 'password', 'token'],
    censor: '[REDACTED]'
  }
});

// Child logger with service context
export const createLogger = (service: string) => {
  return logger.child({ service });
};
```

### Pattern 2: Discord Webhook Alerting with Rate Limiting
**What:** Send critical errors to Discord channel with throttling
**When to use:** Settlement failures, balance mismatches, service crashes
**Example:**
```typescript
// Source: https://hookdeck.com/webhooks/platforms/guide-to-discord-webhooks-features-and-best-practices
interface AlertCache {
  [key: string]: number; // errorCode -> last alert timestamp
}

const alertCache: AlertCache = {};
const ALERT_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes
const DISCORD_RATE_LIMIT = 5; // 5 requests per 2 seconds

async function sendDiscordAlert(title: string, message: string, errorCode: string) {
  // Throttle duplicate alerts
  const now = Date.now();
  const lastAlert = alertCache[errorCode] || 0;
  if (now - lastAlert < ALERT_COOLDOWN_MS) {
    return; // Skip duplicate
  }

  // Respect Discord rate limits (5 req / 2 sec per webhook)
  const body = JSON.stringify({
    embeds: [{
      title: `🚨 ${title}`,
      description: message,
      color: 15158332, // Red
      timestamp: new Date().toISOString(),
      fields: [
        { name: 'Environment', value: process.env.NODE_ENV || 'unknown', inline: true },
        { name: 'Error Code', value: errorCode, inline: true }
      ]
    }]
  });

  try {
    await fetch(process.env.DISCORD_WEBHOOK_URL!, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body
    });
    alertCache[errorCode] = now;
  } catch (err) {
    // Fallback: log to console if webhook fails
    logger.error('Failed to send Discord alert', { error: err, title });
  }
}
```

### Pattern 3: In-Memory Metrics Tracking
**What:** Simple counter/gauge tracking without external dependencies
**When to use:** Initial launch metrics (DAU, match volume, error rate)
**Example:**
```typescript
// Source: https://github.com/mikejihbe/metrics (concept), implemented in-memory
class Metrics {
  private counters = new Map<string, number>();
  private gauges = new Map<string, number>();

  increment(name: string, value: number = 1) {
    this.counters.set(name, (this.counters.get(name) || 0) + value);
  }

  setGauge(name: string, value: number) {
    this.gauges.set(name, value);
  }

  getSnapshot() {
    return {
      counters: Object.fromEntries(this.counters),
      gauges: Object.fromEntries(this.gauges),
      timestamp: Date.now()
    };
  }

  reset() {
    this.counters.clear();
    this.gauges.clear();
  }
}

export const metrics = new Metrics();

// Usage in services:
metrics.increment('matches.completed');
metrics.increment('matches.total_volume', match.prizePool);
metrics.setGauge('matches.active', battleManager.getActiveBattles().length);
```

### Pattern 4: Admin Dashboard Endpoint
**What:** Expose metrics via existing admin API
**When to use:** Internal monitoring dashboard
**Example:**
```typescript
// Source: Existing backend/src/services/adminService.ts (already implemented)
// Add new endpoint to backend/src/routes/admin.ts:
router.get('/metrics', authenticate, async (req, res) => {
  const snapshot = metrics.getSnapshot();
  const health = await adminService.getHealthStatus();

  res.json({
    metrics: snapshot,
    health,
    generated: new Date().toISOString()
  });
});
```

### Anti-Patterns to Avoid
- **Synchronous logging in hot paths:** Pino handles async internally, but don't add sync operations in log callbacks
- **Over-alerting:** Don't alert on every error - use ERROR_THRESHOLD counts or severity filters
- **Logging sensitive data:** Even with redaction, avoid logging raw signatures, private keys in any context
- **File-based log rotation:** On Render, logs go to stdout/stderr - platform handles rotation, don't write to disk
- **Blocking webhook calls:** Always use async/await for webhooks, add timeout handling

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| JSON logging with redaction | Custom logger with manual redaction | Pino with built-in redaction | Handles edge cases (circular refs, nested objects, performance) |
| Log aggregation | Custom log parsing | Render platform logs + search | Platform-native, free, already aggregated |
| Metrics visualization | Custom charting from scratch | Chart.js + admin dashboard | Battle-tested, accessible, lightweight |
| Discord rate limiting | Manual sleep/throttle | Alert cache with timestamps | Prevents Cloudflare ban (10k reqs = 1hr timeout) |
| SQLite backup | File copying (`fs.copyFile`) | `db.backup()` API | Prevents corruption during writes, atomic |
| Health checks | Manual status checks | Kubernetes-style /livez /readyz | Industry standard, works with orchestrators |
| Incident response | Ad-hoc Slack messages | Markdown runbook in repo | Version controlled, searchable, discoverable |

**Key insight:** Custom monitoring code is technical debt - Pino and simple in-memory metrics provide 90% of what's needed for initial mainnet launch.

## Common Pitfalls

### Pitfall 1: Logging Overhead in Production
**What goes wrong:** Verbose logging (debug/trace) in production slows down request handling
**Why it happens:** Forgot to set `LOG_LEVEL=info` in production environment
**How to avoid:**
- Default to `info` level in production (already done in `backend/src/config.ts`)
- Use Pino's conditional logging: `logger.debug('expensive operation %o', () => expensiveObject)`
- Monitor memory usage - Pino is low-overhead but logging 1000 req/sec still adds up
**Warning signs:** High CPU usage without high request volume, memory growth over time

### Pitfall 2: Discord Webhook Rate Limit Ban
**What goes wrong:** Sending too many alerts triggers Cloudflare ban (1 hour+)
**Why it happens:** Error loop generates hundreds of alerts in seconds (e.g., Solana RPC failures)
**How to avoid:**
- Implement alert cache with 5-minute cooldown per error code
- Respect 5 requests / 2 seconds limit (Discord enforces this)
- Add global circuit breaker: max 50 alerts/hour total
- Use alert batching: accumulate errors, send summary every 5 minutes
**Warning signs:** 429 responses from Discord, alerts stop arriving, webhook stops working

### Pitfall 3: SQLite Corruption from File Copying
**What goes wrong:** Backing up SQLite by copying the `.db` file results in corrupted backup
**Why it happens:** App writes to database during copy, resulting in inconsistent state
**How to avoid:**
- ALWAYS use `db.backup()` API (better-sqlite3 built-in)
- Never use `fs.copyFile()` on live database
- Automate backups with cron job (Node.js native, not system cron)
- Test restore procedure - untested backups are useless
**Warning signs:** Backup file won't open, "database disk image is malformed" error

### Pitfall 4: Missing Critical Alerts
**What goes wrong:** Settlement fails silently, users don't get paid, team doesn't know
**Why it happens:** Error thrown but not caught by alerting layer, or alert filtered out
**How to avoid:**
- Wrap critical operations (settlement, withdrawal) in try-catch with explicit alerts
- Use error codes to identify alert-worthy events (BalanceError, ServiceError)
- Add "catch-all" alert for uncaught exceptions: `process.on('uncaughtException', sendAlert)`
- Test alerting in devnet with intentional failures
**Warning signs:** Users report issues before team knows, errors in logs but no alerts sent

### Pitfall 5: Metrics Dashboard as Security Risk
**What goes wrong:** Public metrics endpoint leaks sensitive business data
**Why it happens:** Forgot to add authentication to `/api/admin/metrics` endpoint
**How to avoid:**
- ALL admin endpoints must use existing `authenticate` middleware (backend/src/middleware/auth.ts)
- Verify wallet in `ADMIN_WALLETS` environment variable
- Never expose metrics at public endpoint (`/api/metrics`) - use `/api/admin/metrics`
- Consider separate admin subdomain with IP whitelist (future enhancement)
**Warning signs:** Metrics accessible without wallet signature, public search engines index admin pages

### Pitfall 6: Runbook Becomes Stale
**What goes wrong:** Runbook documents old procedures, team ignores it during incidents
**Why it happens:** Code changes but runbook not updated, becomes untrustworthy
**How to avoid:**
- Store runbook in repo as markdown (`.planning/INCIDENT_RESPONSE.md`)
- Treat runbook as code - review during PRs that change critical paths
- Date sections: "Last updated: 2026-01-22" to track freshness
- Incident post-mortem updates runbook with lessons learned
**Warning signs:** "I didn't know we had a runbook", runbook references deleted code/endpoints

## Code Examples

Verified patterns from research:

### Pino Logger Setup (Production-Ready)
```typescript
// Source: https://betterstack.com/community/guides/logging/how-to-install-setup-and-use-pino-to-log-node-js-applications/
import pino from 'pino';

// backend/src/utils/logger.ts
export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',

  // Production: JSON, Development: Pretty
  transport: process.env.NODE_ENV !== 'production' ? {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'HH:MM:ss Z',
      ignore: 'pid,hostname'
    }
  } : undefined,

  // Automatic sensitive data redaction
  redact: {
    paths: [
      'signature',
      'privateKey',
      'secret',
      'password',
      'token',
      '*.signature',
      '*.privateKey'
    ],
    censor: '[REDACTED]'
  },

  // Serialize errors properly
  serializers: {
    error: pino.stdSerializers.err
  },

  // Add timestamp
  timestamp: pino.stdTimeFunctions.isoTime
});

// Factory for service-specific loggers
export const createLogger = (service: string) => {
  return logger.child({ service });
};
```

### Discord Alert Service
```typescript
// Source: https://hookdeck.com/webhooks/platforms/guide-to-discord-webhooks-features-and-best-practices
// backend/src/services/alertService.ts
import { logger } from '../utils/logger';

interface AlertCache {
  [key: string]: number;
}

class AlertService {
  private cache: AlertCache = {};
  private cooldownMs = 5 * 60 * 1000; // 5 minutes
  private enabled = !!process.env.DISCORD_WEBHOOK_URL;

  async sendCriticalAlert(
    title: string,
    message: string,
    errorCode: string,
    context?: Record<string, unknown>
  ) {
    if (!this.enabled) {
      logger.warn('Alert skipped - DISCORD_WEBHOOK_URL not configured');
      return;
    }

    // Throttle duplicates
    const now = Date.now();
    const lastSent = this.cache[errorCode] || 0;
    if (now - lastSent < this.cooldownMs) {
      logger.debug('Alert throttled', { errorCode, cooldownRemaining: this.cooldownMs - (now - lastSent) });
      return;
    }

    try {
      const response = await fetch(process.env.DISCORD_WEBHOOK_URL!, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          embeds: [{
            title: `🚨 ${title}`,
            description: message,
            color: 15158332, // Red
            timestamp: new Date().toISOString(),
            fields: [
              { name: 'Environment', value: process.env.NODE_ENV || 'unknown', inline: true },
              { name: 'Error Code', value: errorCode, inline: true },
              ...(context ? [{ name: 'Context', value: JSON.stringify(context, null, 2) }] : [])
            ]
          }]
        })
      });

      if (!response.ok) {
        throw new Error(`Discord webhook failed: ${response.status}`);
      }

      this.cache[errorCode] = now;
      logger.info('Critical alert sent', { title, errorCode });
    } catch (error) {
      logger.error('Failed to send Discord alert', { error, title, errorCode });
    }
  }

  // For testing
  async sendTestAlert() {
    return this.sendCriticalAlert(
      'Test Alert',
      'This is a test alert from DegenDome monitoring',
      'TEST_ALERT'
    );
  }
}

export const alertService = new AlertService();
```

### SQLite Backup Automation
```typescript
// Source: https://github.com/WiseLibs/better-sqlite3/blob/master/docs/api.md
// backend/src/services/backupService.ts
import Database from 'better-sqlite3';
import { logger } from '../utils/logger';
import cron from 'node-cron';
import path from 'path';
import fs from 'fs';

const DB_PATH = process.env.DATABASE_PATH || './data/progression.db';
const BACKUP_DIR = './data/backups';

// Ensure backup directory exists
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

async function createBackup() {
  const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
  const backupPath = path.join(BACKUP_DIR, `backup-${timestamp}.db`);

  try {
    const db = new Database(DB_PATH);

    // Use SQLite's backup API (atomic, safe during writes)
    await db.backup(backupPath);

    db.close();

    const stats = fs.statSync(backupPath);
    logger.info('Database backup created', {
      path: backupPath,
      size: stats.size,
      timestamp
    });

    // Clean up old backups (keep last 7 days)
    cleanOldBackups();
  } catch (error) {
    logger.error('Database backup failed', { error, backupPath });
    throw error;
  }
}

function cleanOldBackups() {
  const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
  const now = Date.now();

  try {
    const files = fs.readdirSync(BACKUP_DIR);
    for (const file of files) {
      if (!file.endsWith('.db')) continue;

      const filePath = path.join(BACKUP_DIR, file);
      const stats = fs.statSync(filePath);

      if (now - stats.mtimeMs > maxAge) {
        fs.unlinkSync(filePath);
        logger.info('Old backup deleted', { file, age: Math.floor((now - stats.mtimeMs) / 86400000) + ' days' });
      }
    }
  } catch (error) {
    logger.error('Failed to clean old backups', { error });
  }
}

// Schedule backups every 6 hours
export function startBackupScheduler() {
  cron.schedule('0 */6 * * *', () => {
    logger.info('Running scheduled backup');
    createBackup().catch(err => {
      logger.error('Scheduled backup failed', { error: err });
    });
  });

  logger.info('Backup scheduler started (runs every 6 hours)');
}
```

### Health Check Endpoints (Kubernetes-Compatible)
```typescript
// Source: https://developers.redhat.com/learning/learn:openshift:develop-cloud-native-nodejs-applications-expressjs/resource/resources:add-health-checks-your-application
// backend/src/index.ts (add after existing /api/health)

// Liveness probe - is the app running?
app.get('/livez', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: Date.now()
  });
});

// Readiness probe - is the app ready to serve traffic?
app.get('/readyz', async (req, res) => {
  try {
    // Check critical dependencies
    const health = await adminService.getHealthStatus();

    if (health.database.status === 'down') {
      return res.status(503).json({
        status: 'not ready',
        reason: 'database unavailable',
        timestamp: Date.now()
      });
    }

    res.status(200).json({
      status: 'ready',
      timestamp: Date.now()
    });
  } catch (error) {
    res.status(503).json({
      status: 'not ready',
      error: error.message,
      timestamp: Date.now()
    });
  }
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Winston for logging | Pino (5x faster) | 2024-2025 | Async logging, minimal overhead for high-throughput apps |
| PagerDuty for small teams | Discord/Slack webhooks | 2025-2026 | $0 vs $21/user/month, sufficient for teams < 10 |
| Prometheus + Grafana for everything | In-memory metrics for launch | 2025-2026 | Simpler stack, iterate to Prometheus later if needed |
| File-based logs | Stdout/stderr (12-factor app) | 2020+ | Platform handles aggregation (Render, Heroku, Kubernetes) |
| Manual backups | Automated cron-based backups | Always best practice | Prevents "forgot to backup" disasters |
| System cron | Node.js `node-cron` | 2023+ | No system access needed (works in containers/PaaS) |
| `fs.copyFile` for SQLite | `db.backup()` API | 2022+ (better-sqlite3 v8+) | Atomic, corruption-proof backups |

**Deprecated/outdated:**
- **Morgan logging middleware:** Superseded by Pino-http (faster, structured)
- **PM2 for monitoring:** Now use platform-native tools (Render metrics, Kubernetes probes)
- **Bunyan logger:** Maintenance dropped, Pino is successor

## Open Questions

Things that couldn't be fully resolved:

1. **Render-specific metrics availability**
   - What we know: Render provides basic metrics (CPU, memory, requests) in dashboard
   - What's unclear: Whether Render exposes metrics API for custom dashboards
   - Recommendation: Use Render dashboard for infrastructure metrics, custom admin API for business metrics

2. **Solana RPC reliability for health checks**
   - What we know: RPC can have intermittent failures without impacting app
   - What's unclear: Should health check fail if RPC is down but app is functional?
   - Recommendation: Mark as "degraded" not "down" - app can still serve cached data

3. **Alert fatigue threshold**
   - What we know: 5-minute cooldown prevents spam
   - What's unclear: What's the right cooldown for different error types?
   - Recommendation: Start with 5 minutes globally, adjust based on first week of mainnet data

4. **Backup storage location**
   - What we know: Local backups work for development
   - What's unclear: Render ephemeral filesystem - do backups persist?
   - Recommendation: Validate on Render environment, may need S3/cloud storage for production

## Sources

### Primary (HIGH confidence)
- [Pino Logger: Complete Node.js Guide with Examples [2026] | SigNoz](https://signoz.io/guides/pino-logger/)
- [A Complete Guide to Pino Logging in Node.js | Better Stack Community](https://betterstack.com/community/guides/logging/how-to-install-setup-and-use-pino-to-log-node-js-applications/)
- [Pino vs Winston: Which Node.js Logger Should You Choose? | Better Stack Community](https://betterstack.com/community/comparisons/pino-vs-winston/)
- [better-sqlite3 API Documentation](https://github.com/WiseLibs/better-sqlite3/blob/master/docs/api.md)
- [Node.js v25.3.0 SQLite Documentation](https://nodejs.org/api/sqlite.html)
- [Discord Webhooks Features and Best Practices | Hookdeck](https://hookdeck.com/webhooks/platforms/guide-to-discord-webhooks-features-and-best-practices)
- [Discord Webhooks Rate Limits](https://birdie0.github.io/discord-webhooks-guide/other/rate_limits.html)
- [Health Checks | Node.JS Reference Architecture](https://nodeshift.dev/nodejs-reference-architecture/operations/healthchecks/)
- [Add health checks to your application | Red Hat Developer](https://developers.redhat.com/learning/learn:openshift:develop-cloud-native-nodejs-applications-expressjs/resource/resources:add-health-checks-your-application)

### Secondary (MEDIUM confidence)
- [Best Practices for Managing SQLite Backups in Production | Sling Academy](https://www.slingacademy.com/article/best-practices-for-managing-sqlite-backups-in-production/)
- [Solana - Deploying Programs](https://solana.com/docs/programs/deploying)
- [Deploy Your First Solana Program | Solana](https://solana.com/docs/intro/quick-start/deploying-programs)
- [Environment Variables and Secrets – Render Docs](https://render.com/docs/configure-environment-variables)
- [Incident Response Runbook Template for DevOps - DEV Community](https://dev.to/sajjasudhakararao/incident-response-runbook-template-for-devops-4ljl)
- [DevOps Runbook Template For Streamlined Incident Response | Cloudairy](https://cloudairy.com/template/devops-runbook/)
- [Simple node.JS and Slack WebHook integration | Security and Node.js](https://blog.nodeswat.com/simple-node-js-and-slack-webhook-integration-d87c95aa9600)

### Tertiary (LOW confidence)
- [Best Node.js Application Monitoring Tools in 2026 | Better Stack](https://betterstack.com/community/comparisons/nodejs-application-monitoring-tools/)
- [GitHub - mikejihbe/metrics: A metrics library for Node.js](https://github.com/mikejihbe/metrics) - Old but conceptually valid

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Pino is industry standard, better-sqlite3 already in use
- Architecture: HIGH - Patterns verified with official docs and production examples
- Pitfalls: HIGH - Based on real production failure modes documented in guides
- Alerting: MEDIUM - Discord rate limits well-documented but alert thresholds are team-specific
- Deployment: MEDIUM - Solana deployment well-documented but Render-specific details require validation

**Research date:** 2026-01-22
**Valid until:** ~90 days (stable domain - logging/monitoring patterns don't change rapidly)

**Key finding:** DegenDome already has strong monitoring foundations (structured logging from 01-06, admin metrics from adminService.ts). The work is integration and polish, not building from scratch.
