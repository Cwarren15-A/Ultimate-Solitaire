/**
 * Accessibility and UX utility hooks
 */

import { useState, useEffect, useCallback } from 'react';

/**
 * Hook to handle responsive zoom/scaling for small screens
 * Uses ResizeObserver to detect screen size changes
 */
export function useZoom() {
  const [scale, setScale] = useState(1);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  const updateScale = useCallback((width: number, height: number) => {
    // Minimum game board size requirements
    const MIN_WIDTH = 800;
    const MIN_HEIGHT = 600;
    
    // Calculate scale factor to fit content
    const scaleX = width / MIN_WIDTH;
    const scaleY = height / MIN_HEIGHT;
    const newScale = Math.min(scaleX, scaleY, 1); // Never scale up, only down
    
    setScale(Math.max(0.6, newScale)); // Minimum scale of 0.6
    setDimensions({ width, height });
  }, []);

  useEffect(() => {
    const updateDimensions = () => {
      updateScale(window.innerWidth, window.innerHeight);
    };

    // Initial measurement
    updateDimensions();

    // Listen for resize events
    window.addEventListener('resize', updateDimensions);
    
    // Use ResizeObserver if available for more accurate measurements
    let resizeObserver: ResizeObserver | null = null;
    
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver((entries) => {
        const entry = entries[0];
        if (entry) {
          const { width, height } = entry.contentRect;
          updateScale(width, height);
        }
      });
      
      // Observe the document body
      resizeObserver.observe(document.body);
    }

    return () => {
      window.removeEventListener('resize', updateDimensions);
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
    };
  }, [updateScale]);

  return { scale, dimensions };
}

/**
 * Hook to detect if user prefers reduced motion
 * Returns true if user has motion-safe preference
 */
export function useReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handler = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches);
    };

    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  return prefersReducedMotion;
}

/**
 * Hook for keyboard navigation support
 * Provides common keyboard shortcuts for solitaire games
 */
export function useKeyboardShortcuts() {
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // Only handle shortcuts when not in an input field
    if (
      event.target instanceof HTMLInputElement ||
      event.target instanceof HTMLTextAreaElement
    ) {
      return;
    }

    switch (event.key) {
      case 'n':
      case 'N':
        if (event.ctrlKey || event.metaKey) {
          event.preventDefault();
          // New game - handled by parent component
          return 'new-game';
        }
        break;
      case 'z':
      case 'Z':
        if (event.ctrlKey || event.metaKey) {
          event.preventDefault();
          if (event.shiftKey) {
            return 'redo';
          } else {
            return 'undo';
          }
        }
        break;
      case 'h':
      case 'H':
        if (event.ctrlKey || event.metaKey) {
          event.preventDefault();
          return 'hint';
        }
        break;
      case 'Escape':
        return 'escape';
      case ' ':
      case 'Enter':
        if (event.target instanceof HTMLElement && event.target.role === 'button') {
          event.preventDefault();
          return 'activate';
        }
        break;
    }
    
    return null;
  }, []);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return { handleKeyDown };
}
