import { NextRequest, NextResponse } from 'next/server';
import { JikanAPI } from '@/services/jikan';
import NodeCache from 'node-cache';

const localCache = new NodeCache({ stdTTL: 3600, checkperiod: 600 }); // 1 hour TTL

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

async function fetchCompleteCatalog(tpLang: string): Promise<any[]> {
  const cacheKey = `toonplay-catalog-${tpLang}`;
  const cached = localCache.get<any[]>(cacheKey);
  if (cached) return cached;

  try {
    const allSeries: any[] = [];
    const batchSize = 5;
    const maxPages = 30;

    for (let startPage = 1; startPage <= maxPages; startPage += batchSize) {
      const pageBatch = Array.from(
        { length: Math.min(batchSize, maxPages - startPage + 1) },
        (_, i) => startPage + i
      );

      const batchResults = await Promise.all(
        pageBatch.map(async (page) => {
          try {
            const res = await fetch(`https://animesalt.streamindia.co.in/api/${tpLang}/series?page=${page}`, {
              headers: TOONPLAY_HEADERS,
              signal: AbortSignal.timeout(10000)
            });
            if (!res.ok) return [];
            const data = await res.json();
            return data && data.success ? (data.data || []) : [];
          } catch (e) {
            return [];
          }
        })
      );

      const flatBatch = batchResults.flat();
      if (flatBatch.length === 0) {
        break;
      }

      allSeries.push(...flatBatch);

      // Early termination if any page returned empty array
      if (batchResults.some(result => result.length === 0)) {
        break;
      }
    }

    if (allSeries.length > 0) {
      localCache.set(cacheKey, allSeries);
    }
    return allSeries;
  } catch (err) {
    console.error(`Failed to fetch ToonPlay catalog for ${tpLang}:`, err);
    return [];
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const lang = searchParams.get('lang');
    const q = searchParams.get('q')?.trim() || '';
    const pageStr = searchParams.get('page') || '1';
    const page = parseInt(pageStr, 10) || 1;
    const limitParam = searchParams.get('limit');
    const limit = limitParam ? parseInt(limitParam, 10) : 24;

    const genres = searchParams.get('genres') || undefined;
    const year = searchParams.get('year') || undefined;
    const status = searchParams.get('status') || undefined;

    if (!lang) {
      return NextResponse.json({ error: 'Language is required.' }, { status: 400 });
    }

    const tpLang = getLanguagePath(lang);
    const hasFilters = genres || year || status;

    // ─── CASE 1: Query or filters are present ──────────────────────────────────────────
    if (q.length >= 2 || hasFilters) {
      const jikanPromise = JikanAPI.searchAnime(q, { genres, year, status, limit: 100 });
      
      let tpList: any[] = [];
      if (q) {
        const tpSearchUrl = `https://animesalt.streamindia.co.in/api/search?q=${encodeURIComponent(q)}`;
        const tpPromise = fetch(tpSearchUrl, { headers: TOONPLAY_HEADERS, signal: AbortSignal.timeout(8000) });
        const [jikanRes, tpRes] = await Promise.all([
          jikanPromise.catch(() => ({ data: [] })),
          tpPromise.catch(() => null)
        ]);

        const jikanList = jikanRes.data || [];
        
        if (tpRes && tpRes.ok) {
          try {
            const tpData = await tpRes.json();
            tpList = tpData.success ? (tpData.data || []) : [];
          } catch {}
        }

        if (tpList.length === 0) {
          const paginatedData = jikanList.slice((page - 1) * limit, page * limit);
          return NextResponse.json({ data: paginatedData, pagination: { has_next_page: jikanList.length > page * limit } });
        }

        const filteredTpList = tpList.filter(item => {
          const cats = (item.categories || []).map((c: any) => String(c).toLowerCase());
          return cats.includes(tpLang);
        });

        const tpMatchMap = new Map<string, any>();
        filteredTpList.forEach(item => {
          tpMatchMap.set(normalizeTitle(item.title), item);
        });

        const filtered = jikanList.filter((anime: any) => {
          const title = anime.title || '';
          const titleEng = anime.title_english || '';
          const normTitle = normalizeTitle(title);
          const normTitleEng = normalizeTitle(titleEng);

          let matchItem = null;
          for (const [tpTitle, item] of tpMatchMap.entries()) {
            if (
              tpTitle === normTitle ||
              tpTitle === normTitleEng ||
              normTitle.includes(tpTitle) ||
              normTitleEng.includes(tpTitle) ||
              tpTitle.includes(normTitle) ||
              tpTitle.includes(normTitleEng)
            ) {
              matchItem = item;
              break;
            }
          }

          if (matchItem) {
            const cats = (matchItem.categories || []).map((c: any) => String(c).toLowerCase());
            if (cats.includes('hindi')) (anime as any).is_hindi_dubbed = true;
            if (cats.includes('tamil')) (anime as any).is_tamil_dubbed = true;
            if (cats.includes('telugu')) (anime as any).is_telugu_dubbed = true;
            if (cats.includes('english')) (anime as any).is_english_dubbed = true;
            if (cats.includes('japanese')) (anime as any).is_japanese_subbed = true;
            (anime as any).mal_id = matchItem.id;
            return true;
          }
          return false;
        });

        const paginatedData = filtered.slice((page - 1) * limit, page * limit);
        return NextResponse.json({ data: paginatedData, pagination: { has_next_page: filtered.length > page * limit } });
      } else {
        const [jikanRes, tpCatalog] = await Promise.all([
          jikanPromise.catch(() => ({ data: [] })),
          fetchCompleteCatalog(tpLang)
        ]);

        const jikanList = jikanRes.data || [];

        if (tpCatalog.length === 0) {
          const paginatedData = jikanList.slice((page - 1) * limit, page * limit);
          return NextResponse.json({ data: paginatedData, pagination: { has_next_page: jikanList.length > page * limit } });
        }

        const tpMatchMap = new Map<string, any>();
        tpCatalog.forEach(item => {
          tpMatchMap.set(normalizeTitle(item.title), item);
        });

        const filtered = jikanList.filter((anime: any) => {
          const title = anime.title || '';
          const titleEng = anime.title_english || '';
          const normTitle = normalizeTitle(title);
          const normTitleEng = normalizeTitle(titleEng);

          let matchItem = null;
          for (const [tpTitle, item] of tpMatchMap.entries()) {
            if (
              tpTitle === normTitle ||
              tpTitle === normTitleEng ||
              normTitle.includes(tpTitle) ||
              normTitleEng.includes(tpTitle) ||
              tpTitle.includes(normTitle) ||
              tpTitle.includes(normTitleEng)
            ) {
              matchItem = item;
              break;
            }
          }

          if (matchItem) {
            if (tpLang === 'hindi') (anime as any).is_hindi_dubbed = true;
            if (tpLang === 'tamil') (anime as any).is_tamil_dubbed = true;
            if (tpLang === 'telugu') (anime as any).is_telugu_dubbed = true;
            if (tpLang === 'english') (anime as any).is_english_dubbed = true;
            if (tpLang === 'japanese') (anime as any).is_japanese_subbed = true;
            (anime as any).mal_id = matchItem.id;
            return true;
          }
          return false;
        });

        const paginatedData = filtered.slice((page - 1) * limit, page * limit);
        return NextResponse.json({ data: paginatedData, pagination: { has_next_page: filtered.length > page * limit } });
      }
    }

    // ─── CASE 2: No query and no filters ──────────────────────────────────────────────────
    const tpCatalogUrl = `https://animesalt.streamindia.co.in/api/${tpLang}/series?page=${page}`;
    const res = await fetch(tpCatalogUrl, { headers: TOONPLAY_HEADERS, signal: AbortSignal.timeout(10000) });
    if (!res.ok) {
      return NextResponse.json({ data: [] });
    }

    const data = await res.json();
    const shows = data.success ? (data.data || []) : [];

    const mapped = shows.map((item: any) => {
      const entry: any = {
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
      };

      if (tpLang === 'hindi') entry.is_hindi_dubbed = true;
      if (tpLang === 'tamil') entry.is_tamil_dubbed = true;
      if (tpLang === 'telugu') entry.is_telugu_dubbed = true;
      if (tpLang === 'english') entry.is_english_dubbed = true;
      if (tpLang === 'japanese') entry.is_japanese_subbed = true;

      return entry;
    });

    return NextResponse.json({ data: mapped, pagination: { has_next_page: mapped.length >= 12 } });
  } catch (error) {
    console.error('[Language Search Proxy Error]:', error);
    return NextResponse.json({ data: [] }, { status: 500 });
  }
}
