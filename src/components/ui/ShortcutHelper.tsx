'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Modal from '@/components/ui/Modal';
import { useRouter } from '@/navigation';
import { Keyboard, HelpCircle } from 'lucide-react';

interface ShortcutGroup {
  category: string;
  shortcuts: {
    keys: string[];
    description: string;
  }[];
}

const SHORTCUTS_DATA: ShortcutGroup[] = [
  {
    category: 'Navigation',
    shortcuts: [
      { keys: ['g', 'h'], description: 'Go to Dashboard' },
      { keys: ['g', 'l'], description: 'Go to My Anime Library' },
      { keys: ['g', 't'], description: 'Go to Trending Search' },
      { keys: ['g', 's'], description: 'Go to Player Settings' },
      { keys: ['g', 'a'], description: 'Go to Account Settings' },
    ]
  },
  {
    category: 'System & Search',
    shortcuts: [
      { keys: ['Ctrl', 'K'], description: 'Open Command Palette' },
      { keys: ['/'], description: 'Focus Search / Open Search Modal' },
      { keys: ['?'], description: 'Toggle Shortcuts Help' },
      { keys: ['Esc'], description: 'Close Modals / Overlays' }
    ]
  }
];

export default function ShortcutHelper() {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();
  
  // Track state for G sequence
  const [gPressed, setGPressed] = useState(false);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Ignore shortcuts when user is typing in forms
    const activeElement = document.activeElement;
    const isInput = activeElement && (
      activeElement.tagName === 'INPUT' ||
      activeElement.tagName === 'TEXTAREA' ||
      activeElement.getAttribute('contenteditable') === 'true'
    );

    if (isInput) return;

    const key = e.key.toLowerCase();

    // 1. Toggle Help Shortcuts Dialog with Shift + ?
    if (e.key === '?' || e.key === '/') {
      if (e.key === '?') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
        return;
      }
    }

    // 2. Navigation sequences starting with 'g'
    if (key === 'g') {
      setGPressed(true);
      // Reset gPressed state after 1 second if no matching key is pressed
      const timer = setTimeout(() => setGPressed(false), 1000);
      return () => clearTimeout(timer);
    }

    if (gPressed) {
      let navigated = false;
      if (key === 'h') {
        router.push('/');
        navigated = true;
      } else if (key === 'l') {
        router.push('/profile');
        navigated = true;
      } else if (key === 't') {
        router.push('/search?sort=trending');
        navigated = true;
      } else if (key === 's') {
        router.push('/profile/settings');
        navigated = true;
      } else if (key === 'a') {
        router.push('/settings');
        navigated = true;
      }

      if (navigated) {
        setGPressed(false);
        e.preventDefault();
      }
    }
  }, [gPressed, router]);

  // Bind global event listeners
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Listen to custom helper event (e.g. from floating quick menu)
  useEffect(() => {
    const handleOpenHelper = () => setIsOpen(true);
    window.addEventListener('open-shortcut-helper', handleOpenHelper);
    return () => window.removeEventListener('open-shortcut-helper', handleOpenHelper);
  }, []);

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => setIsOpen(false)}
      title="Keyboard Shortcuts Cheat Sheet"
    >
      <div className="space-y-6 py-2">
        <div className="flex items-center gap-3 bg-[#7c3aed]/5 border border-[#7c3aed]/10 p-3.5 rounded-2xl">
          <Keyboard size={24} className="text-[#7c3aed]" />
          <div>
            <p className="text-xs font-bold text-text-primary">Aniworld Keyboard Shortcuts</p>
            <p className="text-[10px] text-text-secondary">
              Use these global shortcuts to quickly navigate the app or open productivity features.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {SHORTCUTS_DATA.map((group) => (
            <div key={group.category} className="space-y-3">
              <h4 className="text-[10px] font-bold text-text-muted uppercase tracking-wider border-b border-border-subtle pb-1">
                {group.category}
              </h4>
              <div className="space-y-2.5">
                {group.shortcuts.map((shortcut) => (
                  <div key={shortcut.description} className="flex items-center justify-between">
                    <span className="text-xs font-medium text-text-secondary">
                      {shortcut.description}
                    </span>
                    <div className="flex items-center gap-1">
                      {shortcut.keys.map((k, idx) => (
                        <React.Fragment key={k}>
                          {idx > 0 && <span className="text-[10px] text-text-disabled font-bold font-mono">then</span>}
                          <kbd className="px-1.5 py-1 text-[9px] font-bold font-mono text-text-primary bg-white/[0.04] dark:bg-white/[0.02] border border-border-default rounded-lg shadow-sm">
                            {k}
                          </kbd>
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end border-t border-border-subtle pt-4 text-[10px] text-text-disabled">
          Press <span className="font-semibold text-text-muted px-1">Esc</span> to dismiss.
        </div>
      </div>
    </Modal>
  );
}
