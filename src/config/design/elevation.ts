export const Elevation = {
  level0: 'shadow-none',
  level1: 'shadow-sm',                       // Base elements
  level2: 'shadow-md',                       // Hovered cards
  level3: 'shadow-lg',                       // Navigation popovers, menus
  level4: 'shadow-2xl',                      // Primary Dialogs
  floating: 'shadow-[0_4px_20px_rgba(0,0,0,0.3)]',
  glow: 'shadow-[0_0_20px_rgba(124,91,255,0.25)]',
} as const;

export type ElevationName = keyof typeof Elevation;
