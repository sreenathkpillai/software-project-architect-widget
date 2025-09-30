// Performance monitoring utilities

export interface PerformanceMetric {
  name: string;
  value: number;
  unit: 'ms' | 'bytes' | 'count' | 'percent';
  timestamp: number;
  context?: Record<string, any>;
}

export interface APICallMetric {
  endpoint: string;
  method: string;
  duration: number;
  status: number;
  timestamp: number;
  size?: number;
}

export class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private apiCalls: APICallMetric[] = [];
  private observers: PerformanceObserver[] = [];

  constructor() {
    if (typeof window !== 'undefined') {
      this.initializeBrowserMonitoring();
    }
  }

  private initializeBrowserMonitoring() {
    // Observe Core Web Vitals
    this.observeWebVitals();

    // Observe resource loading
    this.observeResourceTiming();

    // Observe navigation timing
    this.observeNavigationTiming();
  }

  private observeWebVitals() {
    try {
      // Largest Contentful Paint (LCP)
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1] as any;

        this.recordMetric({
          name: 'LCP',
          value: lastEntry.startTime,
          unit: 'ms',
          timestamp: Date.now(),
          context: { elementType: lastEntry.element?.tagName },
        });
      });
      lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
      this.observers.push(lcpObserver);

      // First Input Delay (FID)
      const fidObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry: any) => {
          this.recordMetric({
            name: 'FID',
            value: entry.processingStart - entry.startTime,
            unit: 'ms',
            timestamp: Date.now(),
            context: { eventType: entry.name },
          });
        });
      });
      fidObserver.observe({ type: 'first-input', buffered: true });
      this.observers.push(fidObserver);

      // Cumulative Layout Shift (CLS)
      let clsValue = 0;
      const clsObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry: any) => {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
          }
        });

        this.recordMetric({
          name: 'CLS',
          value: clsValue,
          unit: 'percent',
          timestamp: Date.now(),
        });
      });
      clsObserver.observe({ type: 'layout-shift', buffered: true });
      this.observers.push(clsObserver);

    } catch (error) {
      console.warn('Performance monitoring not supported:', error);
    }
  }

  private observeResourceTiming() {
    try {
      const resourceObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry: any) => {
          // Track slow resources
          if (entry.duration > 1000) {
            this.recordMetric({
              name: 'slow_resource',
              value: entry.duration,
              unit: 'ms',
              timestamp: Date.now(),
              context: {
                url: entry.name,
                type: entry.initiatorType,
                size: entry.transferSize,
              },
            });
          }
        });
      });
      resourceObserver.observe({ type: 'resource', buffered: true });
      this.observers.push(resourceObserver);
    } catch (error) {
      console.warn('Resource timing monitoring not supported:', error);
    }
  }

  private observeNavigationTiming() {
    try {
      const navigationObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry: any) => {
          this.recordMetric({
            name: 'navigation_timing',
            value: entry.loadEventEnd - entry.navigationStart,
            unit: 'ms',
            timestamp: Date.now(),
            context: {
              domContentLoaded: entry.domContentLoadedEventEnd - entry.navigationStart,
              firstPaint: entry.firstPaint,
              type: entry.type,
            },
          });
        });
      });
      navigationObserver.observe({ type: 'navigation', buffered: true });
      this.observers.push(navigationObserver);
    } catch (error) {
      console.warn('Navigation timing monitoring not supported:', error);
    }
  }

  // Record custom metric
  recordMetric(metric: Omit<PerformanceMetric, 'timestamp'> & { timestamp?: number }) {
    const fullMetric: PerformanceMetric = {
      ...metric,
      timestamp: metric.timestamp || Date.now(),
    };

    this.metrics.push(fullMetric);

    // Keep only last 1000 metrics to prevent memory issues
    if (this.metrics.length > 1000) {
      this.metrics = this.metrics.slice(-1000);
    }

    // Log performance issues
    this.analyzeMetric(fullMetric);
  }

  // Record API call performance
  recordAPICall(call: Omit<APICallMetric, 'timestamp'> & { timestamp?: number }) {
    const fullCall: APICallMetric = {
      ...call,
      timestamp: call.timestamp || Date.now(),
    };

    this.apiCalls.push(fullCall);

    // Keep only last 500 API calls
    if (this.apiCalls.length > 500) {
      this.apiCalls = this.apiCalls.slice(-500);
    }

    // Log slow API calls
    if (fullCall.duration > 2000) {
      console.warn('Slow API call detected:', fullCall);
    }
  }

  // Analyze metric for performance issues
  private analyzeMetric(metric: PerformanceMetric) {
    const thresholds = {
      LCP: 2500, // Good LCP is < 2.5s
      FID: 100,  // Good FID is < 100ms
      CLS: 0.1,  // Good CLS is < 0.1
    };

    if (metric.name in thresholds) {
      const threshold = thresholds[metric.name as keyof typeof thresholds];
      if (metric.value > threshold) {
        console.warn(`Poor ${metric.name} detected:`, metric.value, metric.unit);
      }
    }
  }

  // Get performance summary
  getPerformanceSummary(): {
    webVitals: Record<string, PerformanceMetric>;
    slowResources: PerformanceMetric[];
    slowAPIs: APICallMetric[];
    averageAPITime: number;
  } {
    const webVitals: Record<string, PerformanceMetric> = {};
    const slowResources: PerformanceMetric[] = [];

    // Get latest web vitals
    ['LCP', 'FID', 'CLS'].forEach(vital => {
      const metrics = this.metrics.filter(m => m.name === vital);
      if (metrics.length > 0) {
        webVitals[vital] = metrics[metrics.length - 1];
      }
    });

    // Get slow resources
    this.metrics
      .filter(m => m.name === 'slow_resource')
      .forEach(m => slowResources.push(m));

    // Get slow API calls
    const slowAPIs = this.apiCalls.filter(call => call.duration > 1000);

    // Calculate average API time
    const totalAPITime = this.apiCalls.reduce((sum, call) => sum + call.duration, 0);
    const averageAPITime = this.apiCalls.length > 0 ? totalAPITime / this.apiCalls.length : 0;

    return {
      webVitals,
      slowResources,
      slowAPIs,
      averageAPITime,
    };
  }

  // Memory usage (Node.js/browser)
  getMemoryUsage(): Record<string, number> {
    if (typeof window !== 'undefined' && (performance as any).memory) {
      const memory = (performance as any).memory;
      return {
        used: memory.usedJSHeapSize,
        total: memory.totalJSHeapSize,
        limit: memory.jsHeapSizeLimit,
      };
    }

    if (typeof process !== 'undefined' && process.memoryUsage) {
      return process.memoryUsage();
    }

    return {};
  }

  // Clean up observers
  destroy() {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
    this.metrics = [];
    this.apiCalls = [];
  }
}

