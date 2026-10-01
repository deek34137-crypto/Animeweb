import { NextResponse } from 'next/server';
import { db } from '@/lib/db';


export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const collection = await db.collection.findFirst({
      where: {
        OR: [
          { id },
          { slug: id },
        ],
      },
      include: {
        entries: {
          orderBy: { sortOrder: 'asc' },
        },
        user: {
          select: {
            username: true,
            displayName: true,
          },
        },
      },
    });

    if (!collection || collection.deletedAt) {
      return new Response('Collection not found', { status: 404 });
    }

    if (collection.visibility === 'PRIVATE') {
      return new Response('Unauthorized', { status: 403 });
    }

    // Calculate collection stats
    const totalAnime = collection.entries.length;
    const scores = collection.entries.map(e => e.score).filter((s): s is number => s !== null);
    const avgScore = scores.length > 0 ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : 'N/A';
    
    // Fetch anime details from list entries for episodes sum if tracked
    const animeIds = collection.entries.map(e => e.animeId);
    const listEntries = await db.listEntry.findMany({
      where: {
        userId: collection.userId,
        animeId: { in: animeIds },
      },
      select: {
        animeEpisodes: true,
      },
    });
    const totalEpisodes = listEntries.reduce((sum, entry) => sum + (entry.animeEpisodes || 0), 0);
    const totalHours = Math.round((totalEpisodes * 24) / 60);

    const authorName = collection.user.displayName || collection.user.username;
    const title = collection.name;
    const description = collection.description || 'Custom anime collection';

    // Get up to 4 anime covers
    const covers = collection.entries.slice(0, 4).map(e => {
      const snapshot = (e.animeSnapshot as { image?: string }) || {};
      return snapshot.image || '';
    });

    // Build dynamic SVG
    const svgWidth = 1200;
    const svgHeight = 630;

    let coverImagesSvg = '';
    const startX = 640;
    const startY = 80;
    const cardWidth = 230;
    const cardHeight = 320;
    const gap = 30;

    // Render covers in a neat cascading/layered layout or clean grid
    covers.forEach((cover, idx) => {
      const xOffset = idx % 2 === 0 ? 0 : 20;
      const x = startX + (idx % 2) * (cardWidth + gap);
      const y = startY + Math.floor(idx / 2) * (cardHeight / 1.5 + gap) + xOffset;
      coverImagesSvg += `
        <g transform="translate(${x}, ${y}) rotate(${(idx % 2 === 0 ? -2 : 3) * (idx + 1)}, ${cardWidth / 2}, ${cardHeight / 2})">
          <rect x="-4" y="-4" width="${cardWidth + 8}" height="${cardHeight + 8}" rx="16" fill="#1b1b22" opacity="0.3"/>
          <clipPath id="clip-${idx}">
            <rect x="0" y="0" width="${cardWidth}" height="${cardHeight}" rx="12" />
          </clipPath>
          <image href="${cover}" width="${cardWidth}" height="${cardHeight}" preserveAspectRatio="xMidYMid slice" clip-path="url(#clip-${idx})" />
          <rect x="0" y="0" width="${cardWidth}" height="${cardHeight}" rx="12" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="1"/>
        </g>
      `;
    });

    const svg = `
      <svg width="${svgWidth}" height="${svgHeight}" viewBox="0 0 ${svgWidth} ${svgHeight}" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="bg-grad" x1="0" y1="0" x2="1200" y2="630" gradientUnits="userSpaceOnUse">
            <stop stop-color="#09090e" />
            <stop offset="0.6" stop-color="#0e0e15" />
            <stop offset="1" stop-color="#19102c" />
          </linearGradient>
          <linearGradient id="text-grad" x1="80" y1="180" x2="600" y2="180" gradientUnits="userSpaceOnUse">
            <stop stop-color="#c084fc" />
            <stop offset="0.5" stop-color="#f472b6" />
            <stop offset="1" stop-color="#fbbf24" />
          </linearGradient>
          <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="0" dy="12" stdDeviation="16" flood-color="#000" flood-opacity="0.5"/>
          </filter>
        </defs>

        <!-- Background -->
        <rect width="${svgWidth}" height="${svgHeight}" fill="url(#bg-grad)"/>
        
        <!-- Glow highlight -->
        <circle cx="1000" cy="300" r="400" fill="#7c3aed" opacity="0.15" filter="url(#shadow)" />
        <circle cx="200" cy="100" r="300" fill="#ec4899" opacity="0.08" filter="url(#shadow)" />

        <!-- Accent Top Bar -->
        <rect x="80" y="80" width="80" height="6" rx="3" fill="#c084fc" />

        <!-- Title -->
        <text x="80" y="150" fill="url(#text-grad)" font-family="'Outfit', 'Inter', system-ui, sans-serif" font-size="52" font-weight="900" letter-spacing="-1">${title.length > 25 ? title.substring(0, 22) + '...' : title}</text>
        
        <!-- Author -->
        <text x="80" y="195" fill="#9ca3af" font-family="'Inter', system-ui, sans-serif" font-size="18" font-weight="600" letter-spacing="1">CURATED BY ${authorName.toUpperCase()}</text>

        <!-- Description -->
        <text x="80" y="260" fill="#d1d5db" font-family="'Inter', system-ui, sans-serif" font-size="20" font-weight="500" width="500">
          ${description.length > 90 ? description.substring(0, 87) + '...' : description}
        </text>

        <!-- Stats Section -->
        <g transform="translate(80, 360)">
          <!-- Stat 1: Anime -->
          <g transform="translate(0, 0)">
            <rect x="0" y="0" width="120" height="90" rx="16" fill="rgba(255,255,255,0.02)" stroke="rgba(255,255,255,0.05)" stroke-width="1" />
            <text x="60" y="42" fill="#c084fc" font-family="'Outfit', system-ui, sans-serif" font-size="28" font-weight="900" text-anchor="middle">${totalAnime}</text>
            <text x="60" y="68" fill="#9ca3af" font-family="'Inter', system-ui, sans-serif" font-size="12" font-weight="700" text-anchor="middle" letter-spacing="0.5">ANIME</text>
          </g>

          <!-- Stat 2: Rating -->
          <g transform="translate(140, 0)">
            <rect x="0" y="0" width="120" height="90" rx="16" fill="rgba(255,255,255,0.02)" stroke="rgba(255,255,255,0.05)" stroke-width="1" />
            <text x="60" y="42" fill="#fbbf24" font-family="'Outfit', system-ui, sans-serif" font-size="28" font-weight="900" text-anchor="middle">${avgScore}</text>
            <text x="60" y="68" fill="#9ca3af" font-family="'Inter', system-ui, sans-serif" font-size="12" font-weight="700" text-anchor="middle" letter-spacing="0.5">AVG SCORE</text>
          </g>

          <!-- Stat 3: Hours -->
          <g transform="translate(280, 0)">
            <rect x="0" y="0" width="120" height="90" rx="16" fill="rgba(255,255,255,0.02)" stroke="rgba(255,255,255,0.05)" stroke-width="1" />
            <text x="60" y="42" fill="#f472b6" font-family="'Outfit', system-ui, sans-serif" font-size="28" font-weight="900" text-anchor="middle">${totalHours}h</text>
            <text x="60" y="68" fill="#9ca3af" font-family="'Inter', system-ui, sans-serif" font-size="12" font-weight="700" text-anchor="middle" letter-spacing="0.5">WATCH TIME</text>
          </g>
        </g>

        <!-- Brand Footer -->
        <g transform="translate(80, 520)">
          <circle cx="15" cy="15" r="15" fill="#7c3aed" />
          <polygon points="12,8 21,15 12,22" fill="#fff" />
          <text x="42" y="21" fill="#ffffff" font-family="'Outfit', system-ui, sans-serif" font-size="20" font-weight="900" letter-spacing="-0.5">AniWorld</text>
          <text x="135" y="20" fill="#6b7280" font-family="'Inter', system-ui, sans-serif" font-size="14" font-weight="500">|   Centralized Anime Space</text>
        </g>

        <!-- Poster Covers on Right -->
        ${coverImagesSvg}
      </svg>
    `;

    return new Response(svg, {
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      },
    });
  } catch (error) {
    console.error('[GET Collection Share Image Error]', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}
