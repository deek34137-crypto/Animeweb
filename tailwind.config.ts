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
        background: '#0F0F0F',
        foreground: '#F5F5F5',
        anime: {
          dark: '#0F0F0F',
          card: '#1A1A1A',
          cardHover: '#242424',
          orange: '#FF8C00',
          orangeHover: '#FFA500',
          border: '#2A2A2A',
          muted: '#8E8E8E',
        },
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
export default config;
