import { NextRequest, NextResponse } from 'next/server';
import { JikanAPI } from '@/services/jikan';

const TOONPLAY_HEADERS = {
  'Origin': 'https://toonplay.in',
  'Referer': 'https://toonplay.in/',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
};

const getLanguagePath = (lang: string): string => {
  const l = lang.toLowerCase();
  if (l === 'hindi' || l === 'hin') return 'hindi';
  if (l === 'tamil' || l === 'tam') return 'tamil';
  if (l === 'telugu' || l === 'tel') return 'telugu';
  if (l === 'english' || l === 'eng') return 'english';
  if (l === 'japanese' || l === 'jpn' || l === 'sub') return 'japanese';
  return 'hindi';
};

const normalizeTitle = (t: string): string => {
  return t
    .toLowerCase()
    .replace(/\s*\(.*?\)\s*/g, ' ')
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
};

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const lang = searchParams.get('lang');
    const q = searchParams.get('q')?.trim();
    const pageStr = searchParams.get('page') || '1';
    const page = parseInt(pageStr, 10) || 1;

    if (!lang) {
      return NextResponse.json({ error: 'Language is required.' }, { status: 400 });
    }

    const tpLang = getLanguagePath(lang);

    // ─── CASE 1: Query is present ──────────────────────────────────────────
    // Fetch Jikan & ToonPlay Search results, then filter
    if (q && q.length >= 2) {
      const jikanPromise = JikanAPI.searchAnime(q, { limit: 24 });
      const tpSearchUrl = `https://animesalt.streamindia.co.in/api/search?q=${encodeURIComponent(q)}`;
      const tpPromise = fetch(tpSearchUrl, { headers: TOONPLAY_HEADERS, signal: AbortSignal.timeout(8000) });

      const [jikanRes, tpRes] = await Promise.all([
        jikanPromise.catch(() => ({ data: [] })),
        tpPromise.catch(() => null)
      ]);

      const jikanList = jikanRes.data || [];
      
      let tpList: any[] = [];
      if (tpRes && tpRes.ok) {
        try {
          const tpData = await tpRes.json();
          tpList = tpData.success ? (tpData.data || []) : [];
        } catch {}
      }

      if (tpList.length === 0) {
        return NextResponse.json({ data: jikanList });
      }

      const normalizedTpTitles = new Set(tpList.map(item => normalizeTitle(item.title)));
      
      const filtered = jikanList.filter((anime: any) => {
        const title = anime.title || '';
        const titleEng = anime.title_english || '';
        const normTitle = normalizeTitle(title);
        const normTitleEng = normalizeTitle(titleEng);

        for (const tpTitle of normalizedTpTitles) {
          if (
            tpTitle === normTitle ||
            tpTitle === normTitleEng ||
            normTitle.includes(tpTitle) ||
            normTitleEng.includes(tpTitle) ||
            tpTitle.includes(normTitle) ||
            tpTitle.includes(normTitleEng)
          ) {
            return true;
          }
        }
        return false;
      });

      const finalData = filtered.length > 0 ? filtered : jikanList;
      return NextResponse.json({ data: finalData });
    }

    // ─── CASE 2: No query ──────────────────────────────────────────────────
    // Browse the ToonPlay catalog directly by language
    const tpCatalogUrl = `https://animesalt.streamindia.co.in/api/${tpLang}/series?page=${page}`;
    const res = await fetch(tpCatalogUrl, { headers: TOONPLAY_HEADERS, signal: AbortSignal.timeout(10000) });
    if (!res.ok) {
      return NextResponse.json({ data: [] });
    }

    const data = await res.json();
    const shows = data.success ? (data.data || []) : [];

    const mapped = shows.map((item: any) => ({
      mal_id: item.id,
      title: item.title,
      title_english: item.title,
      synopsis: 'Direct ToonPlay catalog entry. Select to watch episodes and streams.',
      images: {
        jpg: {
          image_url: item.image || '/app-icon.jpg',
          small_image_url: item.image || '/app-icon.jpg',
          large_image_url: item.image || '/app-icon.jpg',
        },
        webp: {
          image_url: item.image || '/app-icon.jpg',
          small_image_url: item.image || '/app-icon.jpg',
          large_image_url: item.image || '/app-icon.jpg',
        }
      },
      type: item.type === 'movie' ? 'Movie' : 'TV',
      episodes: item.episodesCount || null,
      score: 8.0,
      status: 'Finished Airing',
      genres: [],
      year: item.year || null,
    }));

    return NextResponse.json({ data: mapped });
  } catch (error) {
    console.error('[Language Search Proxy Error]:', error);
    return NextResponse.json({ data: [] }, { status: 500 });
  }
}
