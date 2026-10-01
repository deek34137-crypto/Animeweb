export const Surface = {
  background: 'var(--color-void)',          // Void background
  panel: 'var(--color-surface-1)',           // Primary sidebar / background panels
  card: 'var(--color-surface-2)',            // Video and anime cards
  popover: 'var(--color-surface-3)',         // Hover popovers and select dropdowns
  modal: 'var(--color-surface-elevated)',    // Elevating above screen overlay
  toolbar: 'var(--color-surface-glass)',     // Blurred appbar/header
  overlay: 'rgba(13, 13, 20, 0.72)',         // Dark mask for open drawers/modals
} as const;

export type SurfaceName = keyof typeof Surface;
