import { Primitives } from './primitives';

export const Semantic = {
  radius: {
    card: Primitives.radius.xl,
    button: Primitives.radius.xl,
    input: Primitives.radius.lg,
    popover: Primitives.radius.md,
    modal: Primitives.radius['2xl'],
  },
  spacing: {
    gutter: Primitives.spacing.md,
    containerPad: Primitives.spacing.lg,
  }
} as const;

export type SemanticType = typeof Semantic;
