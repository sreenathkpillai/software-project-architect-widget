import { NextRequest, NextResponse } from 'next/server';
import { handleApiError, globalRateLimiter, RateLimitError } from './error-handling';
import { verifyExternalId } from './auth';

export interface ApiRouteHandler {
  (request: NextRequest, context?: any): Promise<NextResponse>;
}

// Middleware wrapper for API routes
export function withApiMiddleware(handler: ApiRouteHandler) {
  return async (request: NextRequest, context?: any): Promise<NextResponse> => {
    try {
      // Rate limiting
      const ip = request.ip || request.headers.get('x-forwarded-for') || 'unknown';
      if (!globalRateLimiter.check(ip)) {
        throw new RateLimitError();
      }

      // CORS headers
      const response = await handler(request, context);

      // Add security headers
      response.headers.set('X-Content-Type-Options', 'nosniff');
      response.headers.set('X-Frame-Options', 'DENY');
      response.headers.set('X-XSS-Protection', '1; mode=block');

      return response;
    } catch (error) {
      const errorResponse = handleApiError(error);
      return NextResponse.json(errorResponse, {
        status: errorResponse.statusCode,
        headers: {
          'Content-Type': 'application/json',
          'X-Content-Type-Options': 'nosniff',
          'X-Frame-Options': 'DENY',
          'X-XSS-Protection': '1; mode=block',
        },
      });
    }
  };
}

// Authentication middleware
export function withAuth(handler: ApiRouteHandler) {
  return withApiMiddleware(async (request: NextRequest, context?: any) => {
    const externalId = request.headers.get('x-external-id');

    if (!externalId) {
      return NextResponse.json(
        { error: 'External ID is required', code: 'AUTHENTICATION_ERROR' },
        { status: 401 }
      );
    }

    // Verify external ID
    const isValid = await verifyExternalId(externalId);
    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid external ID', code: 'AUTHENTICATION_ERROR' },
        { status: 401 }
      );
    }

    // Add external ID to request context
    (request as any).externalId = externalId;

    return handler(request, context);
  });
}

// Validation middleware
export function withValidation<T>(
  schema: any,
  handler: (request: NextRequest, validatedData: T, context?: any) => Promise<NextResponse>
) {
  return withApiMiddleware(async (request: NextRequest, context?: any) => {
    try {
      const body = await request.json().catch(() => ({}));
      const validatedData = schema.parse(body);

      return handler(request, validatedData, context);
    } catch (error) {
      throw error; // Let the outer middleware handle validation errors
    }
  });
}

// Logging middleware
export function withLogging(handler: ApiRouteHandler) {
  return async (request: NextRequest, context?: any): Promise<NextResponse> => {
    const start = Date.now();
    const method = request.method;
    const url = request.url;

    console.log(`[${method}] ${url} - Started`);

    try {
      const response = await handler(request, context);
      const duration = Date.now() - start;

      console.log(`[${method}] ${url} - ${response.status} (${duration}ms)`);

      return response;
    } catch (error) {
      const duration = Date.now() - start;
      console.error(`[${method}] ${url} - Error (${duration}ms):`, error);
      throw error;
    }
  };
}

// Combined middleware for authenticated routes
export function withAuthenticatedRoute(handler: ApiRouteHandler) {
  return withLogging(withAuth(handler));
}

// Combined middleware for public routes
export function withPublicRoute(handler: ApiRouteHandler) {
  return withLogging(withApiMiddleware(handler));
}

// Performance monitoring middleware
export function withPerformanceMonitoring(handler: ApiRouteHandler) {
  return async (request: NextRequest, context?: any): Promise<NextResponse> => {
    const start = performance.now();
    const method = request.method;
    const pathname = new URL(request.url).pathname;

    try {
      const response = await handler(request, context);
      const duration = performance.now() - start;

      // Record performance metric
      if (typeof window === 'undefined') {
        // Server-side performance logging
        console.log(`API Performance: ${method} ${pathname} - ${duration.toFixed(2)}ms`);
      }

      // Add performance headers
      response.headers.set('X-Response-Time', `${duration.toFixed(2)}ms`);

      return response;
    } catch (error) {
      const duration = performance.now() - start;
      console.error(`API Performance: ${method} ${pathname} - ${duration.toFixed(2)}ms (ERROR)`);
      throw error;
    }
  };
}

// Full-featured middleware stack
export function withFullMiddleware(handler: ApiRouteHandler) {
  return withPerformanceMonitoring(withAuthenticatedRoute(handler));
}