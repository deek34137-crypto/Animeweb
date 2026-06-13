import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
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
      fontFamily: {
        display: ['var(--font-display)', 'Outfit', 'sans-serif'],
        body: ['var(--font-body)', 'Plus Jakarta Sans', 'sans-serif'],
        mono: ['var(--font-mono)', 'JetBrains Mono', 'monospace'],
        sans: ['var(--font-body)', 'Plus Jakarta Sans', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
export default config;
