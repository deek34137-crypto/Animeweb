'use client';

import React, { useState, useEffect } from 'react';

export default function TopProgressBar() {
  const [loading, setLoading] = useState(false);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    let progressInterval: NodeJS.Timeout;

    const handleStart = () => {
      setLoading(true);
      setWidth(15);

      // Progressive simulation timing steps
      let currentWidth = 15;
      const startTime = Date.now();

      progressInterval = setInterval(() => {
        const elapsed = Date.now() - startTime;

        if (elapsed < 150) {
          // Fast step to 40%
          currentWidth = 15 + (elapsed / 150) * 25;
        } else if (elapsed < 300) {
          // Slower step to 70%
          currentWidth = 40 + ((elapsed - 150) / 150) * 30;
        } else if (elapsed < 1000) {
          // Very slow step to 85%
          currentWidth = 70 + ((elapsed - 300) / 700) * 15;
        } else {
          // Crawl towards 95%
          currentWidth = Math.min(95, currentWidth + 0.1);
        }

        setWidth(Math.round(currentWidth));
      }, 50);
    };

    const handleEnd = () => {
      if (progressInterval) clearInterval(progressInterval);
      
      setWidth(100);
      timer = setTimeout(() => {
        setLoading(false);
        setWidth(0);
      }, 250);
    };

    window.addEventListener('route-loading-start', handleStart);
    window.addEventListener('route-loading-end', handleEnd);

    return () => {
      window.removeEventListener('route-loading-start', handleStart);
      window.removeEventListener('route-loading-end', handleEnd);
      if (progressInterval) clearInterval(progressInterval);
      if (timer) clearTimeout(timer);
    };
  }, []);

  if (!loading) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[10000] pointer-events-none select-none">
      <div
        className="h-[3px] bg-gradient-to-r from-accent-violet to-accent-sakura transition-all duration-hover ease-feedback shadow-[0_0_8px_rgba(124,58,237,0.6)]"
        style={{ width: `${width}%` }}
      />
    </div>
  );
}
