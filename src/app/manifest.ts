import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'AnimeWorld RJ',
    short_name: 'Aniworld',
    description: 'High-performance, premium anime discovery & streaming platform.',
    start_url: '/',
    display: 'standalone',
    background_color: '#0a0a0f',
    theme_color: '#7c3aed',
    icons: [
      {
        src: '/logo.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any'
      },
      {
        src: '/app-icon.jpg',
        sizes: '192x192',
        type: 'image/jpeg',
        purpose: 'any'
      }
    ],
    screenshots: [
      {
        src: '/watermark.png',
        sizes: '1920x1080',
        type: 'image/png',
        form_factor: 'wide'
      }
    ]
  };
}
