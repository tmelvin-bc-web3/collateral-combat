/**
 * Error Utility Functions
 *
 * Factory functions, type guards, and utilities for consistent error handling.
 */

import {
  AppError,
  DatabaseError,
  DatabaseErrorCode,
  AuthError,
  AuthErrorCode,
  BalanceError,
  BalanceErrorCode,
  ValidationError,
  ValidationErrorCode,
  ServiceError,
  ServiceErrorCode,
} from '../types/errors';

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a DatabaseError with standardized format.
 */
export function createDatabaseError(
  code: DatabaseErrorCode,
  message: string,
  context?: Record<string, unknown>
): DatabaseError {
  return new DatabaseError(code, message, context);
}

/**
 * Create an AuthError with standardized format.
 */
export function createAuthError(
  code: AuthErrorCode,
  message: string,
  context?: Record<string, unknown>
): AuthError {
  return new AuthError(code, message, context);
}

/**
 * Create a BalanceError with standardized format.
 */
export function createBalanceError(
  code: BalanceErrorCode,
  message: string,
  context?: Record<string, unknown>
): BalanceError {
  return new BalanceError(code, message, context);
}

/**
 * Create a ValidationError with standardized format.
 */
export function createValidationError(
  code: ValidationErrorCode,
  message: string,
  context?: Record<string, unknown>
): ValidationError {
  return new ValidationError(code, message, context);
}

/**
 * Create a ServiceError with standardized format.
 */
export function createServiceError(
  code: ServiceErrorCode,
  message: string,
  context?: Record<string, unknown>
): ServiceError {
  return new ServiceError(code, message, context);
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Type guard to check if an error is an AppError.
 */
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

/**
 * Type guard to check if an error is a DatabaseError.
 */
export function isDatabaseError(error: unknown): error is DatabaseError {
  return error instanceof DatabaseError;
}

/**
 * Type guard to check if an error is an AuthError.
 */
export function isAuthError(error: unknown): error is AuthError {
  return error instanceof AuthError;
}

/**
 * Type guard to check if an error is a BalanceError.
 */
export function isBalanceError(error: unknown): error is BalanceError {
  return error instanceof BalanceError;
}

/**
 * Type guard to check if an error is a ValidationError.
 */
export function isValidationError(error: unknown): error is ValidationError {
  return error instanceof ValidationError;
}

/**
 * Type guard to check if an error is a ServiceError.
 */
export function isServiceError(error: unknown): error is ServiceError {
  return error instanceof ServiceError;
}

// ============================================================================
// Error Wrapping Utilities
// ============================================================================

/**
 * Wrap any error as a DatabaseError, preserving original error information.
 * Useful for converting unknown errors from database operations.
 */
export function wrapDatabaseError(
  error: unknown,
  operation: string
): DatabaseError {
  const originalMessage =
    error instanceof Error ? error.message : String(error);
  const originalStack = error instanceof Error ? error.stack : undefined;

  const wrappedError = new DatabaseError(
    DatabaseErrorCode.QUERY_FAILED,
    `Database operation failed: ${operation}`,
    {
      operation,
      originalMessage,
      originalStack,
      originalError: error,
    }
  );

  // Preserve original stack trace if available
  if (originalStack && Error.captureStackTrace) {
    wrappedError.stack = originalStack;
  }

  return wrappedError;
}

/**
 * Wrap any error as a ServiceError, preserving original error information.
 * Useful for converting unknown errors from external API calls.
 */
export function wrapServiceError(error: unknown, service: string): ServiceError {
  const originalMessage =
    error instanceof Error ? error.message : String(error);
  const originalStack = error instanceof Error ? error.stack : undefined;

  const wrappedError = new ServiceError(
    ServiceErrorCode.EXTERNAL_API_FAILED,
    `External service failed: ${service}`,
    {
      service,
      originalMessage,
      originalStack,
      originalError: error,
    }
  );

  // Preserve original stack trace if available
  if (originalStack && Error.captureStackTrace) {
    wrappedError.stack = originalStack;
  }

  return wrappedError;
}

/**
 * Convert any error to an API-safe response object.
 * Removes sensitive details and provides user-friendly messages.
 */
export function toApiError(error: unknown): {
  code: string;
  message: string;
  statusCode: number;
} {
  // Handle AppError instances
  if (isAppError(error)) {
    return {
      code: error.code,
      message: error.message,
      statusCode: error.statusCode,
    };
  }

  // Handle standard Error instances
  if (error instanceof Error) {
    return {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
      statusCode: 500,
    };
  }

  // Handle unknown error types
  return {
    code: 'UNKNOWN_ERROR',
    message: 'An unexpected error occurred',
    statusCode: 500,
  };
}

// ============================================================================
// Result Type for Gradual Migration
// ============================================================================

/**
 * Result type for operations that can fail.
 * Enables gradual migration from throw-based to result-based error handling.
 */
export type Result<T, E = AppError> =
  | { success: true; data: T }
  | { success: false; error: E };

/**
 * Create a successful Result.
 */
export function ok<T>(data: T): Result<T, never> {
  return { success: true, data };
}

/**
 * Create a failed Result.
 */
export function fail<E extends AppError>(error: E): Result<never, E> {
  return { success: false, error };
}

/**
 * Type guard to check if a Result is successful.
 */
export function isOk<T, E>(
  result: Result<T, E>
): result is { success: true; data: T } {
  return result.success === true;
}

/**
 * Type guard to check if a Result is a failure.
 */
export function isFail<T, E>(
  result: Result<T, E>
): result is { success: false; error: E } {
  return result.success === false;
}

/**
 * Unwrap a Result, throwing the error if it failed.
 * Use this when you want to convert Result-based code back to throw-based.
 */
export function unwrap<T, E>(result: Result<T, E>): T {
  if (isOk(result)) {
    return result.data;
  }
  throw result.error;
}

/**
 * Unwrap a Result, returning a default value if it failed.
 */
export function unwrapOr<T, E>(result: Result<T, E>, defaultValue: T): T {
  if (isOk(result)) {
    return result.data;
  }
  return defaultValue;
}
