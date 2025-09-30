'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorId?: string;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorId: Date.now().toString(36),
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    // Log error to external service (in production)
    if (process.env.NODE_ENV === 'production') {
      this.logErrorToService(error, errorInfo);
    }

    // Call custom error handler
    this.props.onError?.(error, errorInfo);
  }

  private async logErrorToService(error: Error, errorInfo: ErrorInfo) {
    try {
      // In a real app, send to error tracking service like Sentry
      const errorData = {
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href,
      };

      // Example: await sendToErrorTrackingService(errorData);
      console.log('Error logged:', errorData);
    } catch (loggingError) {
      console.error('Failed to log error:', loggingError);
    }
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorId: undefined });
  };

  private handleReportBug = () => {
    const { error, errorId } = this.state;

    const bugReport = {
      errorId,
      message: error?.message,
      stack: error?.stack,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent,
    };

    // Copy to clipboard
    navigator.clipboard.writeText(JSON.stringify(bugReport, null, 2));

    // Could also open a bug report form
    alert('Error details copied to clipboard. Please paste into a bug report.');
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className="min-h-[400px] flex items-center justify-center p-6">
          <div className="text-center max-w-md">
            <div className="mx-auto w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-4">
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>

            <h2 className="text-xl font-semibold text-widget-text-primary mb-2">
              Something went wrong
            </h2>

            <p className="text-widget-text-secondary mb-6">
              We encountered an unexpected error. Please try again or report the issue if it persists.
            </p>

            {/* Error details (development only) */}
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mb-6 text-left">
                <summary className="cursor-pointer text-sm text-widget-text-secondary hover:text-widget-text-primary">
                  Error Details
                </summary>
                <div className="mt-2 p-3 bg-widget-bg rounded-lg text-xs font-mono text-red-400 overflow-auto max-h-32">
                  <div className="mb-2 font-bold">Error: {this.state.error.message}</div>
                  <div className="whitespace-pre-wrap">{this.state.error.stack}</div>
                </div>
              </details>
            )}

            <div className="flex gap-3 justify-center">
              <button
                onClick={this.handleRetry}
                className="flex items-center gap-2 px-4 py-2 bg-widget-accent-start text-white rounded-lg hover:bg-widget-accent-end transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Try Again
              </button>

              <button
                onClick={() => window.location.href = '/widget'}
                className="flex items-center gap-2 px-4 py-2 bg-widget-surface text-widget-text-primary rounded-lg hover:bg-widget-border transition-colors"
              >
                <Home className="w-4 h-4" />
                Go Home
              </button>

              <button
                onClick={this.handleReportBug}
                className="flex items-center gap-2 px-4 py-2 bg-widget-surface text-widget-text-secondary rounded-lg hover:bg-widget-border transition-colors"
              >
                <Bug className="w-4 h-4" />
                Report Bug
              </button>
            </div>

            {this.state.errorId && (
              <p className="text-xs text-widget-text-secondary mt-4">
                Error ID: {this.state.errorId}
              </p>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Higher-order component for wrapping components with error boundary
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  return WrappedComponent;
}

// Hook for error reporting from components
export function useErrorReporting() {
  const reportError = React.useCallback((error: Error, context?: Record<string, any>) => {
    console.error('Manual error report:', error, context);

    // In production, send to error tracking service
    if (process.env.NODE_ENV === 'production') {
      // Example: errorTrackingService.captureException(error, { extra: context });
    }
  }, []);

  return { reportError };
}

// Async error boundary hook for handling promise rejections
export function useAsyncError() {
  const [, setError] = React.useState();

  return React.useCallback((error: Error) => {
    setError(() => {
      throw error;
    });
  }, []);
}