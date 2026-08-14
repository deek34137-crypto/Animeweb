export type BadgeTier = 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM';

export interface Badge {
  id: string;
  name: string;
  icon: string;
  tier: BadgeTier;
  description: string;
  xpAward: number;
  availableFrom?: Date;
  availableUntil?: Date;
  isHidden: boolean;
}

export const BADGES: Record<string, Badge> = {
  first_watch: {
    id: 'first_watch',
    name: 'First Step',
    icon: '🎬',
    tier: 'BRONZE',
    description: 'Watched your first anime episode!',
    xpAward: 50,
    isHidden: false,
  },
  collector_bronze: {
    id: 'collector_bronze',
    name: 'Anime Apprentice',
    icon: '📚',
    tier: 'BRONZE',
    description: 'Tracked 5 anime titles in your library.',
    xpAward: 50,
    isHidden: false,
  },
  completed_first: {
    id: 'completed_first',
    name: 'Completer',
    icon: '🏆',
    tier: 'SILVER',
    description: 'Fully completed your first anime series.',
    xpAward: 100,
    isHidden: false,
  },
  critic_silver: {
    id: 'critic_silver',
    name: 'Budding Critic',
    icon: '✍️',
    tier: 'SILVER',
    description: 'Written 3 reviews for your library.',
    xpAward: 100,
    isHidden: false,
  },
  otaku_gold: {
    id: 'otaku_gold',
    name: 'True Otaku',
    icon: '🔥',
    tier: 'GOLD',
    description: 'Completed 20 different anime series.',
    xpAward: 200,
    isHidden: false,
  },
  streak_gold: {
    id: 'streak_gold',
    name: 'Daily Devotee',
    icon: '⚡',
    tier: 'GOLD',
    description: 'Achieved a 7-day watch streak.',
    xpAward: 200,
    isHidden: false,
  },
  completionist_plat: {
    id: 'completionist_plat',
    name: 'Absolute Completionist',
    icon: '👑',
    tier: 'PLATINUM',
    description: 'Completed 50 anime series.',
    xpAward: 500,
    isHidden: false,
  },
  secret_badge: {
    id: 'secret_badge',
    name: 'Hidden Realm Wanderer',
    icon: '🔮',
    tier: 'PLATINUM',
    description: 'Discovered a secret hidden inside the details tab.',
    xpAward: 500,
    isHidden: true,
  },
};
