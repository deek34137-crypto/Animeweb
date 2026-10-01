import type { Config } from 'tailwindcss';
import { Primitives, Semantic, Typography, Layout, MotionConfigs } from './src/config/design';

const spacing = Object.fromEntries(
  Object.entries(Primitives.spacing).map(([key, val]) => [key, `${val}px`])
);

const borderRadius = {
  ...Object.fromEntries(
    Object.entries(Primitives.radius).map(([key, val]) => [key, `${val}px`])
  ),
  card: `${Semantic.radius.card}px`,
  button: `${Semantic.radius.button}px`,
  input: `${Semantic.radius.input}px`,
  popover: `${Semantic.radius.popover}px`,
  modal: `${Semantic.radius.modal}px`,
};

const screens = Object.fromEntries(
  Object.entries(Primitives.breakpoints).map(([key, val]) => [key, `${val}px`])
);

const fontFamily = Object.fromEntries(
  Object.entries(Typography.fontFamily).map(([key, val]) => [key, [...val]])
) as Record<string, string[]>;

const fontSize = Object.fromEntries(
  Object.entries(Typography.fontSize).map(([key, [size, opts]]) => [
    key,
    [size, { ...opts }],
  ])
) as Record<string, [string, { lineHeight: string }]>;

const transitionDuration = {
  instant: '0ms',
  hover: `${Primitives.duration.fast * 1000}ms`,
  standard: `${Primitives.duration.normal * 1000}ms`,
  emphasized: `${Primitives.duration.slow * 1000}ms`,
};

const transitionTimingFunction = {
  feedback: `cubic-bezier(${MotionConfigs.feedback.ease.join(', ')})`,
  navigation: `cubic-bezier(${MotionConfigs.navigation.ease.join(', ')})`,
};

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      spacing,
      borderRadius,
      screens,
      gridTemplateColumns: Layout.grids,
      transitionDuration,
      transitionTimingFunction,
      colors: {
        background: 'var(--color-void)',
        foreground: 'var(--color-text-primary)',
        void: 'var(--color-void)',
        surface: {
          1: 'var(--color-surface-1)',
          2: 'var(--color-surface-2)',
          3: 'var(--color-surface-3)',
          elevated: 'var(--color-surface-elevated)',
          glass: 'var(--color-surface-glass)',
        },
        accent: {
          violet: 'var(--color-accent-violet)',
          sakura: 'var(--color-accent-sakura)',
          gold: 'var(--color-accent-gold)',
          cyan: 'var(--color-accent-cyan)',
        },
        border: {
          subtle: 'var(--color-border-subtle)',
          default: 'var(--color-border-default)',
          emphasis: 'var(--color-border-emphasis)',
        },
        text: {
          primary: 'var(--color-text-primary)',
          secondary: 'var(--color-text-secondary)',
          muted: 'var(--color-text-muted)',
          disabled: 'var(--color-text-disabled)',
        },
        status: {
          watching: 'var(--color-watching)',
          completed: 'var(--color-completed)',
          dropped: 'var(--color-dropped)',
          paused: 'var(--color-paused)',
          planning: 'var(--color-planning)',
          rewatching: 'var(--color-rewatching)',
        },
        // Backwards compatibility mappings for smooth transition
        anime: {
          dark: 'var(--color-void)',
          card: 'var(--color-surface-2)',
          cardHover: 'var(--color-surface-3)',
          orange: 'var(--color-accent-violet)',
          orangeHover: '#6b4ae6',
          border: 'var(--color-border-subtle)',
          muted: 'var(--color-text-secondary)',
        },
      },
      fontFamily,
      fontSize,
    },
  },
  plugins: [],
};
export default config;

