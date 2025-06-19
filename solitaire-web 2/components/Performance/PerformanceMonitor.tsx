'use client';

import { useEffect } from 'react';

interface PerformanceMetrics {
  lcp?: number;
  fid?: number;
  cls?: number;
  ttfb?: number;
}

export function PerformanceMonitor() {
  useEffect(() => {
    const metrics: PerformanceMetrics = {};

    // Largest Contentful Paint (LCP)
    if ('PerformanceObserver' in window) {
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        metrics.lcp = lastEntry.startTime;
        
        // Log LCP if it's over our target (2000ms)
        if (metrics.lcp > 2000) {
          console.warn(`LCP is ${metrics.lcp}ms - target is <2000ms`);
        }
      });

      try {
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
      } catch (e) {
        // LCP not supported
      }

      // First Input Delay (FID)
      const fidObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry: any) => {
          metrics.fid = entry.processingStart - entry.startTime;
          
          // Log FID if it's over our target (100ms)
          if (metrics.fid > 100) {
            console.warn(`FID is ${metrics.fid}ms - target is <100ms`);
          }
        });
      });

      try {
        fidObserver.observe({ entryTypes: ['first-input'] });
      } catch (e) {
        // FID not supported
      }

      // Cumulative Layout Shift (CLS)
      const clsObserver = new PerformanceObserver((list) => {
        let clsValue = 0;
        const entries = list.getEntries();
        
        entries.forEach((entry: any) => {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
          }
        });
        
        metrics.cls = clsValue;
        
        // Log CLS if it's over our target (0.1)
        if (metrics.cls > 0.1) {
          console.warn(`CLS is ${metrics.cls} - target is <0.1`);
        }
      });

      try {
        clsObserver.observe({ entryTypes: ['layout-shift'] });
      } catch (e) {
        // CLS not supported
      }

      // Time to First Byte (TTFB)
      const navigationEntries = performance.getEntriesByType('navigation');
      if (navigationEntries.length > 0) {
        const navEntry = navigationEntries[0] as PerformanceNavigationTiming;
        metrics.ttfb = navEntry.responseStart - navEntry.requestStart;
        
        // Log TTFB if it's over our target (800ms)
        if (metrics.ttfb > 800) {
          console.warn(`TTFB is ${metrics.ttfb}ms - target is <800ms`);
        }
      }

      // Log all metrics after page load
      const logMetrics = () => {
        if (process.env.NODE_ENV === 'development') {
          console.log('Performance Metrics:', metrics);
        }
        
        // Send to analytics in production
        if (process.env.NODE_ENV === 'production' && window.gtag) {
          window.gtag('event', 'web_vitals', {
            lcp: metrics.lcp,
            fid: metrics.fid,
            cls: metrics.cls,
            ttfb: metrics.ttfb,
          });
        }
      };

      // Log metrics after a delay to allow all measurements
      setTimeout(logMetrics, 5000);

      return () => {
        lcpObserver.disconnect();
        fidObserver.disconnect();
        clsObserver.disconnect();
      };
    }
  }, []);

  return null;
}

// Type declaration for gtag
declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
  }
}
