import { NextRequest, NextResponse } from 'next/server';
import { JikanAPI } from '@/services/jikan';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const q = searchParams.get('q')?.trim();
  const type = searchParams.get('type') || 'anime';
  const limit = Math.min(parseInt(searchParams.get('limit') || '8', 10), 20);

  if (!q || q.length < 2) {
    return NextResponse.json({ data: [] });
  }

  try {
    if (type === 'anime') {
      const res = await JikanAPI.searchAnime(q, { limit });
      return NextResponse.json({ data: res.data || [] });
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
