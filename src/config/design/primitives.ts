export const Primitives = {
  radius: {
    xs: 2,   // px
    sm: 4,   // px
    md: 8,   // px
    lg: 12,  // px
    xl: 16,  // px
    '2xl': 24, // px
  },
  spacing: {
    xs: 4,   // px
    sm: 8,   // px
    md: 16,  // px
    lg: 24,  // px
    xl: 32,  // px
    '2xl': 48, // px
  },
  zIndex: {
    hide: -1,
    base: 0,
    dropdown: 1000,
    sticky: 1100,
    overlay: 1200,
    modal: 1300,
    popover: 1400,
    toast: 1500,
  },
  breakpoints: {
    sm: 640,   // px
    md: 768,   // px
    lg: 1024,  // px
    xl: 1280,  // px
    '2xl': 1536, // px
  },
  duration: {
    instant: 0,
    fast: 0.12,  // seconds (120ms)
    normal: 0.18, // seconds (180ms)
    slow: 0.28,   // seconds (280ms)
  },
  opacity: {
    disabled: 0.5,
    secondary: 0.7,
    border: 0.3,
    primary: 1,
  }
} as const;

export type PrimitiveType = typeof Primitives;
