import { Primitives } from './primitives';

export const Animation = {
  keyframes: {
    shimmer: {
      '0%': { backgroundPosition: '-200% 0' },
      '100%': { backgroundPosition: '200% 0' },
    },
    pulseRing: {
      '0%': { transform: 'scale(0.7)', opacity: '0.8', boxShadow: '0 0 0 0 currentColor' },
      '70%': { transform: 'scale(1.1)', opacity: '0.2', boxShadow: '0 0 0 8px transparent' },
      '100%': { transform: 'scale(0.7)', opacity: '0' },
    },
    kenburns: {
      '0%': { transform: 'scale(1)' },
      '100%': { transform: 'scale(1.06)' },
    },
  },
  durations: Primitives.duration,
} as const;

export type AnimationType = typeof Animation;
