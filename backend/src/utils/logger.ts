export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  [key: string]: unknown;
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
  service?: string;
}

// Log level hierarchy
const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

// Get configured log level from environment
const getConfiguredLevel = (): LogLevel => {
  const envLevel = process.env.LOG_LEVEL?.toLowerCase();
  if (envLevel && envLevel in LOG_LEVELS) {
    return envLevel as LogLevel;
  }
  // Default: debug in development, info in production
  return process.env.NODE_ENV === 'production' ? 'info' : 'debug';
};

// Redact sensitive fields from context
const SENSITIVE_FIELDS = ['signature', 'privateKey', 'secret', 'password', 'token'];
const WALLET_TRUNCATE_LENGTH = 8;

function redactSensitive(context: LogContext): LogContext {
  const redacted: LogContext = {};
  for (const [key, value] of Object.entries(context)) {
    // Fully redact sensitive fields
    if (SENSITIVE_FIELDS.some(f => key.toLowerCase().includes(f))) {
      redacted[key] = '[REDACTED]';
    }
    // Truncate wallet addresses
    else if (key.toLowerCase().includes('wallet') && typeof value === 'string') {
      redacted[key] = value.length > WALLET_TRUNCATE_LENGTH
        ? `${value.slice(0, WALLET_TRUNCATE_LENGTH)}...`
        : value;
    }
    // Recursively handle nested objects
    else if (value && typeof value === 'object' && !Array.isArray(value)) {
      redacted[key] = redactSensitive(value as LogContext);
    }
    else {
      redacted[key] = value;
    }
  }
  return redacted;
}

class Logger {
  private service: string;
  private level: LogLevel;

  constructor(service: string = 'backend') {
    this.service = service;
    this.level = getConfiguredLevel();
  }

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] >= LOG_LEVELS[this.level];
  }

  private formatEntry(level: LogLevel, message: string, context?: LogContext): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      service: this.service,
      context: context ? redactSensitive(context) : undefined,
    };
  }

  private output(entry: LogEntry): void {
    const isProduction = process.env.NODE_ENV === 'production';

    if (isProduction) {
      // JSON format for production (easy to parse)
      const output = JSON.stringify(entry);
      if (entry.level === 'error') {
        console.error(output);
      } else if (entry.level === 'warn') {
        console.warn(output);
      } else {
        console.log(output);
      }
    } else {
      // Human-readable format for development
      const prefix = `[${entry.timestamp}] [${entry.level.toUpperCase()}] [${entry.service}]`;
      const contextStr = entry.context ? ` ${JSON.stringify(entry.context)}` : '';
      const output = `${prefix} ${entry.message}${contextStr}`;

      if (entry.level === 'error') {
        console.error(output);
      } else if (entry.level === 'warn') {
        console.warn(output);
      } else {
        console.log(output);
      }
    }
  }

  debug(message: string, context?: LogContext): void {
    if (this.shouldLog('debug')) {
      this.output(this.formatEntry('debug', message, context));
    }
  }

  info(message: string, context?: LogContext): void {
    if (this.shouldLog('info')) {
      this.output(this.formatEntry('info', message, context));
    }
  }

  warn(message: string, context?: LogContext): void {
    if (this.shouldLog('warn')) {
      this.output(this.formatEntry('warn', message, context));
    }
  }

  error(message: string, context?: LogContext): void {
    if (this.shouldLog('error')) {
      this.output(this.formatEntry('error', message, context));
    }
  }

  // For security events that should always be logged regardless of level
  security(event: string, context?: LogContext): void {
    this.output(this.formatEntry('warn', `[SECURITY] ${event}`, context));
  }
}

// Default logger instance
export const logger = new Logger();

// Factory for service-specific loggers
export function createLogger(service: string): Logger {
  return new Logger(service);
}

export { Logger };
