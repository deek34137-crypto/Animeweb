'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Wifi, WifiOff, RefreshCw, X, Download } from 'lucide-react';

// BeforeInstallPromptEvent is not yet in the standard TypeScript DOM lib.
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface PWAContextType {
  isOnline: boolean;
  isInstallable: boolean;
  installApp: () => Promise<void>;
  updateAvailable: boolean;
  triggerUpdate: () => void;
}

const PWAContext = createContext<PWAContextType | null>(null);

export const usePWA = () => {
  const context = useContext(PWAContext);
  if (!context) {
    throw new Error('usePWA must be used within a PWAProvider');
  }
  return context;
};

export default function PWAProvider({ children }: { children: React.ReactNode }) {
  const [isOnline, setIsOnline] = useState(true);
  const [showStatusToast, setShowStatusToast] = useState(false);
  const [toastType, setToastType] = useState<'online' | 'offline'>('online');
  
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // 2. Connectivity Listeners (initial state handled via lazy useState)
    const handleOnline = () => {
      setIsOnline(true);
      setToastType('online');
      setShowStatusToast(true);
      // Automatically hide "back online" toast after 3 seconds
      setTimeout(() => setShowStatusToast(false), 3000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setToastType('offline');
      setShowStatusToast(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // 3. Install Prompt (beforeinstallprompt)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // 4. Register Service Worker with update check
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js', { scope: '/' })
        .then((reg) => {
          console.log('[PWA] Service Worker registered under scope:', reg.scope);

          // Check if there is an update waiting
          if (reg.waiting) {
            setWaitingWorker(reg.waiting);
            setUpdateAvailable(true);
          }

          // Listen for new service workers installing
          reg.addEventListener('updatefound', () => {
            const newWorker = reg.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  // A new service worker is waiting to activate
                  setWaitingWorker(newWorker);
                  setUpdateAvailable(true);
                }
              });
            }
          });
        })
        .catch((err) => {
          console.error('[PWA] Service Worker registration failed:', err);
        });
    }

    // 5. Controller change reload (ensures new SW takes over instantly)
    // Guard: do NOT reload while the user is actively watching — the update will
    // apply on the next page navigation instead, so the player is never disrupted.
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) {
        refreshing = true;
        const isOnWatchPage = window.location.pathname.includes('/watch/');
        if (!isOnWatchPage) {
          window.location.reload();
        }
      }
    });

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const installApp = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`[PWA] Install choice outcome: ${outcome}`);
    setDeferredPrompt(null);
    setIsInstallable(false);
  };

  const triggerUpdate = () => {
    if (waitingWorker) {
      console.log('[PWA] Skipping waiting and activating new service worker...');
      waitingWorker.postMessage({ type: 'SKIP_WAITING' });
    }
  };

  return (
    <PWAContext.Provider value={{ isOnline, isInstallable, installApp, updateAvailable, triggerUpdate }}>
      {children}

      {/* Connectivity Banner Toasts */}
      <AnimatePresence>
        {showStatusToast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="fixed bottom-6 right-6 z-[9999] flex items-center gap-3 px-5 py-4 rounded-xl shadow-2xl border backdrop-blur-xl transition-all duration-300"
            style={{
              background: toastType === 'online' ? 'rgba(6, 182, 212, 0.15)' : 'rgba(239, 68, 68, 0.15)',
              borderColor: toastType === 'online' ? 'rgba(6, 182, 212, 0.3)' : 'rgba(239, 68, 68, 0.3)',
              color: toastType === 'online' ? '#06b6d4' : '#ef4444',
            }}
          >
            {toastType === 'online' ? (
              <>
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-cyan-500/20">
                  <Wifi className="w-4 h-4 text-cyan-400" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-text-primary">Connection Restored</h4>
                  <p className="text-xs text-text-secondary">Synced watchlist database</p>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-red-500/20">
                  <WifiOff className="w-4 h-4 text-red-400" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-text-primary">Connection Lost</h4>
                  <p className="text-xs text-text-secondary">Browsing cached content offline</p>
                </div>
                <button
                  onClick={() => setShowStatusToast(false)}
                  className="ml-4 p-1 hover:bg-white/10 rounded-lg text-text-secondary hover:text-text-primary transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* SW Update Available Banner */}
      <AnimatePresence>
        {updateAvailable && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-24 left-1/2 -translate-x-1/2 z-[9998] flex items-center justify-between gap-4 w-[90%] max-w-lg p-4 rounded-xl bg-bg-secondary/95 border border-border-glow shadow-2xl backdrop-blur-md"
          >
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-accent-primary/20">
                <RefreshCw className="w-5 h-5 text-accent-glow animate-spin-slow" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-text-primary">App Update Available</h4>
                <p className="text-xs text-text-secondary">Refresh to access latest features & optimizations</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={triggerUpdate}
                className="flex items-center gap-1.5 px-4 py-2 bg-gradient-accent text-white text-xs font-semibold rounded-lg shadow-lg hover:shadow-accent-glow/30 transition duration-200"
              >
                <Download className="w-3.5 h-3.5" />
                Update
              </button>
              <button
                onClick={() => setUpdateAvailable(false)}
                className="p-2 hover:bg-white/5 rounded-lg text-text-muted hover:text-text-primary transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </PWAContext.Provider>
  );
}
