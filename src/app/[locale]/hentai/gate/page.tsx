'use client';

import React, { useState } from 'react';
import { useRouter } from '@/navigation';
import { ShieldAlert, Tv, AlertTriangle } from 'lucide-react';

export default function HentaiGatePage() {
  const router = useRouter();
  const [confirmed, setConfirmed] = useState(false);

  React.useEffect(() => {
    if (typeof window !== 'undefined' && localStorage.getItem('hentai_age_verified') === 'true') {
      router.replace('/hentai');
    }
  }, [router]);

  const handleEnter = () => {
    setConfirmed(true);
    if (typeof window !== 'undefined') {
      localStorage.setItem('hentai_age_verified', 'true');
    }
    router.push('/hentai');
  };

  const handleExit = () => {
    router.push('/');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#04040a]">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-red-900/20 blur-[120px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] rounded-full bg-red-700/10 blur-[80px]" />
      </div>
      <div className="relative z-10 max-w-lg w-full mx-4 flex flex-col items-center text-center animate-fade-up">
        <div className="flex items-center gap-2 mb-10 opacity-60">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-[#7c3aed] to-[#ec4899] flex items-center justify-center text-white">
            <Tv size={14} />
          </div>
          <span className="text-sm font-bold text-white/60 tracking-wide">Aniworld</span>
        </div>
        <div className="w-20 h-20 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center mb-6" style={{ boxShadow: '0 0 40px rgba(239,68,68,0.2)' }}>
          <AlertTriangle size={36} className="text-red-400" />
        </div>
        <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-full px-4 py-1.5 mb-6">
          <ShieldAlert size={14} className="text-red-400" />
          <span className="text-xs font-bold text-red-300 tracking-widest uppercase">Adults Only 18+</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-white mb-4 leading-tight">
          Age Verification<br />
          <span className="text-red-400">Required</span>
        </h1>
        <p className="text-sm text-white/50 leading-relaxed mb-2 max-w-sm">
          This section contains <strong className="text-white/70">explicit adult content (hentai)</strong>. By entering, you confirm that:
        </p>
        <ul className="text-xs text-white/40 space-y-1 mb-8 text-left max-w-xs">
          <li className="flex items-center gap-2"><span className="text-red-400">checkmark</span> You are at least <strong className="text-white/60">18 years of age</strong></li>
          <li className="flex items-center gap-2"><span className="text-red-400">checkmark</span> It is <strong className="text-white/60">legal</strong> to view adult content in your jurisdiction</li>
          <li className="flex items-center gap-2"><span className="text-red-400">checkmark</span> You are <strong className="text-white/60">not accessing</strong> this on behalf of a minor</li>
        </ul>
        <div className="flex flex-col sm:flex-row gap-3 w-full max-w-sm">
          <button
            onClick={handleEnter}
            disabled={confirmed}
            className="flex-1 py-3.5 rounded-2xl font-bold text-sm text-white transition-all duration-200 disabled:opacity-60"
            style={{ background: 'linear-gradient(135deg, #dc2626, #b91c1c)', boxShadow: '0 0 20px rgba(220,38,38,0.4)' }}
          >
            {confirmed ? 'Entering...' : 'I am 18+ Enter'}
          </button>
          <button
            onClick={handleExit}
            className="flex-1 py-3.5 rounded-2xl font-bold text-sm text-white/50 border border-white/10 hover:border-white/20 hover:text-white/70 transition-all duration-200"
          >
            Exit
          </button>
        </div>
        <p className="text-[10px] text-white/25 mt-8 max-w-xs leading-relaxed">
          Aniworld does not host or distribute any adult content. All links redirect to independent third-party websites.
        </p>
      </div>
    </div>
  );
}