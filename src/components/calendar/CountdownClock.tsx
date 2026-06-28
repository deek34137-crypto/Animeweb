'use client';

import React, { useState, useEffect } from 'react';

interface CountdownClockProps {
  airingAt: string;
}

export default function CountdownClock({ airingAt }: CountdownClockProps) {
  const [timeLeft, setTimeLeft] = useState<string>('Calculating...');

  useEffect(() => {
    const target = new Date(airingAt).getTime();

    const updateTimer = () => {
      const now = Date.now();
      const diff = target - now;

      if (diff <= 0) {
        // If it's within 1 hour after airing, show active/live
        if (Math.abs(diff) < 60 * 60 * 1000) {
          setTimeLeft('Airing Live Now!');
        } else {
          // Format local time it aired
          const localTime = new Date(airingAt).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          });
          setTimeLeft(`Aired today at ${localTime}`);
        }
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      if (hours > 24) {
        const days = Math.floor(hours / 24);
        setTimeLeft(`in ${days}d ${hours % 24}h`);
      } else if (hours > 0) {
        setTimeLeft(`in ${hours}h ${minutes}m`);
      } else {
        setTimeLeft(`in ${minutes}m`);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [airingAt]);

  const targetDate = new Date(airingAt);
  const formattedLocalTime = targetDate.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs font-semibold text-accent-sakura">{timeLeft}</span>
      <span className="text-[10px] text-text-muted">Airs at {formattedLocalTime} local</span>
    </div>
  );
}
