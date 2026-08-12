import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import withBundleAnalyzer from "@next/bundle-analyzer";

const withNextIntl = createNextIntlPlugin();

const nextConfig: NextConfig = {
  output: 'standalone',
  cacheComponents: true,
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cdn.myanimelist.net',
      },
      {
        protocol: 'https',
        hostname: 'img.youtube.com',
      },
      {
        protocol: 'https',
        hostname: 's4.anilist.co',
      },
      {
        protocol: 'https',
        hostname: 'artworks.thetvdb.com',
      },
    ],
    localPatterns: [
      {
        pathname: '/api/image-proxy',
      },
    ],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin',
          },
          {
            key: 'Cross-Origin-Resource-Policy',
            value: 'same-origin',
          },
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://va.vercel-scripts.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://cdn.myanimelist.net https://s4.anilist.co https://img.youtube.com https://artworks.thetvdb.com; connect-src 'self' https://cdn.myanimelist.net https://s4.anilist.co https://img.youtube.com https://artworks.thetvdb.com https://api.consumet.org wss://*; font-src 'self' data:; frame-src https://www.youtube.com https://www.youtube-nocookie.com https://player.vimeo.com https://megaplay.buzz https://vidnest.fun https://embed.animeparadise.me https://vidtube.site https://*.vidtube.site https://anibd.app https://*.anibd.app https://kaa.lt https://*.kaa.lt https://allmanga.to https://*.allmanga.to https://reanime.to https://*.reanime.to https://anime.nexus https://*.anime.nexus https://anizone.to https://*.anizone.to https://anihq.cc https://*.anihq.cc https://animotvslash.org https://*.animotvslash.org https://vidsrc.me https://vidsrc.to https://vidsrc.sbs https://*.vidsrc.me https://*.vidsrc.to https://*.vidsrc.sbs https://hstream.moe https://hentai.tv https://hentaimama.io https://hentaiocean.com https://hentaverse.com https://oppai.stream https://henvids.com https://hentaibros.net https://amateursubs.com https://hanime1.me https://rule34video.com https://sakuracircle.com https://www.underhentai.net https://hanime.tv https://muchohentai.com;",
          },
        ],
      },
      {
        source: '/sw.js',
        headers: [
          {
            key: 'Content-Type',
            value: 'application/javascript; charset=utf-8',
          },
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self'; connect-src 'self' https://cdn.myanimelist.net https://s4.anilist.co https://img.youtube.com https://artworks.thetvdb.com; img-src 'self' https://cdn.myanimelist.net https://s4.anilist.co https://img.youtube.com https://artworks.thetvdb.com data: blob:;",
          },
        ],
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: '/sitemap.xml',
        destination: '/api/sitemap',
      },
    ];
  },
};

const finalConfig = withNextIntl(nextConfig);

export default process.env.ANALYZE === "true"
  ? withBundleAnalyzer({ enabled: true })(finalConfig)
  : finalConfig;
