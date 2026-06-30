'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Star, Sparkles, X } from 'lucide-react';

interface XPToast {
  id: string;
  xp: number;
  message: string;
}

export default function XPToastManager() {
  const [toasts, setToasts] = useState<XPToast[]>([]);
  const [levelUpData, setLevelUpData] = useState<{ level: number } | null>(null);

  useEffect(() => {
    const handleXPAwarded = (e: Event) => {
      const customEvent = e as CustomEvent<{ xp: number; message: string }>;
      const { xp, message } = customEvent.detail;
      const id = Math.random().toString(36).substring(2, 9);
      
      setToasts((prev) => [...prev, { id, xp, message }]);

      // Remove after 3.5 seconds
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 3500);
    };

    const handleLevelUp = (e: Event) => {
      const customEvent = e as CustomEvent<{ level: number }>;
      setLevelUpData({ level: customEvent.detail.level });
    };

    window.addEventListener('xp-awarded', handleXPAwarded);
    window.addEventListener('level-up', handleLevelUp);

    return () => {
      window.removeEventListener('xp-awarded', handleXPAwarded);
      window.removeEventListener('level-up', handleLevelUp);
    };
  }, []);

  return (
    <>
      {/* Floating XP Toasts */}
      <div className="fixed bottom-6 left-6 z-50 flex flex-col gap-2 pointer-events-none select-none">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 30, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: -50, scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className="flex items-center gap-3 px-4 py-3 bg-[#0A0A10]/90 border border-accent-violet/30 rounded-2xl shadow-[0_8px_32px_rgba(124,58,237,0.15)] backdrop-blur-md"
            >
              <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-accent-violet/10 border border-accent-violet/30 text-accent-violet">
                <Star size={16} className="fill-current" />
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-black text-white">+{toast.xp} XP</span>
                <span className="text-[10px] text-text-secondary">{toast.message}</span>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Level Up Confetti / Overlay Celebration */}
      <AnimatePresence>
        {levelUpData && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm">
            {/* Ambient glowing backdrops */}
            <div className="absolute w-[400px] h-[400px] rounded-full bg-accent-violet/20 blur-[120px] pointer-events-none" />
            <div className="absolute w-[300px] h-[300px] rounded-full bg-accent-gold/10 blur-[100px] pointer-events-none" />

            <motion.div
              initial={{ opacity: 0, scale: 0.7, y: 50 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="relative max-w-sm w-full mx-4 bg-surface-2 border border-border-default p-8 rounded-3xl text-center shadow-2xl overflow-hidden space-y-6"
            >
              {/* Confetti particles effect (pure CSS / dynamic tags) */}
              <div className="absolute inset-0 pointer-events-none overflow-hidden">
                {Array.from({ length: 15 }).map((_, i) => {
                  const delay = i * 0.1;
                  const left = Math.random() * 100;
                  const size = Math.random() * 8 + 4;
                  const color = ['#7c3aed', '#ec4899', '#eab308', '#06b6d4'][i % 4];
                  return (
                    <motion.div
                      key={i}
                      initial={{ y: -20, x: `${left}%`, opacity: 1, rotate: 0 }}
                      animate={{ y: 400, rotate: 360, opacity: 0 }}
                      transition={{ duration: 2.5, delay, repeat: Infinity, ease: 'linear' }}
                      className="absolute rounded-full"
                      style={{
                        width: size,
                        height: size,
                        backgroundColor: color,
                        top: 0
                      }}
                    />
                  );
                })}
              </div>

              {/* Close Button */}
              <button
                onClick={() => setLevelUpData(null)}
                className="absolute top-4 right-4 text-text-muted hover:text-white transition p-1 hover:bg-white/5 rounded-xl border border-white/5"
              >
                <X size={16} />
              </button>

              <div className="relative inline-flex items-center justify-center">
                <motion.div
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity, repeatType: 'mirror' }}
                  className="w-16 h-16 rounded-2xl bg-accent-gold/10 border border-accent-gold/30 flex items-center justify-center text-accent-gold shadow-[0_0_24px_rgba(234,179,8,0.15)]"
                >
                  <Trophy size={32} className="fill-current" />
                </motion.div>
                <Sparkles className="absolute -top-2 -right-2 text-accent-sakura animate-pulse" size={20} />
              </div>

              <div className="space-y-1">
                <p className="text-[10px] text-accent-gold font-bold uppercase tracking-widest">Player Progression</p>
                <h2 className="text-2xl font-black text-white font-display tracking-tight">LEVEL UP!</h2>
              </div>

              <div className="flex items-center justify-center gap-4 bg-surface-3 p-4 rounded-2xl border border-border-subtle">
                <div className="text-center">
                  <p className="text-[10px] text-text-muted font-semibold uppercase">Previous</p>
                  <p className="text-xl font-bold text-text-secondary">{levelUpData.level - 1}</p>
                </div>
                <div className="h-8 w-px bg-white/10" />
                <div className="text-center">
                  <p className="text-[10px] text-accent-gold font-bold uppercase">Current</p>
                  <p className="text-2xl font-black text-accent-gold">{levelUpData.level}</p>
                </div>
              </div>

              <p className="text-xs text-text-secondary leading-relaxed">
                Congratulations! You've reached level <span className="text-white font-bold">{levelUpData.level}</span>.
                Keep watching and completing titles to unlock more achievements and secret badges!
              </p>

              <button
                onClick={() => setLevelUpData(null)}
                className="w-full py-3 bg-gradient-to-r from-accent-violet to-accent-sakura text-white text-xs font-bold rounded-2xl shadow-lg hover:brightness-110 active:scale-[0.98] transition"
              >
                Awesome!
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

// Global utility helper to trigger XP and Level Up animations in client code
export function triggerXPNotification(xp: number, message: string) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('xp-awarded', { detail: { xp, message } }));
  }
}

export function triggerLevelUpNotification(level: number) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('level-up', { detail: { level } }));
  }
}
