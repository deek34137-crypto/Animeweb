import { ImageResponse } from 'next/og';
import { AnimeApi } from '@/lib/api';

export const alt = 'Watch Anime - AnimeWorld RJ';
export const size = {
  width: 1200,
  height: 630,
};

export const contentType = 'image/png';

async function fetchAnimeInfo(id: string) {
  const isMalId = !id.startsWith('series-') && !id.startsWith('movies-');
  if (!isMalId) {
    try {
      const TOONPLAY_HEADERS = {
        'Origin': 'https://toonplay.in',
        'Referer': 'https://toonplay.in/',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      };
      const res = await fetch(`https://animesalt.streamindia.co.in/api/info?id=${id}`, {
        headers: TOONPLAY_HEADERS,
        next: { revalidate: 86400 }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.anime) {
          const tpAnime = data.anime;
          return {
            title: tpAnime.title,
            score: 8.0,
            genres: [],
            synopsis: tpAnime.description,
          };
        }
      }
    } catch (e) {
      console.error(e);
    }
    return null;
  } else {
    const animeId = parseInt(id, 10);
    if (isNaN(animeId)) return null;
    return AnimeApi.getAnimeDetail(animeId).catch(() => null);
  }
}

export default async function Image({ params }: { params: Promise<{ id: string; locale: string }> }) {
  const { id } = await params;
  const anime = await fetchAnimeInfo(id) as any;

  const mainTitle = anime ? (anime.title_english || anime.title) : 'Anime Detail';
  const score = anime?.score ? anime.score.toFixed(1) : '8.0';
  const synopsis = anime?.synopsis ? anime.synopsis.slice(0, 160) + '...' : 'Premium anime streaming & discovery platform';

  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          justifyContent: 'center',
          backgroundColor: '#05050A',
          padding: '60px',
          fontFamily: 'sans-serif',
          position: 'relative',
        }}
      >
        {/* Background glow effects */}
        <div
          style={{
            position: 'absolute',
            top: '-20%',
            right: '-10%',
            width: '600px',
            height: '600px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(124, 58, 237, 0.15) 0%, rgba(0,0,0,0) 70%)',
            display: 'flex',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: '-20%',
            left: '-10%',
            width: '500px',
            height: '500px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(236, 72, 153, 0.1) 0%, rgba(0,0,0,0) 70%)',
            display: 'flex',
          }}
        />

        {/* Site Brand Logo */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            marginBottom: '40px',
          }}
        >
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              backgroundColor: '#7c3aed',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: '12px',
              boxShadow: '0 0 20px rgba(124, 58, 237, 0.4)',
            }}
          >
            <div style={{ color: 'white', fontWeight: 'bold', fontSize: '20px' }}>A</div>
          </div>
          <span style={{ color: 'white', fontSize: '24px', fontWeight: 800, letterSpacing: '0.5px', display: 'flex' }}>
            AnimeWorld <span style={{ color: '#7c3aed', marginLeft: '6px' }}>RJ</span>
          </span>
        </div>

        {/* Anime Title */}
        <div
          style={{
            fontSize: '64px',
            fontWeight: 900,
            color: 'white',
            lineHeight: 1.1,
            marginBottom: '20px',
            maxWidth: '900px',
            display: 'flex',
            flexWrap: 'wrap',
          }}
        >
          {mainTitle}
        </div>

        {/* Stats Row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            marginBottom: '30px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              backgroundColor: 'rgba(255, 184, 0, 0.1)',
              border: '1px solid rgba(255, 184, 0, 0.25)',
              padding: '6px 12px',
              borderRadius: '10px',
            }}
          >
            <span style={{ color: '#ffb800', fontWeight: 'bold', fontSize: '20px', marginRight: '4px' }}>★</span>
            <span style={{ color: '#ffb800', fontWeight: 'bold', fontSize: '20px' }}>{score}</span>
          </div>

          <div
            style={{
              display: 'flex',
              backgroundColor: 'rgba(124, 58, 237, 0.1)',
              border: '1px solid rgba(124, 58, 237, 0.2)',
              padding: '6px 12px',
              borderRadius: '10px',
            }}
          >
            <span style={{ color: '#a78bfa', fontWeight: 'bold', fontSize: '18px' }}>Watch Free Sub & Dub</span>
          </div>
        </div>

        {/* Description / Synopsis */}
        <div
          style={{
            fontSize: '20px',
            color: '#9ca3af',
            lineHeight: 1.5,
            maxWidth: '850px',
            display: 'flex',
            marginBottom: '40px',
          }}
        >
          {synopsis}
        </div>

        {/* Footer info */}
        <div
          style={{
            fontSize: '14px',
            color: '#4b5563',
            display: 'flex',
          }}
        >
          Dynamic social preview • High-Performance Streaming
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
