'use client';

import { useReportWebVitals } from 'next/web-vitals';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useCallback } from 'react';

// Buffer metrics and flush as a single batch to avoid 5 separate HTTP requests per page load.
const FLUSH_DELAY_MS = 2500; // Wait 2.5 s to collect all metrics before sending
// Sample rate for vitals reporting (0‑1). Adjust via env var VITALS_SAMPLE_RATE.
const SAMPLE_RATE = Number(process.env.VITALS_SAMPLE_RATE) || 1.0;

export function WebVitals() {
  // Skip all reporting in development — no reason to spam Postgres locally
  if (process.env.NODE_ENV !== 'production') return null;
  // Apply sampling – skip reporting for a subset of page views
  if (Math.random() > SAMPLE_RATE) return null;

  return <WebVitalsInner pageLoadId={crypto.randomUUID()} />;
}

function WebVitalsInner({ pageLoadId }: { pageLoadId: string }) {
  const pathname = usePathname();
  const bufferRef = useRef<object[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flush = useCallback(() => {
    if (bufferRef.current.length === 0) return;
    const batchId = crypto.randomUUID();
    const payload = {
      batchId,
      pageLoadId,
      metrics: bufferRef.current.splice(0), // drain the buffer
    };
    // Ensure timer is cleared after flush to avoid duplicate sends
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    const body = JSON.stringify(payload);
    const url = '/api/vitals';
    if (navigator.sendBeacon) {
      navigator.sendBeacon(url, body);
    } else {
      fetch(url, {
        method: 'POST',
        body,
        keepalive: true,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }, [pageLoadId]);

  useReportWebVitals((metric) => {
    bufferRef.current.push({
      name: metric.name,
      value: metric.value,
      rating: metric.rating,
      delta: metric.delta,
      idStr: pageLoadId,
      path: pathname || '/',
    });

    // Reset the debounce timer on every new metric
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(flush, FLUSH_DELAY_MS);
  });

  // Flush whatever is left when the tab hides or the component unmounts
  useEffect(() => {
    const handleHide = () => {
      // Cancel any pending timer to avoid duplicate flushes
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      flush();
    };
    document.addEventListener('visibilitychange', handleHide);
    return () => {
      document.removeEventListener('visibilitychange', handleHide);
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      flush();
    };
  }, [flush]);

  return null;
}
