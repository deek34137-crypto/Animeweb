'use client';

import { useEffect, useState } from 'react';

/**
 * Returns true when the user has requested reduced motion via
 * the OS or browser "prefers-reduced-motion: reduce" setting.
 * Subscribes to changes so the value stays current if the user
 * toggles the setting while the page is open.
 */
export function useReducedMotion(): boolean {
  const [reducedMotion, setReducedMotion] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const listener = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mediaQuery.addEventListener('change', listener);
    return () => mediaQuery.removeEventListener('change', listener);
  }, []);

  return reducedMotion;
}
