import { NextRequest, NextResponse } from 'next/server';
import { JikanAPI } from '@/services/jikan';

// Search results are always user-specific and must never be cached at the edge


export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const q = searchParams.get('q')?.trim() || '';
  const type = searchParams.get('type') || 'anime';
  const limit = Math.min(parseInt(searchParams.get('limit') || '8', 10), 50);

  const genres = searchParams.get('genres') || undefined;
  const year = searchParams.get('year') || undefined;
  const status = searchParams.get('status') || undefined;

  const hasFilters = genres || year || status;

  if (q.length < 2 && !hasFilters) {
    return NextResponse.json({ data: [] });
  }

  try {
    if (type === 'anime') {
      try {
        const res = await JikanAPI.searchAnime(q || '', { genres, year, status, limit });
        return NextResponse.json({ data: res.data || [], pagination: res.pagination });
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
