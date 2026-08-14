export const MotionIntent = {
  feedback: 'feedback',
  navigation: 'navigation',
  attention: 'attention',
  continuous: 'continuous',
} as const;

export type MotionIntentType = keyof typeof MotionIntent;

export const MotionConfigs = {
  feedback: {
    type: 'tween',
    duration: 0.12,  // 120ms
    ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
  },
  navigation: {
    type: 'tween',
    duration: 0.28,  // 280ms
    ease: [0.32, 0.72, 0, 1] as [number, number, number, number],
  },
  attention: {
    type: 'spring',
    damping: 20,
    stiffness: 180,
  },
  continuous: {
    type: 'tween',
    duration: 1.5,
    ease: 'linear',
  },
} as const;

export const Motion = {
  resolve(intent: MotionIntentType, prefersReducedMotion: boolean) {
    const config = MotionConfigs[intent];
    if (prefersReducedMotion) {
      return { ...config, duration: 0, delay: 0 };
    }
    return config;
  }
} as const;
