'use client';

import React from 'react';

export default function CookieSettingsButton() {
  const handleCookieSettings = () => {
    if (typeof window !== 'undefined' && (window as any).__openCookieSettings) {
      (window as any).__openCookieSettings();
    }
  };

  return (
    <button
      onClick={handleCookieSettings}
      className="hover:text-accent-violet transition-colors focus-visible:text-accent-violet cursor-pointer"
    >
      Cookie Settings
    </button>
  );
}
