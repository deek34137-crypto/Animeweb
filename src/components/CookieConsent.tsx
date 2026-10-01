'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Cookie, Lock, X, ChevronDown, ChevronUp, Settings } from 'lucide-react';

export interface ConsentState {
  necessary: true;
  preferences: boolean;
  analytics: boolean;
  marketing: boolean;
  timestamp?: number;
}

const STORAGE_KEY = 'cookie_consent';

function readConsent(): ConsentState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ConsentState;
  } catch {
    return null;
  }
}

function saveConsent(state: Omit<ConsentState, 'necessary'>) {
  const full: ConsentState = { necessary: true, ...state, timestamp: Date.now() };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(full));
  return full;
}

export function useCookieConsent(): ConsentState | null {
  const [consent, setConsent] = useState<ConsentState | null>(null);
  useEffect(() => {
    setConsent(readConsent());
  }, []);
  return consent;
}

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [prefs, setPrefs] = useState({ preferences: false, analytics: false, marketing: false });

  const checkAndShow = useCallback(() => {
    if (!readConsent()) {
      setTimeout(() => setVisible(true), 800);
    }
  }, []);

  useEffect(() => {
    checkAndShow();

    // Allow footer "Cookie Settings" button to reopen this
    (window as any).__openCookieSettings = () => {
      setVisible(true);
      setExpanded(true);
    };

    return () => {
      delete (window as any).__openCookieSettings;
    };
  }, [checkAndShow]);

  const acceptAll = () => {
    saveConsent({ preferences: true, analytics: true, marketing: true });
    setVisible(false);
  };

  const declineAll = () => {
    saveConsent({ preferences: false, analytics: false, marketing: false });
    setVisible(false);
  };

  const savePreferences = () => {
    saveConsent(prefs);
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-label="Cookie consent"
      className="fixed bottom-0 left-0 right-0 z-[9999] p-4 sm:p-6"
      style={{ animation: 'slideUpFade 0.4s ease-out both' }}
    >
      <div className="max-w-2xl mx-auto glass-panel border border-border-default rounded-2xl shadow-2xl overflow-hidden">
        <div className="p-5">
          {/* Header */}
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#7c3aed]/10 border border-[#7c3aed]/20 flex items-center justify-center flex-shrink-0">
                <Cookie size={17} className="text-[#7c3aed]" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-text-primary">We use cookies</h2>
                <p className="text-xs text-text-muted mt-0.5">
                  We use cookies to enhance your experience and analyze site performance.
                </p>
              </div>
            </div>
            <button
              onClick={declineAll}
              className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-elevated transition-colors flex-shrink-0"
              aria-label="Decline and close"
            >
              <X size={15} />
            </button>
          </div>

          {/* Preferences panel */}
          {expanded && (
            <div className="border border-border-subtle rounded-xl overflow-hidden mb-4">
              {[
                {
                  key: 'necessary',
                  label: 'Necessary',
                  desc: 'Session tokens, theme, language, kids mode — always active.',
                  locked: true,
                  value: true,
                },
                {
                  key: 'preferences',
                  label: 'Preferences',
                  desc: 'Playback speed, autoplay, subtitle language, volume settings.',
                  locked: false,
                  value: prefs.preferences,
                },
                {
                  key: 'analytics',
                  label: 'Analytics',
                  desc: 'Anonymous performance metrics via Vercel Analytics.',
                  locked: false,
                  value: prefs.analytics,
                },
                {
                  key: 'marketing',
                  label: 'Marketing',
                  desc: 'Reserved for future use — currently none collected.',
                  locked: false,
                  value: prefs.marketing,
                },
              ].map((item) => (
                <div key={item.key} className="flex items-center justify-between gap-3 px-4 py-3 border-b border-border-subtle last:border-0">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold text-text-primary">{item.label}</span>
                      {item.locked && <Lock size={10} className="text-text-muted" />}
                    </div>
                    <p className="text-[10px] text-text-muted leading-relaxed mt-0.5">{item.desc}</p>
                  </div>
                  <label className="relative flex-shrink-0 cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={item.value}
                      disabled={item.locked}
                      onChange={(e) => {
                        if (!item.locked) {
                          setPrefs((p) => ({ ...p, [item.key]: e.target.checked }));
                        }
                      }}
                    />
                    <div className={`w-9 h-5 rounded-full transition-colors duration-200 ${item.value ? 'bg-[#7c3aed]' : 'bg-white/10'} ${item.locked ? 'opacity-60 cursor-not-allowed' : ''}`}>
                      <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform duration-200 ${item.value ? 'translate-x-4' : 'translate-x-0'}`} />
                    </div>
                  </label>
                </div>
              ))}
            </div>
          )}

          {/* Action row */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={acceptAll}
              className="flex-1 min-w-[120px] py-2.5 rounded-xl text-xs font-bold text-white transition-all duration-200"
              style={{ background: 'linear-gradient(135deg, #7c3aed, #ec4899)' }}
            >
              Accept All
            </button>
            <button
              onClick={declineAll}
              className="flex-1 min-w-[120px] py-2.5 rounded-xl text-xs font-bold text-text-secondary border border-border-subtle hover:text-text-primary hover:border-border-default transition-all duration-200"
            >
              Decline Non-Essential
            </button>
            {expanded ? (
              <button
                onClick={savePreferences}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold text-[#7c3aed] border border-[#7c3aed]/30 hover:bg-[#7c3aed]/5 transition-all duration-200"
              >
                <Settings size={12} />
                Save Preferences
              </button>
            ) : (
              <button
                onClick={() => setExpanded(true)}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold text-text-muted border border-border-subtle hover:text-text-secondary hover:border-border-default transition-all duration-200"
              >
                Manage
                <ChevronDown size={12} />
              </button>
            )}
            {expanded && (
              <button onClick={() => setExpanded(false)} className="p-2.5 rounded-xl text-text-muted hover:text-text-secondary border border-border-subtle transition-colors">
                <ChevronUp size={12} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}