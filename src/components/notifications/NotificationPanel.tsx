'use client';

import React, { useEffect } from 'react';
import { useNotificationStore } from '@/store/useNotificationStore';
import NotificationCard from './NotificationCard';
import { BellOff, CheckCheck, Trash2 } from 'lucide-react';

interface NotificationPanelProps {
  onClose: () => void;
}

export default function NotificationPanel({ onClose }: NotificationPanelProps) {
  const { notifications, initialize, markAllAsRead, clearAll } = useNotificationStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div
      className="absolute right-0 mt-2 w-80 rounded-2xl glass-panel border border-border-subtle bg-bg-secondary/95 p-3.5 shadow-2xl z-50 flex flex-col gap-3"
      style={{ animation: 'fadeIn 0.12s ease-out' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border-subtle pb-2">
        <div className="flex items-center gap-1.5">
          <h3 className="text-xs font-bold text-text-primary">Notifications</h3>
          {unreadCount > 0 && (
            <span className="bg-[#7c3aed] text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
              {unreadCount} new
            </span>
          )}
        </div>

        {notifications.length > 0 && (
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="flex items-center gap-1 text-[10px] font-semibold text-text-secondary hover:text-[#7c3aed] transition-colors"
                title="Mark all as read"
              >
                <CheckCheck size={11} />
                <span>Read All</span>
              </button>
            )}
            <button
              onClick={clearAll}
              className="flex items-center gap-1 text-[10px] font-semibold text-text-secondary hover:text-red-500 transition-colors"
              title="Clear all notifications"
            >
              <Trash2 size={11} />
              <span>Clear</span>
            </button>
          </div>
        )}
      </div>

      {/* Notifications List */}
      <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto scrollbar-thin pr-1">
        {notifications.length > 0 ? (
          notifications.map((notification) => (
            <NotificationCard
              key={notification.id}
              notification={notification}
              onClosePanel={onClose}
            />
          ))
        ) : (
          <div className="py-8 flex flex-col items-center justify-center text-center gap-2 text-text-muted">
            <div className="w-10 h-10 rounded-full bg-white/[0.02] border border-border-subtle flex items-center justify-center">
              <BellOff size={16} className="text-text-disabled" />
            </div>
            <div>
              <p className="text-xs font-bold text-text-primary">All caught up!</p>
              <p className="text-[10px] text-text-secondary max-w-[200px] mx-auto mt-0.5">
                No new announcements or episode alerts right now.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
