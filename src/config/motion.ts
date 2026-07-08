export const Motion = {
  duration: {
    instant: 0,
    fast: 0.12,  // 120ms
    normal: 0.18, // 180ms
    slow: 0.25,   // 250ms
  },
  easing: {
    standard: [0.4, 0, 0.2, 1] as [number, number, number, number],
    out: [0.23, 1, 0.32, 1] as [number, number, number, number],
  },
};
