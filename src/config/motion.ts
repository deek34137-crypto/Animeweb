import { Primitives } from './design/primitives';

export const Motion = {
  duration: {
    instant: Primitives.duration.instant,
    fast: Primitives.duration.fast,
    normal: Primitives.duration.normal,
    slow: Primitives.duration.slow,
  },
  easing: {
    standard: [0.4, 0, 0.2, 1] as [number, number, number, number],
    out: [0.23, 1, 0.32, 1] as [number, number, number, number],
  },
};

