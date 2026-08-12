'use client';

import React from 'react';
import { useRouter } from '@/navigation';
import { ShieldAlert, LogOut } from 'lucide-react';

export default function AgeVerificationBanner() {
  const router = useRouter();

  const handleExit = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('hentai_age_verified');
    }
    router.push('/');
  };

  return (
    <div className="w-full bg-red-950/80 border-b border-red-500/30 backdrop-blur-sm py-2 px-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-red-200">
          <ShieldAlert size={14} className="text-red-400 flex-shrink-0" />
          <span className="text-xs font-medium">
            <span className="font-bold text-red-300">🔞 Adults Only Section</span>
            {' — '}You confirmed you are 18 or older. All links open on external third-party sites.
          </span>
        </div>
        <button
          onClick={handleExit}
          className="flex items-center gap-1.5 text-xs font-semibold text-red-300 hover:text-white bg-red-500/20 hover:bg-red-500/40 border border-red-500/30 rounded-lg px-3 py-1.5 transition-all duration-200 flex-shrink-0"
        >
          <LogOut size={12} />
          Exit Section
        </button>
      </div>
    </div>
  );
}
