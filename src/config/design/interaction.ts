export const Interaction = {
  timing: {
    hoverDelay: 200,          // ms
    tooltipDelay: 400,        // ms
    longPress: 500,           // ms
    doubleClickWindow: 250,   // ms
    rippleDuration: 350,      // ms
  },
  sizing: {
    focusRingWidth: 2,        // px
    touchTargetMin: 44,       // px (WCAG recommendation)
  }
} as const;

export type InteractionType = typeof Interaction;
