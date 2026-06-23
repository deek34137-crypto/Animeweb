'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';

export interface CursorPack {
  id: string;
  name: string;
  category: string;
  cursor: string;
  pointer: string;
  hotspotX: number;
  hotspotY: number;
  pointerHotspotX: number;
  pointerHotspotY: number;
}

interface CursorContextType {
  cursorPacks: CursorPack[];
  activeCursor: CursorPack | null;
  previewCursor: CursorPack | null;
  isLoading: boolean;
  setCursor: (pack: CursorPack | null) => Promise<void>;
  setPreviewCursor: (pack: CursorPack | null) => void;
  resetToDefault: () => Promise<void>;
}

const CursorContext = createContext<CursorContextType | undefined>(undefined);

export function CursorProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const [cursorPacks, setCursorPacks] = useState<CursorPack[]>([]);
  const [activeCursor, setActiveCursorState] = useState<CursorPack | null>(null);
  const [previewCursor, setPreviewCursorState] = useState<CursorPack | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 1. Fetch manifest.json on mount
  useEffect(() => {
    fetch('/cursors/manifest.json')
      .then((res) => res.json())
      .then((data) => {
        setCursorPacks(data);
        
        // 2. Read initial from localStorage for instant apply
        const saved = localStorage.getItem('aniworld:cursor');
        if (saved) {
          try {
            const parsed = JSON.parse(saved) as CursorPack;
            // Verify it still exists in current packs list or just apply it
            const matched = data.find((p: CursorPack) => p.id === parsed.id);
            if (matched) {
              setActiveCursorState(matched);
            }
          } catch (e) {
            console.error('Error parsing cached cursor:', e);
          }
        }
        setIsLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load cursor manifest:', err);
        setIsLoading(false);
      });
  }, []);

  // 3. Sync from DB preferences if logged in
  useEffect(() => {
    if (status === 'authenticated' && cursorPacks.length > 0) {
      fetch('/api/user/preferences')
        .then((res) => res.json())
        .then((prefs) => {
          if (prefs.activeCursor !== undefined) {
            const dbCursor = cursorPacks.find((p) => p.id === prefs.activeCursor) || null;
            
            // Sync states
            setActiveCursorState(dbCursor);
            if (dbCursor) {
              localStorage.setItem('aniworld:cursor', JSON.stringify(dbCursor));
            } else {
              localStorage.removeItem('aniworld:cursor');
            }
          }
        })
        .catch((err) => console.error('Failed to fetch DB cursor preference:', err));
    }
  }, [status, cursorPacks]);

  // 4. Inject CSS style tag dynamically to apply the cursor globally
  useEffect(() => {
    const targetCursor = previewCursor || activeCursor;
    const styleId = 'aniworld-global-cursor-styles';
    let styleTag = document.getElementById(styleId) as HTMLStyleElement;

    if (!styleTag) {
      styleTag = document.createElement('style');
      styleTag.id = styleId;
      document.head.appendChild(styleTag);
    }

    if (targetCursor) {
      const cursorX = targetCursor.hotspotX ?? 0;
      const cursorY = targetCursor.hotspotY ?? 0;
      const pointerX = targetCursor.pointerHotspotX ?? 0;
      const pointerY = targetCursor.pointerHotspotY ?? 0;

      styleTag.innerHTML = `
        *, *::before, *::after {
          cursor: url('${targetCursor.cursor}') ${cursorX} ${cursorY}, auto !important;
        }
        a, button, [role="button"], label, select, input[type="submit"], input[type="button"], [class*="cursor-pointer"], .slick-arrow, .swiper-button {
          cursor: url('${targetCursor.pointer}') ${pointerX} ${pointerY}, pointer !important;
        }
      `;
    } else {
      styleTag.innerHTML = '';
    }

    return () => {
      // Cleanup on unmount (should not usually happen at root level)
    };
  }, [activeCursor, previewCursor]);

  const setCursor = async (pack: CursorPack | null) => {
    setActiveCursorState(pack);
    
    // Save to local cache
    if (pack) {
      localStorage.setItem('aniworld:cursor', JSON.stringify(pack));
    } else {
      localStorage.removeItem('aniworld:cursor');
    }

    // Sync with DB if authenticated
    if (status === 'authenticated') {
      try {
        await fetch('/api/user/preferences', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            activeCursor: pack ? pack.id : null,
          }),
        });
      } catch (err) {
        console.error('Failed to save cursor preference to DB:', err);
      }
    }
  };

  const setPreviewCursor = (pack: CursorPack | null) => {
    setPreviewCursorState(pack);
  };

  const resetToDefault = async () => {
    await setCursor(null);
  };

  return (
    <CursorContext.Provider
      value={{
        cursorPacks,
        activeCursor,
        previewCursor,
        isLoading,
        setCursor,
        setPreviewCursor,
        resetToDefault,
      }}
    >
      {children}
    </CursorContext.Provider>
  );
}

export function useCursor() {
  const context = useContext(CursorContext);
  if (context === undefined) {
    throw new Error('useCursor must be used within a CursorProvider');
  }
  return context;
}
