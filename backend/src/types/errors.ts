/**
 * Error Type Definitions
 *
 * Foundational error handling infrastructure for the backend.
 * All error types extend AppError base class for consistent error propagation.
 */

/**
 * Base error class for all application errors.
 * Extends Error with additional context and metadata.
 */
export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly context: Record<string, unknown>;
  public readonly timestamp: Date;

  constructor(
    message: string,
    code: string,
    statusCode: number = 500,
    isOperational: boolean = true,
    context: Record<string, unknown> = {}
  ) {
    super(message);

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }

    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.context = context;
    this.timestamp = new Date();

    // Set the prototype explicitly to maintain instanceof checks
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Database Error Codes
 */
export enum DatabaseErrorCode {
  CONNECTION_FAILED = 'DB_CONNECTION_FAILED',
  QUERY_FAILED = 'DB_QUERY_FAILED',
  NOT_FOUND = 'DB_NOT_FOUND',
  CONSTRAINT_VIOLATION = 'DB_CONSTRAINT_VIOLATION',
  TRANSACTION_FAILED = 'DB_TRANSACTION_FAILED',
  DUPLICATE_ENTRY = 'DB_DUPLICATE_ENTRY',
}

/**
 * Database-related errors.
 * All database operations should throw DatabaseError on failure.
 */
export class DatabaseError extends AppError {
  constructor(
    code: DatabaseErrorCode,
    message: string,
    context: Record<string, unknown> = {}
  ) {
    super(message, code, 500, true, context);
  }
}

/**
 * Authentication Error Codes
 */
export enum AuthErrorCode {
  INVALID_SIGNATURE = 'AUTH_INVALID_SIGNATURE',
  SIGNATURE_EXPIRED = 'AUTH_SIGNATURE_EXPIRED',
  SIGNATURE_REPLAY = 'AUTH_SIGNATURE_REPLAY',
  UNAUTHORIZED = 'AUTH_UNAUTHORIZED',
  INVALID_SESSION = 'AUTH_INVALID_SESSION',
  SESSION_EXPIRED = 'AUTH_SESSION_EXPIRED',
  MISSING_CREDENTIALS = 'AUTH_MISSING_CREDENTIALS',
}

/**
 * Authentication and authorization errors.
 * Used for wallet signature validation, session key verification, etc.
 */
export class AuthError extends AppError {
  constructor(
    code: AuthErrorCode,
    message: string,
    context: Record<string, unknown> = {}
  ) {
    // Use 401 for authentication failures, 403 for authorization failures
    const statusCode = code === AuthErrorCode.UNAUTHORIZED ? 403 : 401;
    super(message, code, statusCode, true, context);
  }
}

/**
 * Balance Error Codes
 */
export enum BalanceErrorCode {
  INSUFFICIENT_BALANCE = 'BAL_INSUFFICIENT_BALANCE',
  BALANCE_LOCKED = 'BAL_BALANCE_LOCKED',
  INVALID_AMOUNT = 'BAL_INVALID_AMOUNT',
  TRANSFER_FAILED = 'BAL_TRANSFER_FAILED',
  WITHDRAWAL_FAILED = 'BAL_WITHDRAWAL_FAILED',
  DEPOSIT_FAILED = 'BAL_DEPOSIT_FAILED',
}

/**
 * Balance and funds management errors.
 * Used for PDA balance verification, escrow operations, etc.
 */
export class BalanceError extends AppError {
  constructor(
    code: BalanceErrorCode,
    message: string,
    context: Record<string, unknown> = {}
  ) {
    // Use 400 for client errors, 402 for payment required
    const statusCode = code === BalanceErrorCode.INSUFFICIENT_BALANCE ? 402 : 400;
    super(message, code, statusCode, true, context);
  }
}

/**
 * Validation Error Codes
 */
export enum ValidationErrorCode {
  INVALID_WALLET = 'VAL_INVALID_WALLET',
  INVALID_AMOUNT = 'VAL_INVALID_AMOUNT',
  MISSING_FIELD = 'VAL_MISSING_FIELD',
  INVALID_FORMAT = 'VAL_INVALID_FORMAT',
  OUT_OF_RANGE = 'VAL_OUT_OF_RANGE',
  INVALID_INPUT = 'VAL_INVALID_INPUT',
}

/**
 * Input validation errors.
 * Used for request validation, parameter checking, etc.
 */
export class ValidationError extends AppError {
  constructor(
    code: ValidationErrorCode,
    message: string,
    context: Record<string, unknown> = {}
  ) {
    super(message, code, 400, true, context);
  }
}

/**
 * Service Error Codes
 */
export enum ServiceErrorCode {
  SERVICE_UNAVAILABLE = 'SVC_SERVICE_UNAVAILABLE',
  EXTERNAL_API_FAILED = 'SVC_EXTERNAL_API_FAILED',
  TIMEOUT = 'SVC_TIMEOUT',
  INTERNAL_ERROR = 'SVC_INTERNAL_ERROR',
  CONFIGURATION_ERROR = 'SVC_CONFIGURATION_ERROR',
  RATE_LIMIT_EXCEEDED = 'SVC_RATE_LIMIT_EXCEEDED',
}

/**
 * Service and external dependency errors.
 * Used for external API failures, service unavailability, etc.
 */
export class ServiceError extends AppError {
  constructor(
    code: ServiceErrorCode,
    message: string,
    context: Record<string, unknown> = {}
  ) {
    // Use 503 for service unavailable, 500 for internal errors
    const statusCode =
      code === ServiceErrorCode.SERVICE_UNAVAILABLE ||
      code === ServiceErrorCode.TIMEOUT
        ? 503
        : code === ServiceErrorCode.RATE_LIMIT_EXCEEDED
        ? 429
        : 500;
    super(message, code, statusCode, true, context);
  }
}
