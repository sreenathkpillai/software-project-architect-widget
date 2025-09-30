import { z } from 'zod';

export class WorkflowError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly context?: Record<string, any>;

  constructor(
    code: string,
    message: string,
    statusCode: number = 500,
    context?: Record<string, any>
  ) {
    super(message);
    this.name = 'WorkflowError';
    this.code = code;
    this.statusCode = statusCode;
    this.context = context;
  }
}

export class ValidationError extends WorkflowError {
  public readonly fieldErrors: z.ZodError['errors'];

  constructor(zodError: z.ZodError, context?: Record<string, any>) {
    const message = zodError.errors.map(err => `${err.path.join('.')}: ${err.message}`).join(', ');
    super('VALIDATION_ERROR', `Validation failed: ${message}`, 400, context);
    this.fieldErrors = zodError.errors;
  }
}

export class AuthenticationError extends WorkflowError {
  constructor(message: string = 'Authentication required', context?: Record<string, any>) {
    super('AUTHENTICATION_ERROR', message, 401, context);
  }
}

export class AuthorizationError extends WorkflowError {
  constructor(message: string = 'Insufficient permissions', context?: Record<string, any>) {
    super('AUTHORIZATION_ERROR', message, 403, context);
  }
}

export class NotFoundError extends WorkflowError {
  constructor(resource: string, id?: string, context?: Record<string, any>) {
    const message = id ? `${resource} with id '${id}' not found` : `${resource} not found`;
    super('NOT_FOUND_ERROR', message, 404, context);
  }
}

export class ConflictError extends WorkflowError {
  constructor(message: string, context?: Record<string, any>) {
    super('CONFLICT_ERROR', message, 409, context);
  }
}

export class RateLimitError extends WorkflowError {
  constructor(message: string = 'Rate limit exceeded', context?: Record<string, any>) {
    super('RATE_LIMIT_ERROR', message, 429, context);
  }
}

export class ExternalServiceError extends WorkflowError {
  public readonly service: string;
  public readonly originalError?: Error;

  constructor(
    service: string,
    message: string,
    originalError?: Error,
    context?: Record<string, any>
  ) {
    super('EXTERNAL_SERVICE_ERROR', `${service}: ${message}`, 502, context);
    this.service = service;
    this.originalError = originalError;
  }
}

export class DatabaseError extends WorkflowError {
  constructor(message: string, originalError?: Error, context?: Record<string, any>) {
    super('DATABASE_ERROR', message, 500, context);
  }
}

// Error handler for API routes
export function handleApiError(error: unknown): {
  error: string;
  code?: string;
  details?: any;
  statusCode: number;
} {
  console.error('API Error:', error);

  if (error instanceof ValidationError) {
    return {
      error: error.message,
      code: error.code,
      details: error.fieldErrors,
      statusCode: error.statusCode,
    };
  }

  if (error instanceof WorkflowError) {
    return {
      error: error.message,
      code: error.code,
      details: error.context,
      statusCode: error.statusCode,
    };
  }

  if (error instanceof z.ZodError) {
    const validationError = new ValidationError(error);
    return {
      error: validationError.message,
      code: validationError.code,
      details: validationError.fieldErrors,
      statusCode: validationError.statusCode,
    };
  }

  // Database-specific errors
  if (error && typeof error === 'object' && 'code' in error) {
    const dbError = error as any;

    // Prisma/PostgreSQL error codes
    switch (dbError.code) {
      case 'P2002':
        return {
          error: 'A record with this information already exists',
          code: 'UNIQUE_CONSTRAINT_VIOLATION',
          statusCode: 409,
        };
      case 'P2025':
        return {
          error: 'Record not found',
          code: 'RECORD_NOT_FOUND',
          statusCode: 404,
        };
      case 'P2003':
        return {
          error: 'Foreign key constraint failed',
          code: 'FOREIGN_KEY_CONSTRAINT',
          statusCode: 400,
        };
      case 'P2021':
        return {
          error: 'Table does not exist',
          code: 'TABLE_NOT_FOUND',
          statusCode: 500,
        };
    }
  }

  // Generic error fallback
  const message = error instanceof Error ? error.message : 'Internal server error';
  return {
    error: message,
    code: 'INTERNAL_SERVER_ERROR',
    statusCode: 500,
  };
}

