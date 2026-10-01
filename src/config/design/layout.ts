import { Primitives } from './primitives';

export const Layout = {
  container: {
    maxWidth: 1280, // px
  },
  density: {
    compact: {
      gap: Primitives.spacing.xs,
      padding: Primitives.spacing.sm,
    },
    default: {
      gap: Primitives.spacing.sm,
      padding: Primitives.spacing.md,
    },
    relaxed: {
      gap: Primitives.spacing.md,
      padding: Primitives.spacing.lg,
    },
  },
  grids: {
    anime: 'repeat(auto-fill, minmax(min(11.5rem, 100%), 1fr))',  // Cover aspect ratios
    episode: 'repeat(auto-fill, minmax(min(16rem, 100%), 1fr))',  // 16:9 Thumbnail previews
    gallery: 'repeat(auto-fill, minmax(min(20rem, 100%), 1fr))',  // Fanart screens
    staff: 'repeat(auto-fill, minmax(min(7.5rem, 100%), 1fr))',    // Square staff avatars
  }
} as const;

export type LayoutType = typeof Layout;
export type DensityName = keyof typeof Layout.density;