// Performance timing utility
export class PerformanceTimer {
  private startTime: number;
  private name: string;

  constructor(name: string) {
    this.name = name;
    this.startTime = performance.now();
  }

  end(context?: Record<string, any>): number {
    const duration = performance.now() - this.startTime;

    // Log slow operations
    if (duration > 100) {
      console.warn(`Slow operation detected: ${this.name} took ${duration.toFixed(2)}ms`, context);
    }

    return duration;
  }
}

// Decorator for timing functions
export function timed(name?: string) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    const timerName = name || `${target.constructor.name}.${propertyKey}`;

    descriptor.value = function (...args: any[]) {
      const timer = new PerformanceTimer(timerName);

      try {
        const result = originalMethod.apply(this, args);

        if (result && typeof result.then === 'function') {
          // Handle promises
          return result.finally(() => timer.end());
        } else {
          timer.end();
          return result;
        }
      } catch (error) {
        timer.end({ error: error.message });
        throw error;
      }
    };

    return descriptor;
  };
}

// React hook for component performance monitoring
export function usePerformanceMonitor(componentName: string) {
  const renderStart = React.useRef<number>();
  const mountTime = React.useRef<number>();

  React.useEffect(() => {
    mountTime.current = performance.now();

    return () => {
      if (mountTime.current) {
        const lifetime = performance.now() - mountTime.current;
        performanceMonitor.recordMetric({
          name: 'component_lifetime',
          value: lifetime,
          unit: 'ms',
          context: { component: componentName },
        });
      }
    };
  }, [componentName]);

  React.useLayoutEffect(() => {
    if (renderStart.current) {
      const renderTime = performance.now() - renderStart.current;
      performanceMonitor.recordMetric({
        name: 'render_time',
        value: renderTime,
        unit: 'ms',
        context: { component: componentName },
      });
    }
  });

  React.useLayoutEffect(() => {
    renderStart.current = performance.now();
  });

  return {
    recordMetric: (name: string, value: number, unit: PerformanceMetric['unit'] = 'ms') => {
      performanceMonitor.recordMetric({
        name: `${componentName}.${name}`,
        value,
        unit,
        context: { component: componentName },
      });
    },
  };
}

// Global performance monitor instance
export const performanceMonitor = new PerformanceMonitor();

// API call wrapper with performance monitoring
export async function monitoredFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const timer = new PerformanceTimer(`API: ${options.method || 'GET'} ${url}`);
  const startTime = performance.now();

  try {
    const response = await fetch(url, options);
    const duration = timer.end();

    performanceMonitor.recordAPICall({
      endpoint: url,
      method: options.method || 'GET',
      duration,
      status: response.status,
      size: parseInt(response.headers.get('content-length') || '0'),
    });

    return response;
  } catch (error) {
    const duration = performance.now() - startTime;

    performanceMonitor.recordAPICall({
      endpoint: url,
      method: options.method || 'GET',
      duration,
      status: 0, // Network error
    });

    throw error;
  }
}

// Type for React import
declare const React: typeof import('react');