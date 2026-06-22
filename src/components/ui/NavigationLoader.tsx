'use client';

import React, { useState, useEffect } from 'react';
import { usePathname } from '@/navigation';

export default function NavigationLoader() {
  const pathname = usePathname();
  const [loading, setLoading] = useState(false);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    // When route changes, trigger transition progress bar
    setLoading(true);
    setWidth(25);
    
    const t1 = setTimeout(() => setWidth(65), 100);
    const t2 = setTimeout(() => setWidth(90), 250);
    const t3 = setTimeout(() => {
      setWidth(100);
      setTimeout(() => {
        setLoading(false);
        setWidth(0);
      }, 150);
    }, 450);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [pathname]);

  if (!loading) return null;

  return (
    <div className="fixed top-0 inset-x-0 z-[10000] pointer-events-none select-none">
      <div
        className="h-[2px] bg-gradient-to-r from-[#7c3aed] to-[#ec4899] transition-all duration-300 ease-out shadow-[0_0_8px_rgba(124,58,237,0.8)]"
        style={{ width: `${width}%` }}
      />
    </div>
  );
}
