import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    dir: 'ltr',
    lang: 'en',
    name: 'AnimeWorld RJ',
    short_name: 'Aniworld',
    description: 'High-performance, premium anime discovery & streaming platform.',
    start_url: '/?source=pwa',
    display: 'standalone',
    display_override: ['standalone', 'window-controls-overlay', 'minimal-ui'],
    background_color: '#0a0a0f',
    theme_color: '#7c3aed',
    categories: ['entertainment', 'video'],
    orientation: 'any',
    icons: [
      {
        src: '/logo.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any'
      },
      {
        src: '/logo.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable'
      },
      {
        src: '/app-icon.jpg',
        sizes: '192x192',
        type: 'image/jpeg',
        purpose: 'any'
      },
      {
        src: '/app-icon.jpg',
        sizes: '192x192',
        type: 'image/jpeg',
        purpose: 'maskable'
      }
    ],
    shortcuts: [
      {
        name: 'Trending Anime',
        short_name: 'Trending',
        description: 'See what is trending on Aniworld',
        url: '/discover',
        icons: [{ src: '/logo.png', sizes: '192x192' }]
      },
      {
        name: 'My Library',
        short_name: 'Library',
        description: 'View your offline watchlist and collections',
        url: '/collections',
        icons: [{ src: '/logo.png', sizes: '192x192' }]
      }
    ],
    screenshots: [
      {
        src: '/watermark.png',
        sizes: '1920x1080',
        type: 'image/png',
        form_factor: 'wide'
      },
      {
        src: '/screenshot-mobile.jpg',
        sizes: '576x1024',
        type: 'image/jpeg',
        form_factor: 'narrow'
      }
    ]
  };
}
