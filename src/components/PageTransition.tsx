'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { usePathname } from '@/navigation';
import { Motion } from '@/config/motion';

export default function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    
    const timer = setTimeout(() => {
      setReduceMotion(mediaQuery.matches);
    }, 0);

    const listener = (e: MediaQueryListEvent) => {
      setReduceMotion(e.matches);
    };

    mediaQuery.addEventListener('change', listener);
    return () => {
      clearTimeout(timer);
      mediaQuery.removeEventListener('change', listener);
    };
  }, []);

  return (
    <motion.div
      key={pathname}
      initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: 8 }}
      animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
      transition={{
        duration: reduceMotion ? Motion.duration.instant : Motion.duration.normal,
        ease: Motion.easing.out,
      }}
      className="w-full h-full"
    >
      {children}
    </motion.div>
  );
}