// Async wrapper for API route handlers
export function withErrorHandling<T extends any[], R>(
  handler: (...args: T) => Promise<R>
) {
  return async (...args: T): Promise<R> => {
    try {
      return await handler(...args);
    } catch (error) {
      const errorResponse = handleApiError(error);
      throw new Response(JSON.stringify(errorResponse), {
        status: errorResponse.statusCode,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  };
}

// Validation helpers
export function validateExternalId(externalId: string | null): string {
  if (!externalId) {
    throw new AuthenticationError('External ID is required');
  }

  if (externalId.length < 3) {
    throw new ValidationError(
      z.ZodError.create([
        {
          code: 'too_small',
          minimum: 3,
          type: 'string',
          inclusive: true,
          message: 'External ID must be at least 3 characters',
          path: ['externalId'],
        },
      ])
    );
  }

  return externalId;
}

export function validateResourceId(id: string, resourceName: string): string {
  if (!id) {
    throw new ValidationError(
      z.ZodError.create([
        {
          code: 'invalid_type',
          expected: 'string',
          received: 'undefined',
          message: `${resourceName} ID is required`,
          path: ['id'],
        },
      ])
    );
  }

  // Basic CUID validation
  if (!/^[a-z0-9]{25}$/.test(id)) {
    throw new ValidationError(
      z.ZodError.create([
        {
          code: 'invalid_string',
          validation: 'regex',
          message: `Invalid ${resourceName} ID format`,
          path: ['id'],
        },
      ])
    );
  }

  return id;
}

// Retry utility for external service calls
export async function withRetry<T>(
  operation: () => Promise<T>,
  options: {
    maxAttempts?: number;
    delay?: number;
    backoff?: boolean;
    shouldRetry?: (error: any) => boolean;
  } = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    delay = 1000,
    backoff = true,
    shouldRetry = (error) => {
      // Retry on network errors and 5xx status codes
      return (
        error.code === 'ECONNRESET' ||
        error.code === 'ENOTFOUND' ||
        error.code === 'ECONNREFUSED' ||
        (error.response?.status >= 500 && error.response?.status < 600)
      );
    },
  } = options;

  let lastError: any;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      if (attempt === maxAttempts || !shouldRetry(error)) {
        throw error;
      }

      const waitTime = backoff ? delay * Math.pow(2, attempt - 1) : delay;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }

  throw lastError;
}

// Rate limiting utility
export class RateLimiter {
  private attempts: Map<string, number[]> = new Map();

  constructor(
    private maxAttempts: number = 100,
    private windowMs: number = 60000 // 1 minute
  ) {}

  check(identifier: string): boolean {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    // Get existing attempts
    const userAttempts = this.attempts.get(identifier) || [];

    // Filter out old attempts
    const recentAttempts = userAttempts.filter(time => time > windowStart);

    // Check if limit exceeded
    if (recentAttempts.length >= this.maxAttempts) {
      return false;
    }

    // Add current attempt
    recentAttempts.push(now);
    this.attempts.set(identifier, recentAttempts);

    return true;
  }

  reset(identifier: string): void {
    this.attempts.delete(identifier);
  }

  cleanup(): void {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    for (const [key, attempts] of this.attempts.entries()) {
      const recentAttempts = attempts.filter(time => time > windowStart);
      if (recentAttempts.length === 0) {
        this.attempts.delete(key);
      } else {
        this.attempts.set(key, recentAttempts);
      }
    }
  }
}

// Global rate limiter instance
export const globalRateLimiter = new RateLimiter();

// Cleanup rate limiter every 5 minutes
if (typeof window === 'undefined') {
  setInterval(() => {
    globalRateLimiter.cleanup();
  }, 5 * 60 * 1000);
}