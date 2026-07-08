import { NextRequest, NextResponse } from 'next/server';
import { JikanAPI } from '@/services/jikan';
import { AnimeData } from '@/services/metadata/types/compatibility';

const ABBREVIATIONS: Record<string, string> = {
  op: 'One Piece',
  hxh: 'Hunter x Hunter',
  jjk: 'Jujutsu Kaisen',
  aot: 'Attack on Titan',
  mha: 'My Hero Academia',
  fmab: 'Fullmetal Alchemist: Brotherhood',
  ds: 'Demon Slayer',
  sao: 'Sword Art Online',
  dbz: 'Dragon Ball Z',
  dbs: 'Dragon Ball Super',
  ngnl: 'No Game No Life',
  bleach: 'Bleach',
};

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const q = searchParams.get('q')?.trim() || '';
  const type = searchParams.get('type') || 'anime';
  const limit = Math.min(parseInt(searchParams.get('limit') || '24', 10), 50);
  const page = parseInt(searchParams.get('page') || '1', 10) || 1;

  const genres = searchParams.get('genres') || undefined;
  const year = searchParams.get('year') || undefined;
  const status = searchParams.get('status') || undefined;

  const hasFilters = genres || year || status;

  if (q.length < 2 && !hasFilters) {
    return NextResponse.json({ data: [] });
  }

  // Genre redirect detection (e.g. searching "Romance" redirects to Romance category)
  const GENRES_MAP: Record<string, number> = {
    action: 1,
    adventure: 2,
    comedy: 4,
    drama: 8,
    fantasy: 10,
    romance: 22,
    'sci-fi': 24,
    scifi: 24,
    sports: 30,
    supernatural: 37,
    suspense: 41
  };

  const lowerQ = q.toLowerCase();
  if (GENRES_MAP[lowerQ]) {
    return NextResponse.json({ redirect: `/search?genre=${GENRES_MAP[lowerQ]}` });
  }

  try {
    if (type === 'anime') {
      try {
        // Expand search query abbreviation if match found
        let searchQuery = q;
        if (ABBREVIATIONS[lowerQ]) {
          searchQuery = ABBREVIATIONS[lowerQ];
        }

        // Fetch a larger pool of results for robust re-ranking
        const searchRes = await JikanAPI.searchAnime(searchQuery, {
          genres,
          year,
          status,
          limit: Math.max(limit * 2, 40),
          page
        });

        const rawResults = searchRes.data || [];
        if (rawResults.length === 0 || !q) {
          return NextResponse.json({
            data: rawResults,
            pagination: searchRes.pagination
          });
        }

        const cleanStr = (str: string) => str.toLowerCase().replace(/[^a-z0-9]/g, '').trim();
        const cleanQuery = cleanStr(searchQuery);

        let bestMatch: any = null;
        let bestScore = -1;

        const scoredResults = rawResults.map((item) => {
          let score = 0;
          const titles = [
            cleanStr(item.title || ''),
            cleanStr(item.title_english || ''),
            cleanStr(item.title_japanese || ''),
            ...(item.title_synonyms || []).map(cleanStr)
          ];

          // 1. Exact match
          if (titles.some(t => t === cleanQuery)) {
            score += 1000;
          }
          // 2. Starts with
          else if (titles.some(t => t.startsWith(cleanQuery))) {
            score += 500;
          }
          // 3. Contains match
          else if (titles.some(t => t.includes(cleanQuery))) {
            score += 250;
          }

          // Format boosts (prioritize TV series as primary targets, then movies, then OVAs)
          if (item.type === 'TV') score += 50;
          else if (item.type === 'MOVIE') score += 30;
          else if (item.type === 'OVA') score += 20;

          // Score / popularity ties breaker
          score += (item.score || 0) * 5;
          score += Math.log10((item.popularity || 1) + 1) * 5;

          if (score > bestScore) {
            bestScore = score;
            bestMatch = item;
          }

          return { item, score };
        });

        // Structure the final list with Best Match, Relations, and Recommendations
        let finalResults: any[] = [];
        const seenIds = new Set<number>();

        if (bestMatch && bestScore >= 200) {
          // A. Mark best match
          bestMatch.searchGroup = 'best';
          finalResults.push(bestMatch);
          seenIds.add(bestMatch.mal_id);

          // B. Extract related works from relations node
          const relationsList: any[] = [];
          if (bestMatch.relations && Array.isArray(bestMatch.relations)) {
            bestMatch.relations.forEach((rel: any) => {
              if (rel.entry && Array.isArray(rel.entry)) {
                rel.entry.forEach((entry: any) => {
                  if (entry.anime && entry.mal_id && !seenIds.has(entry.mal_id)) {
                    const relatedAnime = { ...entry.anime };
                    relatedAnime.searchGroup = 'relation';
                    relatedAnime.searchRelationType = rel.relation;
                    relationsList.push(relatedAnime);
                    seenIds.add(entry.mal_id);
                  }
                });
              }
            });
          }

          // C. Extract recommendations
          const recommendationsList: any[] = [];
          if (bestMatch.recommendations && Array.isArray(bestMatch.recommendations)) {
            bestMatch.recommendations.forEach((rec: any) => {
              if (rec.mal_id && !seenIds.has(rec.mal_id)) {
                const recAnime = { ...rec };
                recAnime.searchGroup = 'recommendation';
                recommendationsList.push(recAnime);
                seenIds.add(rec.mal_id);
              }
            });
          }

          // D. Add remaining base search results (marked as general results)
          const generalResults: any[] = [];
          scoredResults
            .sort((a, b) => b.score - a.score)
            .forEach(({ item }) => {
              if (!seenIds.has(item.mal_id)) {
                item.searchGroup = 'general';
                generalResults.push(item);
                seenIds.add(item.mal_id);
              }
            });

          finalResults = [
            bestMatch,
            ...relationsList,
            ...recommendationsList,
            ...generalResults
          ];
        } else {
          finalResults = rawResults.map(item => {
            item.searchGroup = 'general';
            return item;
          });
        }

        const startIndex = (page - 1) * limit;
        const paginatedResults = finalResults.slice(startIndex, startIndex + limit);
        const hasNextPage = searchRes.pagination?.has_next_page || finalResults.length > startIndex + limit;

        return NextResponse.json({
          data: paginatedResults,
          pagination: {
            has_next_page: hasNextPage,
            last_visible_page: searchRes.pagination?.last_visible_page || 1
          }
        });
      } catch (e) {
        console.error('Jikan searchAnime error:', e);
        return NextResponse.json({ data: [], pagination: { has_next_page: false, last_visible_page: 0 } });
      }
    }

    if (type === 'character') {
      const res = await fetch(
        `https://api.jikan.moe/v4/characters?q=${encodeURIComponent(q)}&limit=${limit}`,
        { next: { revalidate: 300 } }
      );
      if (!res.ok) return NextResponse.json({ data: [] });
      const json = await res.json();
      return NextResponse.json({ data: json.data || [] });
    }

    if (type === 'studio') {
      const res = await fetch(
        `https://api.jikan.moe/v4/producers?q=${encodeURIComponent(q)}&limit=${limit}`,
        { next: { revalidate: 300 } }
      );
      if (!res.ok) return NextResponse.json({ data: [] });
      const json = await res.json();
      return NextResponse.json({ data: json.data || [] });
    }

    if (type === 'people') {
      const res = await fetch(
        `https://api.jikan.moe/v4/people?q=${encodeURIComponent(q)}&limit=${limit}`,
        { next: { revalidate: 300 } }
      );
      if (!res.ok) return NextResponse.json({ data: [] });
      const json = await res.json();
      return NextResponse.json({ data: json.data || [] });
    }

    if (type === 'genre') {
      const res = await JikanAPI.getGenres();
      const allGenres = res.data || [];
      const filtered = allGenres.filter((g) =>
        g.name.toLowerCase().includes(q.toLowerCase())
      );
      return NextResponse.json({ data: filtered });
    }

    return NextResponse.json({ data: [] });
  } catch {
    return NextResponse.json({ data: [] }, { status: 500 });
  }
}
