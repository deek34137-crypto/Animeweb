import { create } from 'zustand';

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: 'episode' | 'reminder' | 'info';
  read: boolean;
  createdAt: string;
  link?: string;
}

interface NotificationState {
  notifications: NotificationItem[];
  addNotification: (item: Omit<NotificationItem, 'id' | 'createdAt' | 'read'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  deleteNotification: (id: string) => void;
  clearAll: () => void;
  initialize: () => void;
}

const DEFAULT_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'notif-1',
    title: 'New Episode Released',
    message: 'One Piece Episode 1138 is now streaming!',
    type: 'episode',
    read: false,
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    link: '/watch/one-piece-episode-1138',
  },
  {
    id: 'notif-2',
    title: 'Continue Watching',
    message: 'You have 15m remaining in Jujutsu Kaisen Season 2.',
    type: 'reminder',
    read: false,
    createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    link: '/watch/jujutsu-kaisen-episode-5',
  },
  {
    id: 'notif-3',
    title: 'Welcome to Aniworld!',
    message: 'Connect your MyAnimeList or AniList account in settings to sync your library.',
    type: 'info',
    read: true,
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    link: '/settings',
  }
];

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  initialize: () => {
    if (typeof window === 'undefined') return;
    const stored = localStorage.getItem('aniworld-notifications');
    if (stored) {
      try {
        set({ notifications: JSON.parse(stored) });
      } catch (e) {
        set({ notifications: DEFAULT_NOTIFICATIONS });
      }
    } else {
      set({ notifications: DEFAULT_NOTIFICATIONS });
      localStorage.setItem('aniworld-notifications', JSON.stringify(DEFAULT_NOTIFICATIONS));
    }
  },
  addNotification: (item) => {
    const newNotif: NotificationItem = {
      ...item,
      id: `notif-${Math.random().toString(36).substring(2, 9)}`,
      createdAt: new Date().toISOString(),
      read: false,
    };
    const updated = [newNotif, ...get().notifications];
    set({ notifications: updated });
    localStorage.setItem('aniworld-notifications', JSON.stringify(updated));
  },
  markAsRead: (id) => {
    const updated = get().notifications.map((n) => n.id === id ? { ...n, read: true } : n);
    set({ notifications: updated });
    localStorage.setItem('aniworld-notifications', JSON.stringify(updated));
  },
  markAllAsRead: () => {
    const updated = get().notifications.map((n) => ({ ...n, read: true }));
    set({ notifications: updated });
    localStorage.setItem('aniworld-notifications', JSON.stringify(updated));
  },
  deleteNotification: (id) => {
    const updated = get().notifications.filter((n) => n.id !== id);
    set({ notifications: updated });
    localStorage.setItem('aniworld-notifications', JSON.stringify(updated));
  },
  clearAll: () => {
    set({ notifications: [] });
    localStorage.setItem('aniworld-notifications', JSON.stringify([]));
  },
}));
