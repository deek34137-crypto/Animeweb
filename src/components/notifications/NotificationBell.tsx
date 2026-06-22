'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Bell } from 'lucide-react';
import { useNotificationStore } from '@/store/useNotificationStore';
import NotificationPanel from './NotificationPanel';

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { notifications, initialize } = useNotificationStore();
  const bellRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    initialize();
  }, [initialize]);

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (bellRef.current && !bellRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadCount = mounted ? notifications.filter((n) => !n.read).length : 0;

  return (
    <div ref={bellRef} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-center w-9 h-9 rounded-full bg-white/[0.04] border border-border-subtle hover:border-[#7c3aed]/50 text-text-secondary hover:text-text-primary hover:bg-white/[0.08] transition-all duration-200 relative shadow-sm"
        aria-label="Notifications"
        aria-expanded={open}
      >
        <Bell size={15} />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#7c3aed] text-[8px] font-bold text-white shadow-[0_0_6px_#9f5eff] scale-90">
            {unreadCount}
          </span>
        )}
      </button>

      {open && <NotificationPanel onClose={() => setOpen(false)} />}
    </div>
  );
}
