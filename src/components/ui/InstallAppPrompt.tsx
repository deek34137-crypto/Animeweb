'use client';

import React, { useState, useEffect } from 'react';
import { usePWA } from '@/providers/PWAProvider';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, Share2, Plus, X, Smartphone } from 'lucide-react';

export default function InstallAppPrompt() {
  const { isInstallable, installApp } = usePWA();
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Detect iOS
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(ios);

    // Detect standalone mode (already installed)
    const standalone = window.matchMedia('(display-mode: standalone)').matches || 
                       (navigator as any).standalone === true;
    setIsStandalone(standalone);

    // Show custom prompt if not already running in standalone mode AND (installable on desktop/android OR is iOS)
    // Check local storage so we don't annoy the user if they closed the prompt previously
    const dismissTime = localStorage.getItem('aniworld-pwa-dismissed');
    const isDismissed = dismissTime && (Date.now() - parseInt(dismissTime, 10) < 7 * 24 * 60 * 60 * 1000); // 7 days snooze

    if (!standalone && !isDismissed) {
      // Small delay on load before showing install prompt
      const timer = setTimeout(() => {
        if (isInstallable || ios) {
          setShowPrompt(true);
        }
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [isInstallable]);

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('aniworld-pwa-dismissed', Date.now().toString());
  };

  const handleInstallClick = async () => {
    await installApp();
    setShowPrompt(false);
  };

  if (isStandalone || !showPrompt) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 100 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 100 }}
        className="fixed bottom-6 left-6 z-[9990] w-[calc(100%-48px)] sm:w-[380px] p-5 rounded-2xl bg-bg-secondary/95 border border-border-glow shadow-2xl backdrop-blur-md"
      >
        {/* Close Button */}
        <button
          onClick={handleDismiss}
          className="absolute top-4 right-4 p-1 hover:bg-white/5 rounded-lg text-text-muted hover:text-text-primary transition"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex gap-4">
          <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-accent-primary/10 border border-accent-primary/20 shrink-0">
            <Smartphone className="w-6 h-6 text-accent-glow" />
          </div>
          <div className="flex flex-col gap-1 pr-6">
            <h4 className="font-bold text-sm text-text-primary">Install AnimeWorld</h4>
            <p className="text-xs text-text-secondary leading-relaxed">
              Add Aniworld to your home screen for quick offline catalogs, watch progress logs, and release notifications.
            </p>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-border-subtle flex items-center justify-end gap-2">
          <button
            onClick={handleDismiss}
            className="px-4 py-2 hover:bg-white/5 text-text-secondary hover:text-text-primary text-xs font-semibold rounded-lg transition"
          >
            Later
          </button>

          {isIOS ? (
            <div className="relative group">
              <button
                className="flex items-center gap-1.5 px-4 py-2 bg-gradient-accent text-white text-xs font-semibold rounded-lg shadow-lg"
              >
                How to Install
              </button>
              
              {/* Tooltip containing instructions for iOS Safari */}
              <div className="absolute bottom-full right-0 mb-3 w-64 p-4 rounded-xl bg-bg-elevated border border-border-glow shadow-2xl hidden group-hover:block z-[9999] text-xs text-text-secondary leading-relaxed animate-fade-in">
                <div className="font-bold text-text-primary mb-2 flex items-center gap-1">
                  <span>Instructions for iOS:</span>
                </div>
                <ol className="list-decimal list-inside flex flex-col gap-1.5">
                  <li>
                    Tap Safari's share button{' '}
                    <span className="inline-flex items-center p-0.5 bg-white/10 rounded">
                      <Share2 className="w-3.5 h-3.5 text-cyan-400" />
                    </span>
                  </li>
                  <li>
                    Select{' '}
                    <span className="font-semibold text-text-primary">
                      Add to Home Screen
                    </span>{' '}
                    from menu
                  </li>
                  <li>
                    Tap{' '}
                    <span className="font-semibold text-text-primary">Add</span>{' '}
                    in the top right corner
                    <span className="inline-flex items-center p-0.5 bg-white/10 rounded ml-1">
                      <Plus className="w-3.5 h-3.5 text-accent-pink" />
                    </span>
                  </li>
                </ol>
                <div className="absolute top-full right-6 w-3 h-3 bg-bg-elevated border-r border-b border-border-glow transform rotate-45 -translate-y-1.5"></div>
              </div>
            </div>
          ) : (
            isInstallable && (
              <button
                onClick={handleInstallClick}
                className="flex items-center gap-1.5 px-4 py-2 bg-gradient-accent text-white text-xs font-semibold rounded-lg shadow-lg hover:shadow-accent-glow/30 transition duration-200"
              >
                <Download className="w-3.5 h-3.5" />
                Install
              </button>
            )
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
