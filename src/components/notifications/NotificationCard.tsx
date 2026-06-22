'use client';

import React from 'react';
import { NotificationItem, useNotificationStore } from '@/store/useNotificationStore';
import { Tv, Clock, Info, Trash2, Check } from 'lucide-react';
import { useRouter } from '@/navigation';
import { useLocale } from 'next-intl';

interface NotificationCardProps {
  notification: NotificationItem;
  onClosePanel?: () => void;
}

export default function NotificationCard({ notification, onClosePanel }: NotificationCardProps) {
  const router = useRouter();
  const locale = useLocale();
  const { markAsRead, deleteNotification } = useNotificationStore();

  const handleCardClick = () => {
    if (!notification.read) {
      markAsRead(notification.id);
    }
    if (notification.link) {
      // Localize link if it doesn't already contain it
      const targetLink = notification.link.startsWith('/') ? notification.link : `/${notification.link}`;
      router.push(targetLink);
      if (onClosePanel) onClosePanel();
    }
  };

  const getIcon = () => {
    switch (notification.type) {
      case 'episode':
        return <Tv size={15} className="text-[#a855f7]" />;
      case 'reminder':
        return <Clock size={15} className="text-[#ec4899]" />;
      case 'info':
      default:
        return <Info size={15} className="text-[#3b82f6]" />;
    }
  };

  const formatTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      const diffMs = Date.now() - date.getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      return `${diffDays}d ago`;
    } catch (e) {
      return 'Recent';
    }
  };

  return (
    <div
      onClick={handleCardClick}
      className={`group relative flex items-start gap-3 p-3 rounded-xl border transition-all duration-200 cursor-pointer ${
        notification.read
          ? 'bg-transparent border-border-subtle hover:bg-white/[0.02]'
          : 'bg-white/[0.04] dark:bg-white/[0.02] border-[#7c3aed]/20 hover:bg-white/[0.06] dark:hover:bg-white/[0.03] shadow-sm'
      }`}
    >
      {/* Icon Area */}
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
        notification.read
          ? 'bg-white/[0.04] dark:bg-white/[0.02]'
          : 'bg-[#7c3aed]/10 border border-[#7c3aed]/20'
      }`}>
        {getIcon()}
      </div>

      {/* Content Area */}
      <div className="flex-1 min-w-0 pr-8">
        <div className="flex items-center gap-1.5 mb-0.5">
          <h4 className={`text-xs font-bold truncate leading-tight ${
            notification.read ? 'text-text-secondary' : 'text-text-primary'
          }`}>
            {notification.title}
          </h4>
          {!notification.read && (
            <span className="w-1.5 h-1.5 rounded-full bg-[#7c3aed] flex-shrink-0" />
          )}
        </div>
        <p className="text-[11px] text-text-secondary leading-relaxed mb-1 line-clamp-2">
          {notification.message}
        </p>
        <span className="text-[9px] text-text-disabled block">
          {formatTime(notification.createdAt)}
        </span>
      </div>

      {/* Actions (Floating on hover / always visible on small screens) */}
      <div className="absolute right-2 top-2.5 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity focus-within:opacity-100">
        {!notification.read && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              markAsRead(notification.id);
            }}
            className="p-1 rounded-lg bg-bg-elevated border border-border-subtle text-text-secondary hover:text-text-primary hover:border-[#7c3aed]/50 transition-colors"
            title="Mark as read"
          >
            <Check size={12} />
          </button>
        )}
        <button
          onClick={(e) => {
            e.stopPropagation();
            deleteNotification(notification.id);
          }}
          className="p-1 rounded-lg bg-bg-elevated border border-border-subtle text-text-secondary hover:text-red-500 hover:border-red-500/30 transition-colors"
          title="Delete notification"
        >
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  );
}
